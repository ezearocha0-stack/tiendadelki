import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  bankName: z.string().min(2).optional(),
  accountNumber: z.string().min(4).optional(),
  accountType: z.string().min(2).optional(),
  holderName: z.string().min(2).optional(),
  holderId: z.string().optional(),
  instructions: z.string().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminUser(req);
    const { id } = await params;

    const account = await prisma.bankAccount.findUnique({
      where: { id },
    });

    if (!account) {
      throw new NotFoundError("Cuenta bancaria no encontrada.");
    }

    return NextResponse.json({ success: true, data: account });
  } catch (error) {
    return handleApiError(error, "AdminBankAccountItem.GET");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminUser(req);
    const { id } = await params;
    const body = await req.json();
    const validated = updateSchema.parse(body);

    const existing = await prisma.bankAccount.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundError("Cuenta bancaria no encontrada.");
    }

    const updated = await prisma.bankAccount.update({
      where: { id },
      data: {
        ...(validated.bankName ? { bankName: validated.bankName.trim() } : {}),
        ...(validated.accountNumber ? { accountNumber: validated.accountNumber.trim() } : {}),
        ...(validated.accountType ? { accountType: validated.accountType.trim() } : {}),
        ...(validated.holderName ? { holderName: validated.holderName.trim() } : {}),
        ...(validated.holderId !== undefined ? { holderId: validated.holderId.trim() } : {}),
        ...(validated.instructions !== undefined ? { instructions: validated.instructions ? validated.instructions.trim() : null } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Cuenta bancaria actualizada exitosamente.",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, "AdminBankAccountItem.PATCH");
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await requireAdminUser(req);
    const { id } = await params;

    const existing = await prisma.bankAccount.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });

    if (!existing) {
      throw new NotFoundError("Cuenta bancaria no encontrada.");
    }

    if (existing._count.orders > 0) {
      // Si tiene pedidos asociados, desactivarla en lugar de eliminarla para preservar integridad
      await prisma.bankAccount.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: "La cuenta tiene pedidos asociados; fue desactivada en lugar de eliminarse.",
      });
    }

    await prisma.bankAccount.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Cuenta bancaria eliminada exitosamente.",
    });
  } catch (error) {
    return handleApiError(error, "AdminBankAccountItem.DELETE");
  }
}
