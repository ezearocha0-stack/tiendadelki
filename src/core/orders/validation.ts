import { z } from "zod";

export const OrderStatusEnum = z.enum([
  "PENDIENTE_DE_PAGO",
  "PAGO_EN_REVISION",
  "PAGADO",
  "PREPARANDO",
  "ENVIADO",
  "ENTREGADO",
  "COMPLETADO",
  "CANCELADO",
]);

export const createOrderItemInputSchema = z.object({
  productId: z.string().min(1, "ID de producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

export const createOrderSchema = z.object({
  guestName: z.string().min(2, "Nombre de cliente requerido"),
  guestPhone: z.string().min(7, "Teléfono requerido"),
  guestWhatsapp: z.string().min(7, "WhatsApp de contacto requerido"),
  guestEmail: z.string().email("Correo electrónico inválido").optional().nullable(),
  shippingMethodId: z.string().min(1, "Método de envío requerido"),
  shippingAddress: z.object({
    streetAddress: z.string().min(3, "Dirección de entrega requerida"),
    sectorOrNeighborhood: z.string().min(2, "Sector o barrio requerido"),
    city: z.string().min(2, "Ciudad requerida"),
    provinceOrState: z.string().min(2, "Provincia o estado requerido"),
    deliveryNotes: z.string().optional().nullable(),
  }),
  customerNotes: z.string().max(500).optional().nullable(),
  proofOfPaymentUrl: z.string().optional().nullable(),
  idempotencyKey: z.string().max(100).optional().nullable(),
  items: z.array(createOrderItemInputSchema).min(1, "El pedido debe contener al menos un producto"),
});

export const updateOrderStatusSchema = z.object({
  status: OrderStatusEnum,
  notes: z.string().optional().nullable(),
  carrierName: z.string().optional().nullable(),
  trackingNumber: z.string().optional().nullable(),
  trackingUrl: z.string().url().optional().nullable(),
});
