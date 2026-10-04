import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createShippingMethodSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  zoneDescription: z.string().trim().max(500).optional().nullable(),
  price: z.number().min(0, "El precio no puede ser negativo"),
  freeShippingThreshold: z.number().min(0).optional().nullable(),
  estimatedDays: z.string().trim().max(50).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const methods = await prisma.shippingMethod.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    const formatted = methods.map((m) => ({
      id: m.id,
      name: m.name,
      zoneDescription: m.zoneDescription,
      price: Number(m.price),
      freeShippingThreshold: m.freeShippingThreshold ? Number(m.freeShippingThreshold) : null,
      estimatedDays: m.estimatedDays,
      sortOrder: m.sortOrder,
      isActive: m.isActive,
      createdAt: m.createdAt,
      ordersCount: m._count.orders,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    return handleApiError(error, "AdminShippingMethods.GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const body = await req.json();
    const validated = createShippingMethodSchema.parse(body);

    const created = await prisma.shippingMethod.create({
      data: {
        name: validated.name,
        zoneDescription: validated.zoneDescription || null,
        price: validated.price,
        freeShippingThreshold: validated.freeShippingThreshold || null,
        estimatedDays: validated.estimatedDays || null,
        sortOrder: validated.sortOrder,
        isActive: validated.isActive,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Método de envío creado exitosamente.",
        data: {
          ...created,
          price: Number(created.price),
          freeShippingThreshold: created.freeShippingThreshold ? Number(created.freeShippingThreshold) : null,
          ordersCount: 0,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "AdminShippingMethods.POST");
  }
}
