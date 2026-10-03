import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  slug: z.string().min(2, "El slug es requerido").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug debe contener solo letras minúsculas, números y guiones"),
  parentId: z.string().nullable().optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createVariantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, "El SKU de la variante es requerido"),
  barcode: z.string().optional().nullable(),
  title: z.string().min(1, "Título de la variante requerido (ej. Negro / M)"),
  attributes: z.record(z.string(), z.string()).refine(
    (val) => Object.keys(val).length > 0,
    "La variante debe contener al menos un atributo (ej. Talla, Color, Material)"
  ),
  price: z.coerce.number().positive("El precio debe ser mayor a 0").optional().nullable(),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  costPrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().nonnegative("El stock no puede ser negativo").default(0),
  minStock: z.coerce.number().int().nonnegative("El stock mínimo no puede ser negativo").default(2),
  isActive: z.boolean().default(true),
});

export const productImageSchema = z.object({
  id: z.string().optional(),
  url: z.string().min(1, "URL de imagen requerida"),
  thumbnailUrl: z.string().min(1, "Thumbnail requerido"),
  storageKey: z.string().min(1, "Clave de almacenamiento requerida"),
  altText: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().default(0),
  isPrimary: z.boolean().default(false),
  variantId: z.string().optional().nullable(),
});

export const createProductSchema = z.object({
  name: z.string().min(2, "Nombre del producto requerido"),
  slug: z.string().min(2, "Slug requerido").regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido"),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(300, "La descripción corta no debe superar 300 caracteres").optional().nullable(),
  categoryId: z.string().min(1, "Categoría requerida"),
  brandId: z.string().optional().nullable(),
  hasVariants: z.boolean().default(false),
  basePrice: z.coerce.number().positive("El precio base debe ser mayor a 0"),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  costPrice: z.coerce.number().positive().optional().nullable(),
  sku: z.string().optional().nullable(),
  stock: z.coerce.number().int().nonnegative("El stock no puede ser negativo").default(0),
  minStock: z.coerce.number().int().nonnegative("El stock mínimo no puede ser negativo").default(2),
  customAttributes: z.array(
    z.object({
      name: z.string().min(1, "Nombre del atributo requerido"),
      options: z.array(z.string().min(1)).min(1, "Debe tener al menos una opción"),
    })
  ).default([]),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(true),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("PUBLISHED"),
  seoTitle: z.string().max(150).optional().nullable(),
  seoDescription: z.string().max(250).optional().nullable(),
  images: z.array(productImageSchema).default([]),
  variants: z.array(createVariantSchema).optional().default([]),
});

export const updateProductSchema = createProductSchema.partial();

/**
 * Valida que no existan variantes con combinaciones de atributos duplicadas.
 */
export function validateNoDuplicateVariantAttributes(
  variants: Array<{ attributes: Record<string, any> | unknown }>
): void {
  const seenSignatures = new Set<string>();

  for (const variant of variants) {
    if (!variant.attributes || typeof variant.attributes !== "object" || Array.isArray(variant.attributes)) {
      continue;
    }
    const attrs = variant.attributes as Record<string, any>;
    const keys = Object.keys(attrs).sort();
    const signature = keys.map((k) => `${k.toLowerCase()}:${String(attrs[k]).trim().toLowerCase()}`).join("|");

    if (seenSignatures.has(signature)) {
      throw new Error(`Existe una variante duplicada con los atributos: ${JSON.stringify(attrs)}`);
    }
    seenSignatures.add(signature);
  }
}

/**
 * Valida que no existan SKUs repetidos dentro del conjunto de variantes.
 */
export function validateNoDuplicateSkus(variants: Array<{ sku: string }>): void {
  const seenSkus = new Set<string>();

  for (const variant of variants) {
    const cleanSku = variant.sku.trim().toUpperCase();
    if (seenSkus.has(cleanSku)) {
      throw new Error(`El SKU '${variant.sku}' está duplicado en las variantes suministradas.`);
    }
    seenSkus.add(cleanSku);
  }
}
