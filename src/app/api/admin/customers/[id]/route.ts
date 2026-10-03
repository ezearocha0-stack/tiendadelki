import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { ADMIN_ROLES } from "@/core/auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuthenticatedUser(req);
    if (!ADMIN_ROLES.includes(session.role)) {
      throw new ForbiddenError("Acceso denegado: se requieren permisos administrativos.");
    }

    const { id } = await params;

    const customer = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        addresses: {
          orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
        },
        orders: {
          select: {
            id: true,
            orderNumber: true,
            total: true,
            subtotal: true,
            shippingCost: true,
            status: true,
            createdAt: true,
            carrierName: true,
            trackingNumber: true,
            shippingMethod: {
              select: { name: true, price: true },
            },
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
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!customer) {
      throw new NotFoundError("Cliente no encontrado.");
    }

    const totalSpent = customer.orders.reduce((sum, o) => sum + Number(o.total), 0);
    const completedOrders = customer.orders.filter((o) => o.status === "COMPLETADO" || o.status === "ENTREGADO").length;

    return NextResponse.json({
      success: true,
      data: {
        ...customer,
        name: `${customer.firstName} ${customer.lastName}`.trim(),
        totalSpent,
        totalOrders: customer.orders.length,
        completedOrders,
      },
    });
  } catch (error) {
    return handleApiError(error, "AdminCustomerDetailAPI.GET");
  }
}
