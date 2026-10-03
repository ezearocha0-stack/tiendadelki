import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { ADMIN_ROLES } from "@/core/auth/jwt";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  try {
    const session = await requireAuthenticatedUser(req);
    const { orderNumber } = await params;

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
        shippingMethod: true,
        bankAccount: true,
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`Pedido #${orderNumber} no encontrado.`);
    }

    // CONTROL DE AUTORIZACIÓN ESTRICTO:
    // Un cliente NUNCA puede consultar pedidos de otro cliente.
    const isOwner = order.customerId === session.userId;
    const isAdmin = ADMIN_ROLES.includes(session.role);

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("Acceso denegado: este pedido pertenece a otro cliente.");
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.GetOrderDetail");
  }
}
