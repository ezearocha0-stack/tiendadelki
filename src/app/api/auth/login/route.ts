import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, UnauthorizedError, AppError } from "@/lib/errors";
import { loginSchema } from "@/core/auth/validation";
import { verifyPassword } from "@/core/auth/password";
import { signJwt, AUTH_COOKIE_OPTIONS } from "@/core/auth/jwt";
import { rateLimiter } from "@/lib/rate-limiter";

export async function POST(req: NextRequest) {
  try {
    // 1. Identificador de cliente para Rate Limiting
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateLimitKey = `login:${ip}`;

    // 2. Control de intentos abusivos (Máximo 5 intentos cada 15 min)
    const rateCheck = rateLimiter.check(rateLimitKey, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "TOO_MANY_REQUESTS",
            message: `Demasiados intentos fallidos. Intente nuevamente en ${rateCheck.retryAfterSeconds} segundos.`,
          },
        },
        {
          status: 429,
          headers: { "Retry-After": rateCheck.retryAfterSeconds.toString() },
        }
      );
    }

    // 3. Validación estricta del payload
    const body = await req.json();
    const validated = loginSchema.parse(body);

    // 4. Búsqueda de usuario
    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive || !user.passwordHash) {
      throw new UnauthorizedError("Credenciales inválidas.");
    }

    // 5. Comparación segura de contraseña
    const isMatch = await verifyPassword(validated.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Credenciales inválidas.");
    }

    // 6. Reset de intentos tras login exitoso
    rateLimiter.reset(rateLimitKey);

    // 7. Generación de Token JWT
    const token = await signJwt({
      sub: user.id,
      email: user.email!,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`,
    });

    const response = NextResponse.json({
      success: true,
      message: "Autenticación exitosa",
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
    return handleApiError(error, "AuthAPI.Login");
  }
}
