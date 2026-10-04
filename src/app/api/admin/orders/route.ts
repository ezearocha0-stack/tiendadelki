import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { OrderStatus } from "@prisma/client";
import { requireAdminUser } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as OrderStatus | null;
    const hasProof = searchParams.get("hasProof");
    const search = searchParams.get("search")?.trim();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status && Object.values(OrderStatus).includes(status)) {
      where.status = status;
    }

    if (hasProof === "true") {
      where.proofOfPaymentUrl = { not: null };
    } else if (hasProof === "false") {
      where.proofOfPaymentUrl = null;
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: "insensitive" } },
        { guestName: { contains: search, mode: "insensitive" } },
        { guestPhone: { contains: search } },
        { guestWhatsapp: { contains: search } },
        { guestEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    const [orders, total, kpis] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: true,
          shippingMethod: { select: { name: true, price: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const statusCounts = kpis.reduce((acc, curr) => {
      acc[curr.status] = curr._count._all;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        metrics: {
          totalOrders: await prisma.order.count(),
          pendingPayment: statusCounts[OrderStatus.PENDIENTE_DE_PAGO] || 0,
          underReview: statusCounts[OrderStatus.PAGO_EN_REVISION] || 0,
          paid: statusCounts[OrderStatus.PAGADO] || 0,
          preparing: statusCounts[OrderStatus.PREPARANDO] || 0,
          shipped: statusCounts[OrderStatus.ENVIADO] || 0,
          delivered: statusCounts[OrderStatus.ENTREGADO] || 0,
          completed: statusCounts[OrderStatus.COMPLETADO] || 0,
          canceled: statusCounts[OrderStatus.CANCELADO] || 0,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "AdminOrdersAPI.GET");
  }
}
