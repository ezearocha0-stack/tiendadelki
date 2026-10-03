import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { customerAddressSchema } from "@/core/auth/validation";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuthenticatedUser(req);
    const { id } = await params;
    const body = await req.json();
    const validated = customerAddressSchema.partial().parse(body);

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Dirección no encontrada.");
    }

    // CONTROL DE AUTORIZACIÓN: Solo el propietario puede modificar
    if (existing.userId !== session.userId) {
      throw new ForbiddenError("No tiene autorización para modificar esta dirección.");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validated.isDefault) {
        await tx.customerAddress.updateMany({
          where: { userId: session.userId },
          data: { isDefault: false },
        });
      }

      return tx.customerAddress.update({
        where: { id },
        data: validated,
      });
    });

    return NextResponse.json({
      success: true,
      message: "Dirección actualizada exitosamente",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.UpdateAddress");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuthenticatedUser(req);
    const { id } = await params;

    const existing = await prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError("Dirección no encontrada.");
    }

    // CONTROL DE AUTORIZACIÓN: Solo el propietario puede eliminar
    if (existing.userId !== session.userId) {
      throw new ForbiddenError("No tiene autorización para eliminar esta dirección.");
    }

    await prisma.customerAddress.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Dirección eliminada exitosamente",
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.DeleteAddress");
  }
}
