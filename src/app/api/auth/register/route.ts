import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, ConflictError } from "@/lib/errors";
import { registerCustomerSchema } from "@/core/auth/validation";
import { hashPassword } from "@/core/auth/password";
import { signJwt, AUTH_COOKIE_OPTIONS } from "@/core/auth/jwt";
import { Role } from "@prisma/client";
import { rateLimiter } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    // 0. Rate limiting para prevenir abusos y creación masiva de cuentas
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `register:${ip}`;

    const rateCheck = rateLimiter.check(rateLimitKey, 5, 60 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Demasiadas solicitudes de registro. Intente nuevamente en ${rateCheck.retryAfterSeconds} segundos.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": rateCheck.retryAfterSeconds.toString() },
        }
      );
    }

    const body = await req.json();
    const validated = registerCustomerSchema.parse(body);

    const email = validated.email.toLowerCase().trim();


    // 1. Verificar si el email ya existe
    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictError("Ya existe una cuenta registrada con este correo electrónico.");
    }

    // 2. Hash seguro de contraseña
    const passwordHash = await hashPassword(validated.password);

    // 3. Crear cliente en base de datos
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        phone: validated.phone.trim(),
        whatsapp: validated.whatsapp ? validated.whatsapp.trim() : validated.phone.trim(),
        role: Role.CUSTOMER,
        isActive: true,
      },
    });

    // 4. Asociar pedidos previos de invitado realizados con este mismo email
    await prisma.order.updateMany({
      where: {
        guestEmail: { equals: email, mode: "insensitive" },
        customerId: null,
      },
      data: {
        customerId: user.id,
      },
    });

    // 5. Emitir sesión JWT segura
    const token = await signJwt({
      sub: user.id,
      email: user.email!,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
    });

    const response = NextResponse.json({
      success: true,
      message: "Cuenta de cliente creada exitosamente",
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        whatsapp: user.whatsapp,
        role: user.role,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_OPTIONS.name,
      value: token,
      ...AUTH_COOKIE_OPTIONS.options,
    });

    return response;
  } catch (error) {
    return handleApiError(error, "AuthAPI.Register");
  }
}
