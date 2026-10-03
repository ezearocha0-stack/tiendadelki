import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: {
                  take: 1,
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                },
              },
            },
            variant: true,
          },
        },
        shippingMethod: true,
        bankAccount: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                role: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Pedido identificado por "${id}" no encontrado.`);
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return handleApiError(error, "AdminOrderDetailAPI.GET");
  }
}
