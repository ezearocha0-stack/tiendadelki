import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { OrderStatus, MovementType } from "@prisma/client";
import { validateStatusTransition, STATUS_LABELS } from "@/core/orders/order-status-machine";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const updateStatusSchema = z.object({
  targetStatus: z.nativeEnum(OrderStatus),
  notes: z.string().max(500).optional().nullable(),
  rejectionReason: z.string().max(500).optional().nullable(),
  carrierName: z.string().max(100).optional().nullable(),
  trackingNumber: z.string().max(100).optional().nullable(),
  trackingUrl: z.string().url("URL de seguimiento inválida").optional().nullable().or(z.literal("")),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = updateStatusSchema.parse(body);

    const rawAdminUserId = req.headers.get("x-user-id") || null;
    let adminUserId: string | null = null;
    if (rawAdminUserId) {
      const userExists = await prisma.user.findUnique({
        where: { id: rawAdminUserId },
        select: { id: true },
      });
      if (userExists) {
        adminUserId = userExists.id;
      }
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id }, { orderNumber: id }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Pedido identificado por "${id}" no encontrado.`);
    }

    // 1. Validar la transición permitida por la máquina de estados
    validateStatusTransition(order.status, validated.targetStatus);

    // 2. Validaciones complementarias según el estado destino
    if (validated.targetStatus === OrderStatus.ENVIADO) {
      if (!validated.carrierName?.trim() || !validated.trackingNumber?.trim()) {
        throw new ValidationError(
          "Para marcar un pedido como ENVIADO es obligatorio especificar el Transportista y el Número de Guía."
        );
      }
    }

    if (
      order.status === OrderStatus.PAGO_EN_REVISION &&
      validated.targetStatus === OrderStatus.PENDIENTE_DE_PAGO &&
      !validated.rejectionReason?.trim()
    ) {
      throw new ValidationError("Debe indicar el motivo del rechazo del comprobante.");
    }

    // 3. Ejecutar actualización atómica con registro de auditoría
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const orderUpdateData: any = {
        status: validated.targetStatus,
      };

      let historyNote = validated.notes?.trim() || "";

      if (validated.targetStatus === OrderStatus.PAGADO) {
        historyNote = historyNote || "Pago bancario confirmado y aprobado por administración.";
      } else if (validated.targetStatus === OrderStatus.PENDIENTE_DE_PAGO && validated.rejectionReason) {
        orderUpdateData.proofRejectionReason = validated.rejectionReason.trim();
        historyNote = `Comprobante rechazado: ${validated.rejectionReason.trim()}`;
      } else if (validated.targetStatus === OrderStatus.PREPARANDO) {
        historyNote = historyNote || "Pedido enviado a preparación en almacén.";
      } else if (validated.targetStatus === OrderStatus.ENVIADO) {
        orderUpdateData.carrierName = validated.carrierName!.trim();
        orderUpdateData.trackingNumber = validated.trackingNumber!.trim();
        orderUpdateData.trackingUrl = validated.trackingUrl?.trim() || null;
        orderUpdateData.shippedAt = new Date();
        historyNote =
          historyNote ||
          `Despachado vía ${validated.carrierName!.trim()}. Guía: ${validated.trackingNumber!.trim()}`;
      } else if (validated.targetStatus === OrderStatus.ENTREGADO) {
        historyNote = historyNote || "Paquete entregado con éxito al cliente.";
      } else if (validated.targetStatus === OrderStatus.COMPLETADO) {
        historyNote = historyNote || "Orden completada y archivada.";
      } else if (validated.targetStatus === OrderStatus.CANCELADO) {
        historyNote = historyNote || "Pedido cancelado por administración.";

        // Liberar inventario reservado si la orden no estaba cancelada
        if (order.status !== OrderStatus.CANCELADO && order.items && order.items.length > 0) {
          for (const item of order.items) {
            if (item.variantId) {
              const variant = await tx.productVariant.findUnique({
                where: { id: item.variantId },
              });
              if (variant) {
                const previousStock = variant.stock;
                const newStock = previousStock + item.quantity;
                await tx.productVariant.update({
                  where: { id: variant.id },
                  data: { stock: newStock },
                });
                await tx.inventoryMovement.create({
                  data: {
                    productId: item.productId,
                    variantId: item.variantId,
                    movementType: MovementType.CANCELACION_RESERVA,
                    quantity: item.quantity,
                    previousStock,
                    newStock,
                    referenceId: order.orderNumber,
                    referenceType: "ORDER",
                    notes: `Liberación automática de reserva por cancelación de pedido #${order.orderNumber}`,
                    createdBy: adminUserId,
                  },
                });
              }
            } else {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
              });
              if (product) {
                const previousStock = product.stock;
                const newStock = previousStock + item.quantity;
                await tx.product.update({
                  where: { id: product.id },
                  data: { stock: newStock },
                });
                await tx.inventoryMovement.create({
                  data: {
                    productId: product.id,
                    variantId: null,
                    movementType: MovementType.CANCELACION_RESERVA,
                    quantity: item.quantity,
                    previousStock,
                    newStock,
                    referenceId: order.orderNumber,
                    referenceType: "ORDER",
                    notes: `Liberación automática de reserva por cancelación de pedido #${order.orderNumber}`,
                    createdBy: adminUserId,
                  },
                });
              }
            }
          }
        }
      }

      const orderUpdated = await tx.order.update({
        where: { id: order.id },
        data: orderUpdateData,
        include: {
          items: true,
          shippingMethod: true,
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

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus: order.status,
          newStatus: validated.targetStatus,
          notes: historyNote,
          changedBy: adminUserId,
        },
      });

      return orderUpdated;
    });


    const targetLabel = STATUS_LABELS[validated.targetStatus] || validated.targetStatus;

    return NextResponse.json({
      success: true,
      message: `El pedido #${order.orderNumber} ha sido actualizado a "${targetLabel}".`,
      data: updatedOrder,
    });
  } catch (error) {
    return handleApiError(error, "AdminOrderStatusAPI.PATCH");
  }
}
