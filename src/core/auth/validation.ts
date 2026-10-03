import { z } from "zod";

export const RoleEnum = z.enum(["SUPER_ADMIN", "ADMIN", "STAFF", "CUSTOMER"]);

export const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export const createAdminUserSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña administrativa debe tener al menos 8 caracteres"),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "STAFF"]),
});

export const registerCustomerSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phone: z.string().min(7, "Teléfono de contacto requerido"),
  whatsapp: z.string().optional().nullable(),
});

export const updateCustomerProfileSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  phone: z.string().min(7, "Teléfono de contacto requerido"),
  whatsapp: z.string().optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Debe ingresar su contraseña actual"),
  newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export const customerAddressSchema = z.object({
  label: z.string().min(1).default("Casa"),
  recipientName: z.string().min(2, "Nombre de destinatario requerido"),
  recipientPhone: z.string().min(7, "Teléfono de destinatario requerido"),
  streetAddress: z.string().min(3, "Dirección requerida"),
  sectorOrNeighborhood: z.string().min(2, "Sector o barrio requerido"),
  city: z.string().min(2, "Ciudad requerida"),
  provinceOrState: z.string().min(2, "Provincia o estado requerido"),
  postalCode: z.string().optional().nullable(),
  deliveryNotes: z.string().optional().nullable(),
  isDefault: z.boolean().default(false),
});
