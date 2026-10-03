import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { updateCustomerProfileSchema } from "@/core/auth/validation";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError("Usuario no encontrado.");
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.GetProfile");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    const body = await req.json();
    const validated = updateCustomerProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        phone: validated.phone.trim(),
        whatsapp: validated.whatsapp ? validated.whatsapp.trim() : null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        role: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Perfil actualizado exitosamente",
      data: updatedUser,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.UpdateProfile");
  }
}
