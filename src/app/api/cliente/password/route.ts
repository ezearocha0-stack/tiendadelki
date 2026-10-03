import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { changePasswordSchema } from "@/core/auth/validation";
import { verifyPassword, hashPassword } from "@/core/auth/password";

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    const body = await req.json();
    const validated = changePasswordSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new NotFoundError("Usuario no encontrado.");
    }

    // Validar contraseña actual
    const isCurrentValid = await verifyPassword(validated.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new ValidationError("La contraseña actual es incorrecta.");
    }

    // Hashear nueva contraseña
    const newHash = await hashPassword(validated.newPassword);

    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash: newHash },
    });

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada exitosamente.",
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.ChangePassword");
  }
}
