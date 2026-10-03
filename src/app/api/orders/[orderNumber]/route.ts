import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

function maskName(name?: string | null): string {
  if (!name) return "Cliente";
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params;
    const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: cleanNumber }, { id: cleanNumber }],
      },
      include: {
        items: {
          select: {
            id: true,
            productTitle: true,
            variantTitle: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        shippingMethod: {
          select: {
            name: true,
            estimatedDays: true,
          },
        },
        statusHistory: {
          select: {
            previousStatus: true,
            newStatus: true,
            createdAt: true,
            notes: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`No se encontró ningún pedido con el número "${orderNumber}".`);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        guestName: maskName(order.guestName),
        status: order.status,
        createdAt: order.createdAt,
        total: Number(order.total),
        shippingMethodName: order.shippingMethod?.name,
        estimatedDeliveryDays: order.shippingMethod?.estimatedDays,
        carrierName: order.carrierName,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippedAt: order.shippedAt,
        itemsCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
        items: order.items.map((it) => ({
          title: it.productTitle,
          variant: it.variantTitle,
          quantity: it.quantity,
          price: Number(it.unitPrice),
        })),
        history: order.statusHistory.map((h) => ({
          status: h.newStatus,
          timestamp: h.createdAt,
          notes: h.notes,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error, "PublicOrderTracking.GET");
  }
}

