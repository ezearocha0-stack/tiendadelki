import { OrderStatus } from "@prisma/client";
import { ValidationError } from "@/lib/errors";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDIENTE_DE_PAGO]: [
    OrderStatus.PAGO_EN_REVISION,
    OrderStatus.PAGADO,
    OrderStatus.CANCELADO,
  ],
  [OrderStatus.PAGO_EN_REVISION]: [
    OrderStatus.PAGADO,
    OrderStatus.PENDIENTE_DE_PAGO, // Rechazo de comprobante
    OrderStatus.CANCELADO,
  ],
  [OrderStatus.PAGADO]: [
    OrderStatus.PREPARANDO,
    OrderStatus.CANCELADO,
  ],
  [OrderStatus.PREPARANDO]: [
    OrderStatus.ENVIADO,
    OrderStatus.ENTREGADO,
    OrderStatus.CANCELADO,
  ],
  [OrderStatus.ENVIADO]: [
    OrderStatus.ENTREGADO,
    OrderStatus.CANCELADO,
  ],
  [OrderStatus.ENTREGADO]: [
    OrderStatus.COMPLETADO,
    OrderStatus.CANCELADO,
  ],
  [OrderStatus.COMPLETADO]: [],
  [OrderStatus.CANCELADO]: [],
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDIENTE_DE_PAGO]: "Pendiente de Pago",
  [OrderStatus.PAGO_EN_REVISION]: "Pago en Revisión",
  [OrderStatus.PAGADO]: "Pagado",
  [OrderStatus.PREPARANDO]: "En Preparación",
  [OrderStatus.ENVIADO]: "Enviado / En Camino",
  [OrderStatus.ENTREGADO]: "Entregado",
  [OrderStatus.COMPLETADO]: "Completado",
  [OrderStatus.CANCELADO]: "Cancelado",
};

export function validateStatusTransition(
  currentStatus: OrderStatus,
  targetStatus: OrderStatus
): void {
  if (currentStatus === targetStatus) {
    return;
  }

  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

  if (!allowed.includes(targetStatus)) {
    const currentLabel = STATUS_LABELS[currentStatus] || currentStatus;
    const targetLabel = STATUS_LABELS[targetStatus] || targetStatus;
    throw new ValidationError(
      `Transición no permitida: No es posible cambiar el pedido de "${currentLabel}" a "${targetLabel}".`
    );
  }
}
