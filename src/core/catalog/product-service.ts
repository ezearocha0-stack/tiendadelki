import { prisma } from "@/lib/db";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/errors";
import { MovementType, ProductStatus } from "@prisma/client";
import { z } from "zod";
import {
  createProductSchema,
  updateProductSchema,
  createVariantSchema,
  productImageSchema,
  validateNoDuplicateVariantAttributes,
  validateNoDuplicateSkus,
} from "./validation";
import { ImageProcessor } from "../images/image-processor";

export interface ProductFilterParams {
  search?: string;
  categoryId?: string;
  status?: string;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
}

export class ProductService {
  /**
   * Lista productos con búsqueda, filtros avanzados, variantes e imágenes.
   */
  static async listProducts(params: ProductFilterParams = {}) {
    const page = Math.max(params.page || 1, 1);
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const whereClause: Record<string, unknown> = {};

    if (params.search) {
      const term = params.search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { slug: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
        { variants: { some: { sku: { contains: term, mode: "insensitive" } } } },
      ];
    }

    if (params.categoryId) {
      whereClause.categoryId = params.categoryId;
    }

    if (params.status) {
      whereClause.status = params.status as ProductStatus;
    }

    if (params.isFeatured !== undefined) {
      whereClause.isFeatured = params.isFeatured;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          brand: { select: { id: true, name: true, slug: true } },
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    return {
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProductByIdOrSlug(identifier: string) {
    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: identifier }, { slug: identifier }],
      },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        },
        variants: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!product) {
      throw new NotFoundError(`Producto '${identifier}' no encontrado.`);
    }

    return product;
  }

  static async createProduct(rawInput: z.input<typeof createProductSchema>, createdByUserId?: string) {
    const data = createProductSchema.parse(rawInput);

    // 1. Validar slug único
    const existingSlug = await prisma.product.findUnique({
      where: { slug: data.slug },
    });
    if (existingSlug) {
      throw new ConflictError(`El slug '${data.slug}' ya existe.`);
    }

    // 2. Validar categoría
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId },
    });
    if (!category) {
      throw new NotFoundError("La categoría seleccionada no existe.");
    }

    // 3. Validar SKU único en producto simple
    if (!data.hasVariants && data.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku },
      });
      if (existingSku) {
        throw new ConflictError(`El SKU '${data.sku}' ya está asignado a otro producto.`);
      }
    }

    // 4. Validar variantes si aplica
    if (data.hasVariants) {
      if (!data.variants || data.variants.length === 0) {
        throw new ValidationError("Si el producto tiene variantes, debe definir al menos una variante.");
      }
      validateNoDuplicateVariantAttributes(data.variants);
      validateNoDuplicateSkus(data.variants);

      // Comprobar colisión de SKUs contra base de datos
      const skus = data.variants.map((v) => v.sku);
      const existingDbVariants = await prisma.productVariant.findMany({
        where: { sku: { in: skus } },
      });
      if (existingDbVariants.length > 0) {
        throw new ConflictError(`El SKU '${existingDbVariants[0].sku}' ya existe en la base de datos.`);
      }
    }

    // 5. Tienda matriz
    const store = await prisma.store.findFirst({ where: { isDefault: true } });
    if (!store) throw new Error("No existe una tienda principal configurada.");

    // 6. Transacción Atómica
    return prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          storeId: store.id,
          categoryId: data.categoryId,
          brandId: data.brandId || null,
          name: data.name,
          slug: data.slug,
          description: data.description,
          shortDescription: data.shortDescription,
          hasVariants: data.hasVariants,
          basePrice: data.basePrice,
          compareAtPrice: data.compareAtPrice,
          costPrice: data.costPrice,
          sku: data.hasVariants ? null : data.sku,
          stock: data.hasVariants ? 0 : data.stock,
          minStock: data.minStock,
          customAttributes: data.customAttributes,
          isFeatured: data.isFeatured,
          isNew: data.isNew,
          status: data.status,
          seoTitle: data.seoTitle,
          seoDescription: data.seoDescription,
        },
      });

      // Crear Variantes si corresponde
      if (data.hasVariants && data.variants) {
        for (const v of data.variants) {
          const variant = await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: v.sku,
              barcode: v.barcode,
              title: v.title,
              attributes: v.attributes,
              price: v.price ?? data.basePrice,
              compareAtPrice: v.compareAtPrice,
              costPrice: v.costPrice,
              stock: v.stock,
              minStock: v.minStock,
              isActive: v.isActive,
            },
          });

          // Registrar movimiento inicial de inventario si hay stock
          if (v.stock > 0) {
            await tx.inventoryMovement.create({
              data: {
                productId: product.id,
                variantId: variant.id,
                movementType: MovementType.ENTRADA,
                quantity: v.stock,
                previousStock: 0,
                newStock: v.stock,
                referenceType: "PRODUCT_CREATION",
                notes: "Stock inicial al crear variante",
                createdBy: createdByUserId || null,
              },
            });
          }
        }
      } else if (!data.hasVariants && data.stock > 0) {
        // Registrar movimiento inicial para producto simple
        await tx.inventoryMovement.create({
          data: {
            productId: product.id,
            movementType: MovementType.ENTRADA,
            quantity: data.stock,
            previousStock: 0,
            newStock: data.stock,
            referenceType: "PRODUCT_CREATION",
            notes: "Stock inicial al crear producto",
            createdBy: createdByUserId || null,
          },
        });
      }

      // Asociar imágenes si vienen provistas
      if (data.images && data.images.length > 0) {
        for (let i = 0; i < data.images.length; i++) {
          const img = data.images[i];
          await tx.productImage.create({
            data: {
              productId: product.id,
              url: img.url,
              thumbnailUrl: img.thumbnailUrl,
              storageKey: img.storageKey,
              altText: img.altText || product.name,
              sortOrder: img.sortOrder ?? i,
              isPrimary: img.isPrimary ?? (i === 0),
            },
          });
        }
      }

      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          variants: { orderBy: { createdAt: "asc" } },
          images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
        },
      });
    });
  }

  static async updateProduct(id: string, rawInput: z.input<typeof updateProductSchema>) {
    const data = updateProductSchema.parse(rawInput);
    const existing = await this.getProductByIdOrSlug(id);

    if (data.slug && data.slug !== existing.slug) {
      const slugConflict = await prisma.product.findFirst({
        where: { slug: data.slug, NOT: { id } },
      });
      if (slugConflict) {
        throw new ConflictError(`El slug '${data.slug}' ya existe.`);
      }
    }

    if (data.sku && data.sku !== existing.sku) {
      const skuConflict = await prisma.product.findFirst({
        where: { sku: data.sku, NOT: { id } },
      });
      if (skuConflict) {
        throw new ConflictError(`El SKU '${data.sku}' ya está en uso.`);
      }
    }

    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.shortDescription !== undefined && { shortDescription: data.shortDescription }),
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.brandId !== undefined && { brandId: data.brandId }),
        ...(data.basePrice && { basePrice: data.basePrice }),
        ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.stock !== undefined && { stock: data.stock }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.customAttributes && { customAttributes: data.customAttributes }),
        ...(data.isFeatured !== undefined && { isFeatured: data.isFeatured }),
        ...(data.isNew !== undefined && { isNew: data.isNew }),
        ...(data.status && { status: data.status }),
        ...(data.seoTitle !== undefined && { seoTitle: data.seoTitle }),
        ...(data.seoDescription !== undefined && { seoDescription: data.seoDescription }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: { orderBy: { createdAt: "asc" } },
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      },
    });
  }

  static async deleteProduct(id: string) {
    const product = await this.getProductByIdOrSlug(id);

    // Comprobar si tiene pedidos asociados o movimientos históricos de inventario
    const [orderItemsCount, movementsCount] = await Promise.all([
      prisma.orderItem.count({
        where: { productId: id },
      }),
      prisma.inventoryMovement.count({
        where: { productId: id },
      }),
    ]);

    if (orderItemsCount > 0 || movementsCount > 0) {
      // Si tiene pedidos o movimientos históricos, archivamos en lugar de borrar físicamente
      // para preservar la integridad referencial y la trazabilidad contable
      return prisma.product.update({
        where: { id },
        data: { status: ProductStatus.ARCHIVED },
      });
    }

    // Borrado físico limpio y eliminación de archivos de imagen
    for (const img of product.images) {
      await ImageProcessor.deleteStoredImage(img.storageKey);
    }

    return prisma.product.delete({
      where: { id },
    });
  }

  // ==========================================
  // GESTIÓN DE VARIANTES INDIVIDUALES
  // ==========================================

  static async addVariant(productId: string, rawInput: z.input<typeof createVariantSchema>) {
    const variantData = createVariantSchema.parse(rawInput);
    const product = await this.getProductByIdOrSlug(productId);

    // Validar SKU único
    const skuExists = await prisma.productVariant.findUnique({
      where: { sku: variantData.sku },
    });
    if (skuExists) {
      throw new ConflictError(`El SKU '${variantData.sku}' ya está asignado a otra variante.`);
    }

    // Validar atributos no repetidos en el producto
    validateNoDuplicateVariantAttributes([...product.variants, variantData]);

    return prisma.$transaction(async (tx) => {
      // Asegurar que el producto tiene bandera hasVariants = true
      if (!product.hasVariants) {
        await tx.product.update({
          where: { id: productId },
          data: { hasVariants: true, stock: 0 },
        });
      }

      const variant = await tx.productVariant.create({
        data: {
          productId,
          sku: variantData.sku,
          barcode: variantData.barcode,
          title: variantData.title,
          attributes: variantData.attributes,
          price: variantData.price ?? product.basePrice,
          compareAtPrice: variantData.compareAtPrice,
          costPrice: variantData.costPrice,
          stock: variantData.stock,
          minStock: variantData.minStock,
          isActive: variantData.isActive,
        },
      });

      if (variantData.stock > 0) {
        await tx.inventoryMovement.create({
          data: {
            productId,
            variantId: variant.id,
            movementType: MovementType.ENTRADA,
            quantity: variantData.stock,
            previousStock: 0,
            newStock: variantData.stock,
            referenceType: "VARIANT_ADDED",
            notes: "Stock inicial para nueva variante",
          },
        });
      }

      return variant;
    });
  }

  static async updateVariant(variantId: string, data: Partial<z.infer<typeof createVariantSchema>>) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundError("Variante no encontrada.");

    if (data.sku && data.sku !== variant.sku) {
      const skuConflict = await prisma.productVariant.findUnique({
        where: { sku: data.sku },
      });
      if (skuConflict) {
        throw new ConflictError(`El SKU '${data.sku}' ya está en uso.`);
      }
    }

    return prisma.productVariant.update({
      where: { id: variantId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.sku && { sku: data.sku }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.price !== undefined && data.price !== null && { price: data.price }),
        ...(data.compareAtPrice !== undefined && { compareAtPrice: data.compareAtPrice }),
        ...(data.costPrice !== undefined && { costPrice: data.costPrice }),
        ...(data.minStock !== undefined && { minStock: data.minStock }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  static async deleteVariant(variantId: string) {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { orderItems: true },
    });
    if (!variant) throw new NotFoundError("Variante no encontrada.");

    if (variant.orderItems.length > 0) {
      // Desactivar si tiene compras históricas
      return prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false },
      });
    }

    return prisma.productVariant.delete({
      where: { id: variantId },
    });
  }

  // ==========================================
  // GESTIÓN DE IMÁGENES
  // ==========================================

  static async addImage(productId: string, rawInput: z.input<typeof productImageSchema>) {
    const imageData = productImageSchema.parse(rawInput);
    await this.getProductByIdOrSlug(productId);

    // Si se marca como primaria, desmarcar las existentes
    if (imageData.isPrimary) {
      await prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      });
    }

    return prisma.productImage.create({
      data: {
        productId,
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        storageKey: imageData.storageKey,
        altText: imageData.altText,
        sortOrder: imageData.sortOrder ?? 0,
        isPrimary: imageData.isPrimary ?? false,
        variantId: imageData.variantId || null,
      },
    });
  }

  static async setPrimaryImage(productId: string, imageId: string) {
    return prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);
  }

  static async deleteImage(imageId: string) {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundError("Imagen no encontrada.");

    // Eliminar archivo físico
    await ImageProcessor.deleteStoredImage(image.storageKey);

    return prisma.productImage.delete({
      where: { id: imageId },
    });
  }
}
