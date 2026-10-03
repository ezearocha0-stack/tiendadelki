import { prisma } from "@/lib/db";
import { MovementType, Prisma } from "@prisma/client";
import { InsufficientStockError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  quickSaleSchema,
  stockEntrySchema,
  stockAdjustmentSchema,
  stockReturnSchema,
  stockReservationSchema,
  cancelReservationSchema,
  onlineSaleSchema,
  inventoryStatusQuerySchema,
  movementsQuerySchema,
} from "./validation";
import { z } from "zod";

export class InventoryService {
  /**
   * =========================================================================
   * 1. REGLA FUNDAMENTAL: Venta Física Rápida ("Vendido Físicamente")
   * =========================================================================
   * - Descuenta stock de forma atómica con bloqueo pesimista (FOR UPDATE).
   * - CERO creación de pedidos (orders).
   * - CERO creación de facturas fiscales.
   * - CERO registro de clientes presenciales.
   * - Traza inmutable en inventory_movements con tipo VENTA_FISICA y delta negativo.
   */
  static async quickPhysicalSale(
    rawInput: z.input<typeof quickSaleSchema>,
    createdByUserId?: string
  ) {
    const data = quickSaleSchema.parse(rawInput);

    return prisma.$transaction(
      async (tx) => {
        // Caso A: Producto con Variante
        if (data.variantId) {
          // Bloqueo pesimista para evitar sobreventa concurrente
          const lockedRows = await tx.$queryRaw<Array<{ id: string; stock: number; product_id: string }>>`
            SELECT id, stock, product_id 
            FROM "product_variants" 
            WHERE id = ${data.variantId} 
            FOR UPDATE
          `;

          if (!lockedRows || lockedRows.length === 0) {
            throw new NotFoundError("La variante física especificada no existe.");
          }

          const currentVariant = lockedRows[0];

          if (currentVariant.stock < data.quantity) {
            throw new InsufficientStockError(
              `Stock insuficiente. Disponible: ${currentVariant.stock}, Solicitado: ${data.quantity}`
            );
          }

          const previousStock = currentVariant.stock;
          const newStock = previousStock - data.quantity;

          // 1. Actualizar stock
          const updatedVariant = await tx.productVariant.update({
            where: { id: currentVariant.id },
            data: { stock: newStock },
            include: { product: { select: { id: true, name: true, slug: true } } },
          });

          // 2. Registrar movimiento inmutable
          const movement = await tx.inventoryMovement.create({
            data: {
              productId: currentVariant.product_id,
              variantId: currentVariant.id,
              movementType: MovementType.VENTA_FISICA,
              quantity: -data.quantity,
              previousStock,
              newStock,
              referenceType: "MANUAL_PHYSICAL_SALE",
              notes: data.notes || "Venta mostrador en tienda física",
              createdBy: createdByUserId || null,
            },
          });

          return {
            type: "VARIANT" as const,
            productId: updatedVariant.productId,
            productName: updatedVariant.product.name,
            variantId: updatedVariant.id,
            variantTitle: updatedVariant.title,
            sku: updatedVariant.sku,
            quantitySold: data.quantity,
            previousStock,
            newStock,
            movementId: movement.id,
          };
        }

        // Caso B: Producto Simple (sin variantes)
        const lockedProducts = await tx.$queryRaw<Array<{ id: string; stock: number; has_variants: boolean; name: string }>>`
          SELECT id, stock, has_variants, name 
          FROM "products" 
          WHERE id = ${data.productId} 
          FOR UPDATE
        `;

        if (!lockedProducts || lockedProducts.length === 0) {
          throw new NotFoundError("El producto especificado no existe.");
        }

        const currentProduct = lockedProducts[0];

        if (currentProduct.has_variants) {
          throw new ValidationError(
            "El producto tiene variantes; debe seleccionar la variante física a descontar."
          );
        }

        if (currentProduct.stock < data.quantity) {
          throw new InsufficientStockError(
            `Stock insuficiente para '${currentProduct.name}'. Disponible: ${currentProduct.stock}, Solicitado: ${data.quantity}`
          );
        }

        const previousStock = currentProduct.stock;
        const newStock = previousStock - data.quantity;

        // 1. Actualizar stock
        const updatedProduct = await tx.product.update({
          where: { id: currentProduct.id },
          data: { stock: newStock },
        });

        // 2. Registrar movimiento inmutable
        const movement = await tx.inventoryMovement.create({
          data: {
            productId: updatedProduct.id,
            movementType: MovementType.VENTA_FISICA,
            quantity: -data.quantity,
            previousStock,
            newStock,
            referenceType: "MANUAL_PHYSICAL_SALE",
            notes: data.notes || "Venta mostrador en tienda física",
            createdBy: createdByUserId || null,
          },
        });

        return {
          type: "SIMPLE_PRODUCT" as const,
          productId: updatedProduct.id,
          productName: updatedProduct.name,
          variantId: null,
          variantTitle: null,
          sku: updatedProduct.sku,
          quantitySold: data.quantity,
          previousStock,
          newStock,
          movementId: movement.id,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      }
    );
  }

  /**
   * =========================================================================
   * 2. Venta Online Confirmada (VENTA_ONLINE)
   * =========================================================================
   * - Ejecutada durante la confirmación de pedidos web.
   * - Transaccional con bloqueo pesimista para evitar colisiones de dos clientes
   *   comprando el último artículo simultáneamente.
   */
  static async recordOnlineSale(
    rawInput: z.input<typeof onlineSaleSchema>,
    createdByUserId?: string
  ) {
    const data = onlineSaleSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      if (data.variantId) {
        const lockedRows = await tx.$queryRaw<Array<{ id: string; stock: number; product_id: string }>>`
          SELECT id, stock, product_id 
          FROM "product_variants" 
          WHERE id = ${data.variantId} 
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError("La variante para la venta online no existe.");
        }

        const currentVariant = lockedRows[0];
        if (currentVariant.stock < data.quantity) {
          throw new InsufficientStockError(
            `Stock insuficiente para procesar venta online. Disponible: ${currentVariant.stock}, Solicitado: ${data.quantity}`
          );
        }

        const previousStock = currentVariant.stock;
        const newStock = previousStock - data.quantity;

        await tx.productVariant.update({
          where: { id: currentVariant.id },
          data: { stock: newStock },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: currentVariant.product_id,
            variantId: currentVariant.id,
            movementType: MovementType.VENTA_ONLINE,
            quantity: -data.quantity,
            previousStock,
            newStock,
            referenceId: data.orderId,
            referenceType: "ORDER",
            notes: data.notes || `Venta online pedido #${data.orderNumber || data.orderId}`,
            createdBy: createdByUserId || null,
          },
        });

        return { previousStock, newStock, movementId: movement.id };
      }

      // Simple
      const lockedProducts = await tx.$queryRaw<Array<{ id: string; stock: number; has_variants: boolean }>>`
        SELECT id, stock, has_variants 
        FROM "products" 
        WHERE id = ${data.productId} 
        FOR UPDATE
      `;

      if (!lockedProducts || lockedProducts.length === 0) {
        throw new NotFoundError("El producto para la venta online no existe.");
      }

      const currentProduct = lockedProducts[0];
      if (currentProduct.has_variants) {
        throw new ValidationError("El producto requiere variante para descontar en venta online.");
      }

      if (currentProduct.stock < data.quantity) {
        throw new InsufficientStockError(
          `Stock insuficiente para procesar venta online. Disponible: ${currentProduct.stock}, Solicitado: ${data.quantity}`
        );
      }

      const previousStock = currentProduct.stock;
      const newStock = previousStock - data.quantity;

      await tx.product.update({
        where: { id: currentProduct.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: currentProduct.id,
          movementType: MovementType.VENTA_ONLINE,
          quantity: -data.quantity,
          previousStock,
          newStock,
          referenceId: data.orderId,
          referenceType: "ORDER",
          notes: data.notes || `Venta online pedido #${data.orderNumber || data.orderId}`,
          createdBy: createdByUserId || null,
        },
      });

      return { previousStock, newStock, movementId: movement.id };
    });
  }

  /**
   * =========================================================================
   * 3. Entrada de Mercancía (ENTRADA)
   * =========================================================================
   * - Recepción de mercancía de proveedores o producción.
   * - Incrementa el stock disponible.
   */
  static async createStockEntry(
    rawInput: z.input<typeof stockEntrySchema>,
    createdByUserId?: string
  ) {
    const data = stockEntrySchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      if (data.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: data.variantId },
          include: { product: true },
        });

        if (!variant) throw new NotFoundError("Variante no encontrada para la entrada.");

        const previousStock = variant.stock;
        const newStock = previousStock + data.quantity;

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            movementType: MovementType.ENTRADA,
            quantity: data.quantity,
            previousStock,
            newStock,
            referenceId: data.referenceId,
            referenceType: "SUPPLIER_ENTRY",
            notes: data.notes,
            createdBy: createdByUserId || null,
          },
        });

        return {
          productName: variant.product.name,
          variantTitle: variant.title,
          previousStock,
          newStock,
          quantityAdded: data.quantity,
          movementId: movement.id,
        };
      }

      // Simple
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new NotFoundError("Producto no encontrado para la entrada.");
      if (product.hasVariants) {
        throw new ValidationError("Debe especificar la variante a la que ingresa mercancía.");
      }

      const previousStock = product.stock;
      const newStock = previousStock + data.quantity;

      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.ENTRADA,
          quantity: data.quantity,
          previousStock,
          newStock,
          referenceId: data.referenceId,
          referenceType: "SUPPLIER_ENTRY",
          notes: data.notes,
          createdBy: createdByUserId || null,
        },
      });

      return {
        productName: product.name,
        previousStock,
        newStock,
        quantityAdded: data.quantity,
        movementId: movement.id,
      };
    });
  }

  /**
   * =========================================================================
   * 4. Ajuste Manual de Inventario (AJUSTE)
   * =========================================================================
   * - Auditoría, recuento físico, daño o merma.
   * - Permite ajuste por DELTA (+/-) o fijar valor EXACTO.
   * - Valida que el stock resultante no sea negativo.
   */
  static async adjustStock(
    rawInput: z.input<typeof stockAdjustmentSchema>,
    createdByUserId?: string
  ) {
    const data = stockAdjustmentSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      if (data.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: data.variantId },
          include: { product: true },
        });

        if (!variant) throw new NotFoundError("Variante no encontrada para el ajuste.");

        const previousStock = variant.stock;
        let newStock: number;
        let delta: number;

        if (data.type === "EXACT") {
          if (data.value < 0) {
            throw new ValidationError("El stock exacto no puede ser negativo.");
          }
          newStock = data.value;
          delta = newStock - previousStock;
        } else {
          delta = data.value;
          newStock = previousStock + delta;
          if (newStock < 0) {
            throw new ValidationError(
              `El ajuste de ${delta} generaría un stock negativo (${newStock}). Stock actual: ${previousStock}`
            );
          }
        }

        if (delta === 0) {
          throw new ValidationError("El ajuste no modifica el stock actual.");
        }

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            movementType: MovementType.AJUSTE,
            quantity: delta,
            previousStock,
            newStock,
            referenceType: "MANUAL_ADJUSTMENT",
            notes: data.notes,
            createdBy: createdByUserId || null,
          },
        });

        return {
          productName: variant.product.name,
          variantTitle: variant.title,
          previousStock,
          newStock,
          delta,
          movementId: movement.id,
        };
      }

      // Simple
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new NotFoundError("Producto no encontrado para el ajuste.");
      if (product.hasVariants) {
        throw new ValidationError("Debe especificar la variante que desea ajustar.");
      }

      const previousStock = product.stock;
      let newStock: number;
      let delta: number;

      if (data.type === "EXACT") {
        if (data.value < 0) {
          throw new ValidationError("El stock exacto no puede ser negativo.");
        }
        newStock = data.value;
        delta = newStock - previousStock;
      } else {
        delta = data.value;
        newStock = previousStock + delta;
        if (newStock < 0) {
          throw new ValidationError(
            `El ajuste de ${delta} generaría un stock negativo (${newStock}). Stock actual: ${previousStock}`
          );
        }
      }

      if (delta === 0) {
        throw new ValidationError("El ajuste no modifica el stock actual.");
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.AJUSTE,
          quantity: delta,
          previousStock,
          newStock,
          referenceType: "MANUAL_ADJUSTMENT",
          notes: data.notes,
          createdBy: createdByUserId || null,
        },
      });

      return {
        productName: product.name,
        previousStock,
        newStock,
        delta,
        movementId: movement.id,
      };
    });
  }

  /**
   * =========================================================================
   * 5. Devolución de Producto (DEVOLUCION)
   * =========================================================================
   * - Retorno de artículo a inventario. Incrementa stock.
   */
  static async recordReturn(
    rawInput: z.input<typeof stockReturnSchema>,
    createdByUserId?: string
  ) {
    const data = stockReturnSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      if (data.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: data.variantId },
          include: { product: true },
        });

        if (!variant) throw new NotFoundError("Variante no encontrada.");

        const previousStock = variant.stock;
        const newStock = previousStock + data.quantity;

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            movementType: MovementType.DEVOLUCION,
            quantity: data.quantity,
            previousStock,
            newStock,
            referenceId: data.referenceId,
            referenceType: "CUSTOMER_RETURN",
            notes: data.notes,
            createdBy: createdByUserId || null,
          },
        });

        return {
          productName: variant.product.name,
          variantTitle: variant.title,
          previousStock,
          newStock,
          quantityReturned: data.quantity,
          movementId: movement.id,
        };
      }

      // Simple
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new NotFoundError("Producto no encontrado.");

      const previousStock = product.stock;
      const newStock = previousStock + data.quantity;

      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.DEVOLUCION,
          quantity: data.quantity,
          previousStock,
          newStock,
          referenceId: data.referenceId,
          referenceType: "CUSTOMER_RETURN",
          notes: data.notes,
          createdBy: createdByUserId || null,
        },
      });

      return {
        productName: product.name,
        previousStock,
        newStock,
        quantityReturned: data.quantity,
        movementId: movement.id,
      };
    });
  }

  /**
   * =========================================================================
   * 6. Reserva de Inventario (RESERVA)
   * =========================================================================
   * - Retiene temporalmente stock mientras se valida un comprobante bancario.
   */
  static async reserveStock(
    rawInput: z.input<typeof stockReservationSchema>,
    createdByUserId?: string
  ) {
    const data = stockReservationSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      if (data.variantId) {
        const lockedRows = await tx.$queryRaw<Array<{ id: string; stock: number; product_id: string }>>`
          SELECT id, stock, product_id 
          FROM "product_variants" 
          WHERE id = ${data.variantId} 
          FOR UPDATE
        `;

        if (!lockedRows || lockedRows.length === 0) {
          throw new NotFoundError("Variante no encontrada para reserva.");
        }

        const currentVariant = lockedRows[0];
        if (currentVariant.stock < data.quantity) {
          throw new InsufficientStockError(
            `Stock insuficiente para reservar. Disponible: ${currentVariant.stock}, Solicitado: ${data.quantity}`
          );
        }

        const previousStock = currentVariant.stock;
        const newStock = previousStock - data.quantity;

        await tx.productVariant.update({
          where: { id: currentVariant.id },
          data: { stock: newStock },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: currentVariant.product_id,
            variantId: currentVariant.id,
            movementType: MovementType.RESERVA,
            quantity: -data.quantity,
            previousStock,
            newStock,
            referenceId: data.referenceId,
            referenceType: "RESERVATION",
            notes: data.notes,
            createdBy: createdByUserId || null,
          },
        });

        return { previousStock, newStock, movementId: movement.id };
      }

      // Simple
      const lockedProducts = await tx.$queryRaw<Array<{ id: string; stock: number; has_variants: boolean }>>`
        SELECT id, stock, has_variants 
        FROM "products" 
        WHERE id = ${data.productId} 
        FOR UPDATE
      `;

      if (!lockedProducts || lockedProducts.length === 0) {
        throw new NotFoundError("Producto no encontrado para reserva.");
      }

      const currentProduct = lockedProducts[0];
      if (currentProduct.has_variants) {
        throw new ValidationError("Debe especificar la variante que desea reservar.");
      }

      if (currentProduct.stock < data.quantity) {
        throw new InsufficientStockError(
          `Stock insuficiente para reservar. Disponible: ${currentProduct.stock}, Solicitado: ${data.quantity}`
        );
      }

      const previousStock = currentProduct.stock;
      const newStock = previousStock - data.quantity;

      await tx.product.update({
        where: { id: currentProduct.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: currentProduct.id,
          movementType: MovementType.RESERVA,
          quantity: -data.quantity,
          previousStock,
          newStock,
          referenceId: data.referenceId,
          referenceType: "RESERVATION",
          notes: data.notes,
          createdBy: createdByUserId || null,
        },
      });

      return { previousStock, newStock, movementId: movement.id };
    });
  }

  /**
   * =========================================================================
   * 7. Cancelación de Reserva (CANCELACION_RESERVA)
   * =========================================================================
   * - Libera stock retenido y lo devuelve a disponibilidad.
   */
  static async cancelReservation(
    rawInput: z.input<typeof cancelReservationSchema>,
    createdByUserId?: string
  ) {
    const data = cancelReservationSchema.parse(rawInput);

    return prisma.$transaction(async (tx) => {
      if (data.variantId) {
        const variant = await tx.productVariant.findUnique({
          where: { id: data.variantId },
          include: { product: true },
        });

        if (!variant) throw new NotFoundError("Variante no encontrada.");

        const previousStock = variant.stock;
        const newStock = previousStock + data.quantity;

        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        });

        const movement = await tx.inventoryMovement.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            movementType: MovementType.CANCELACION_RESERVA,
            quantity: data.quantity,
            previousStock,
            newStock,
            referenceId: data.referenceId,
            referenceType: "RESERVATION_CANCELLED",
            notes: data.notes,
            createdBy: createdByUserId || null,
          },
        });

        return { previousStock, newStock, movementId: movement.id };
      }

      // Simple
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new NotFoundError("Producto no encontrado.");

      const previousStock = product.stock;
      const newStock = previousStock + data.quantity;

      await tx.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: product.id,
          movementType: MovementType.CANCELACION_RESERVA,
          quantity: data.quantity,
          previousStock,
          newStock,
          referenceId: data.referenceId,
          referenceType: "RESERVATION_CANCELLED",
          notes: data.notes,
          createdBy: createdByUserId || null,
        },
      });

      return { previousStock, newStock, movementId: movement.id };
    });
  }

  /**
   * =========================================================================
   * 8. Consultas de Estado de Inventario y Matriz de Stock
   * =========================================================================
   */
  static async getInventoryStatus(rawQuery?: z.input<typeof inventoryStatusQuerySchema>) {
    const query = inventoryStatusQuerySchema.parse(rawQuery || {});

    const where: Prisma.ProductWhereInput = {
      status: { not: "ARCHIVED" },
    };

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { sku: { contains: query.search, mode: "insensitive" } },
        {
          variants: {
            some: {
              OR: [
                { sku: { contains: query.search, mode: "insensitive" } },
                { title: { contains: query.search, mode: "insensitive" } },
              ],
            },
          },
        },
      ];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    const [products, totalCount] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          images: {
            where: { isPrimary: true },
            select: { thumbnailUrl: true, url: true },
            take: 1,
          },
          variants: {
            where: { isActive: true },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              sku: true,
              title: true,
              stock: true,
              minStock: true,
              price: true,
              isActive: true,
            },
          },
        },
        orderBy: { name: "asc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.product.count({ where }),
    ]);

    // Calcular KPIs agregados
    let totalUnitsInStock = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    // Estructurar elementos para la matriz
    const items = products.map((p) => {
      let isLowStock = false;
      let isOutOfStock = false;

      if (p.hasVariants) {
        const variantTotalStock = p.variants.reduce((sum, v) => sum + v.stock, 0);
        totalUnitsInStock += variantTotalStock;

        for (const v of p.variants) {
          if (v.stock === 0) outOfStockCount++;
          else if (v.stock <= v.minStock) lowStockCount++;
        }

        isOutOfStock = p.variants.length > 0 && p.variants.every((v) => v.stock === 0);
        isLowStock = !isOutOfStock && p.variants.some((v) => v.stock <= v.minStock);

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          hasVariants: true,
          category: p.category,
          thumbnailUrl: p.images[0]?.thumbnailUrl || p.images[0]?.url || null,
          totalStock: variantTotalStock,
          minStock: p.minStock,
          isLowStock,
          isOutOfStock,
          variants: p.variants.map((v) => ({
            ...v,
            isLowStock: v.stock > 0 && v.stock <= v.minStock,
            isOutOfStock: v.stock === 0,
          })),
        };
      } else {
        totalUnitsInStock += p.stock;
        if (p.stock === 0) {
          outOfStockCount++;
          isOutOfStock = true;
        } else if (p.stock <= p.minStock) {
          lowStockCount++;
          isLowStock = true;
        }

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          hasVariants: false,
          category: p.category,
          thumbnailUrl: p.images[0]?.thumbnailUrl || p.images[0]?.url || null,
          totalStock: p.stock,
          minStock: p.minStock,
          isLowStock,
          isOutOfStock,
          variants: [],
        };
      }
    });

    // Filtrar en memoria por status si se solicitó específicamente
    let filteredItems = items;
    if (query.status === "LOW_STOCK") {
      filteredItems = items.filter((i) => i.isLowStock);
    } else if (query.status === "OUT_OF_STOCK") {
      filteredItems = items.filter((i) => i.isOutOfStock);
    } else if (query.status === "NORMAL") {
      filteredItems = items.filter((i) => !i.isLowStock && !i.isOutOfStock);
    }

    return {
      kpis: {
        totalProducts: totalCount,
        totalUnitsInStock,
        lowStockCount,
        outOfStockCount,
      },
      data: filteredItems,
      pagination: {
        page: query.page,
        limit: query.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / query.limit),
      },
    };
  }

  /**
   * =========================================================================
   * 9. Bitácora Histórica de Movimientos
   * =========================================================================
   */
  static async getMovementsHistory(rawQuery?: z.input<typeof movementsQuerySchema>) {
    const query = movementsQuerySchema.parse(rawQuery || {});

    const where: Prisma.InventoryMovementWhereInput = {};

    if (query.productId) where.productId = query.productId;
    if (query.variantId) where.variantId = query.variantId;
    if (query.movementType) where.movementType = query.movementType;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, slug: true } },
          variant: { select: { id: true, title: true, sku: true } },
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return {
      data: movements,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
}
