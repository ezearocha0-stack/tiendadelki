import { z } from "zod";

export const createBankAccountSchema = z.object({
  bankName: z.string().min(2, "Nombre del banco requerido"),
  accountNumber: z.string().min(4, "Número de cuenta requerido"),
  accountType: z.string().min(2, "Tipo de cuenta requerido (ej. Corriente, Ahorros)"),
  holderName: z.string().min(2, "Nombre del titular requerido"),
  holderId: z.string().min(5, "RNC o Cédula requerida"),
  instructions: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const uploadReceiptSchema = z.object({
  orderNumber: z.string().min(4, "Número de pedido requerido"),
  bankAccountId: z.string().optional().nullable(),
  proofOfPaymentUrl: z.string().url("URL del comprobante inválida"),
});

export const reviewPaymentSchema = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  rejectionReason: z.string().optional(),
});
