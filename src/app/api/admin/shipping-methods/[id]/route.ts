import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, AppError } from "@/lib/errors";
import { z } from "zod";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateShippingMethodSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100).optional(),
  zoneDescription: z.string().trim().max(500).optional().nullable(),
  price: z.number().min(0, "El precio no puede ser negativo").optional(),
  freeShippingThreshold: z.number().min(0).optional().nullable(),
  estimatedDays: z.string().trim().max(50).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const method = await prisma.shippingMethod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!method) {
      throw new NotFoundError(`Método de envío no encontrado.`);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: method.id,
        name: method.name,
        zoneDescription: method.zoneDescription,
        price: Number(method.price),
        freeShippingThreshold: method.freeShippingThreshold ? Number(method.freeShippingThreshold) : null,
        estimatedDays: method.estimatedDays,
        sortOrder: method.sortOrder,
        isActive: method.isActive,
        createdAt: method.createdAt,
        ordersCount: method._count.orders,
      },
    });
  } catch (error) {
    return handleApiError(error, "AdminShippingMethods.GET_BY_ID");
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateShippingMethodSchema.parse(body);

    const existing = await prisma.shippingMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundError(`Método de envío no encontrado.`);
    }

    const updated = await prisma.shippingMethod.update({
      where: { id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.zoneDescription !== undefined ? { zoneDescription: validated.zoneDescription || null } : {}),
        ...(validated.price !== undefined ? { price: validated.price } : {}),
        ...(validated.freeShippingThreshold !== undefined ? { freeShippingThreshold: validated.freeShippingThreshold || null } : {}),
        ...(validated.estimatedDays !== undefined ? { estimatedDays: validated.estimatedDays || null } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Método de envío actualizado exitosamente.",
      data: {
        ...updated,
        price: Number(updated.price),
        freeShippingThreshold: updated.freeShippingThreshold ? Number(updated.freeShippingThreshold) : null,
        ordersCount: updated._count.orders,
      },
    });
  } catch (error) {
    return handleApiError(error, "AdminShippingMethods.PATCH");
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const method = await prisma.shippingMethod.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!method) {
      throw new NotFoundError(`Método de envío no encontrado.`);
    }

    // Validación de eliminación segura: Si tiene pedidos asociados, bloquear
    if (method._count.orders > 0) {
      throw new AppError(
        `No es posible eliminar el método "${method.name}" porque tiene ${method._count.orders} pedidos asociados. En su lugar, desactívelo para retirarlo del checkout sin perder la integridad histórica.`,
        409,
        "SHIPPING_METHOD_IN_USE"
      );
    }

    await prisma.shippingMethod.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `El método de envío "${method.name}" ha sido eliminado exitosamente.`,
    });
  } catch (error) {
    return handleApiError(error, "AdminShippingMethods.DELETE");
  }
}
