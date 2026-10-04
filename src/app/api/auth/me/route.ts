import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { verifyJwt, AUTH_COOKIE_OPTIONS } from "@/core/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get(AUTH_COOKIE_OPTIONS.name)?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new UnauthorizedError("No hay sesión activa.");
    }

    const payload = await verifyJwt(token);
    if (!payload || !payload.sub) {
      throw new UnauthorizedError("Sesión inválida o expirada.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedError("Usuario no encontrado o cuenta inactiva.");
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleApiError(error, "AuthAPI.Me");
  }
}
