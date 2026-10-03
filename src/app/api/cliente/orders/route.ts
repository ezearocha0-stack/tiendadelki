import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);

    const orders = await prisma.order.findMany({
      where: { customerId: session.userId },
      include: {
        items: true,
        shippingMethod: {
          select: { name: true, price: true, estimatedDays: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.GetOrders");
  }
}
