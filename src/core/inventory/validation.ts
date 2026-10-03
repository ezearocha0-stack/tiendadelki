import { z } from "zod";

export const MovementTypeEnum = z.enum([
  "ENTRADA",
  "VENTA_FISICA",
  "VENTA_ONLINE",
  "AJUSTE",
  "DEVOLUCION",
  "RESERVA",
  "CANCELACION_RESERVA",
]);

// Regla Fundamental: Venta Física rápida (Sin pedido, sin factura, sin datos de comprador)
export const quickSaleSchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive("La cantidad a vender debe ser al menos 1"),
  notes: z.string().max(255).optional().default("Venta física en tienda"),
});

// Entrada de mercancía (proveedor / producción)
export const stockEntrySchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive("La cantidad recibida debe ser mayor a 0"),
  notes: z.string().max(255).optional().default("Entrada de mercancía / Proveedor"),
  referenceId: z.string().max(64).optional().nullable(),
});

// Ajuste manual de inventario (auditoría / merma / daño / recuento físico)
export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  type: z.enum(["DELTA", "EXACT"]).default("DELTA"),
  value: z.coerce.number().int().refine((val) => val !== 0, "El valor de ajuste no puede ser 0"),
  notes: z.string().min(3, "Debe especificar el motivo del ajuste"),
});

// Devolución de producto por cliente
export const stockReturnSchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive("La cantidad a devolver debe ser mayor a 0"),
  notes: z.string().min(3, "Debe especificar el motivo de la devolución"),
  referenceId: z.string().max(64).optional().nullable(),
});

// Reserva temporal de inventario
export const stockReservationSchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive("La cantidad a reservar debe ser mayor a 0"),
  notes: z.string().max(255).optional().default("Reserva temporal de inventario"),
  referenceId: z.string().max(64).optional().nullable(),
});

// Cancelación de reserva (liberación de stock)
export const cancelReservationSchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive("La cantidad a liberar debe ser mayor a 0"),
  notes: z.string().max(255).optional().default("Cancelación y liberación de reserva"),
  referenceId: z.string().max(64).optional().nullable(),
});

// Venta online (descuento definitivo por pedido web)
export const onlineSaleSchema = z.object({
  productId: z.string().min(1, "ID del producto requerido"),
  variantId: z.string().optional().nullable(),
  quantity: z.coerce.number().int().positive("La cantidad vendida debe ser mayor a 0"),
  orderId: z.string().min(1, "ID de pedido requerido"),
  orderNumber: z.string().optional().nullable(),
  notes: z.string().max(255).optional().default("Venta online confirmada"),
});

// Consulta de estado de inventario
export const inventoryStatusQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(["ALL", "LOW_STOCK", "OUT_OF_STOCK", "NORMAL"]).default("ALL"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

// Consulta de movimientos históricos
export const movementsQuerySchema = z.object({
  productId: z.string().optional(),
  variantId: z.string().optional(),
  movementType: MovementTypeEnum.optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});
