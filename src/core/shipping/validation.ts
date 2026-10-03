import { z } from "zod";

export const createShippingMethodSchema = z.object({
  name: z.string().min(2, "Nombre de método de envío requerido"),
  zoneDescription: z.string().optional().nullable(),
  price: z.number().nonnegative("El precio no puede ser negativo").default(0),
  freeShippingThreshold: z.number().positive().optional().nullable(),
  estimatedDays: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});
