import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, InsufficientStockError, ValidationError, AppError } from "@/lib/errors";
import { createOrderSchema } from "@/core/orders/validation";
import { generateOrderNumber } from "@/lib/formatters";
import { OrderStatus, MovementType } from "@prisma/client";
import { getAuthenticatedUser, requireAdminUser } from "@/core/auth/session";
import { signJwt, Role } from "@/core/auth/jwt";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);

    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get("orderNumber");
    const status = searchParams.get("status") as OrderStatus | null;

    if (orderNumber) {
      const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: {
          items: true,
          shippingMethod: true,
          bankAccount: true,
          statusHistory: { orderBy: { createdAt: "desc" } },
        },
      });

      if (!order) {
        throw new NotFoundError(`Pedido #${orderNumber} no encontrado.`);
      }

      return NextResponse.json({ success: true, data: order });
    }

    const whereClause: Record<string, unknown> = {};
    if (status) {
      whereClause.status = status;
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true,
        shippingMethod: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders.length,
    });
  } catch (error) {
    return handleApiError(error, "OrdersAPI.GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getAuthenticatedUser(req);
    const body = await req.json();
    const validated = createOrderSchema.parse(body);

    const idempotencyKey =
      validated.idempotencyKey || req.headers.get("idempotency-key") || null;

    if (idempotencyKey) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          adminNotes: {
            contains: `IDEMPOTENCY_KEY:${idempotencyKey}`,
          },
        },
        include: {
          items: true,
          shippingMethod: true,
        },
      });

      if (existingOrder) {
        return NextResponse.json({
          success: true,
          message: "Pedido recuperado exitosamente (idempotencia)",
          data: existingOrder,
        });
      }
    }

    // 1. Obtener tienda por defecto
    const store = await prisma.store.findFirst({
      where: { isDefault: true },
    });
    if (!store) {
      throw new Error("No existe una tienda principal configurada.");
    }

    // 2. Verificar método de envío en base de datos
    const shippingMethod = await prisma.shippingMethod.findUnique({
      where: { id: validated.shippingMethodId },
    });
    if (!shippingMethod || !shippingMethod.isActive) {
      throw new NotFoundError("El método de envío seleccionado no es válido o está inactivo.");
    }

    // 3. Ejecutar creación atómica con Bloqueo Pesimista (FOR UPDATE) y Zero-Trust Pricing
    const { createdOrder, orderToken } = await prisma.$transaction(async (tx) => {
      let calculatedSubtotal = 0;
      const orderItemsToCreate = [];
      const orderNumber = generateOrderNumber();

      for (const item of validated.items) {
        if (item.variantId) {
          // Bloqueo pesimista de fila para prevenir carreras concurrentes
          const lockedVariants = await tx.$queryRaw<
            Array<{
              id: string;
              stock: number;
              price: any;
              compare_at_price: any;
              title: string;
              sku: string;
              is_active: boolean;
              attributes: any;
              product_id: string;
              product_name: string;
              product_status: string;
            }>
          >`
            SELECT
              v.id,
              v.stock,
              v.price,
              v.compare_at_price,
              v.title,
              v.sku,
              v.is_active,
              v.attributes,
              v.product_id,
              p.name as product_name,
              p.status as product_status
            FROM "product_variants" v
            JOIN "products" p ON p.id = v.product_id
            WHERE v.id = ${item.variantId}
            FOR UPDATE
          `;

          if (!lockedVariants || lockedVariants.length === 0) {
            throw new NotFoundError("La variante solicitada no existe.");
          }

          const variant = lockedVariants[0];
          if (!variant.is_active || variant.product_status !== "PUBLISHED") {
            throw new NotFoundError("La variante solicitada no está disponible para la venta.");
          }

          if (variant.stock < item.quantity) {
            throw new InsufficientStockError(
              `Stock insuficiente para ${variant.product_name} (${variant.title}). Disponible: ${variant.stock}`
            );
          }

          const previousStock = variant.stock;
          const newStock = previousStock - item.quantity;

          // Descontar inventario inmediatamente en la reserva
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock },
          });

          // Registrar trazabilidad inmutable del movimiento RESERVA
          await tx.inventoryMovement.create({
            data: {
              productId: variant.product_id,
              variantId: variant.id,
              movementType: MovementType.RESERVA,
              quantity: -item.quantity,
              previousStock,
              newStock,
              referenceId: orderNumber,
              referenceType: "ORDER",
              notes: `Reserva automática por checkout de pedido #${orderNumber}`,
              createdBy: sessionUser?.userId || null,
            },
          });

          const unitPrice = Number(variant.price);
          const lineTotal = unitPrice * item.quantity;
          calculatedSubtotal += lineTotal;

          orderItemsToCreate.push({
            productId: variant.product_id,
            variantId: variant.id,
            productTitle: variant.product_name,
            variantTitle: variant.title,
            sku: variant.sku,
            unitPrice,
            quantity: item.quantity,
            totalPrice: lineTotal,
            snapshot: {
              attributes: variant.attributes,
              compareAtPrice: variant.compare_at_price ? Number(variant.compare_at_price) : null,
            },
          });
        } else {
          // Bloqueo pesimista para producto simple
          const lockedProducts = await tx.$queryRaw<
            Array<{
              id: string;
              stock: number;
              base_price: any;
              compare_at_price: any;
              name: string;
              sku: string;
              status: string;
              has_variants: boolean;
            }>
          >`
            SELECT id, stock, base_price, compare_at_price, name, sku, status, has_variants
            FROM "products"
            WHERE id = ${item.productId}
            FOR UPDATE
          `;

          if (!lockedProducts || lockedProducts.length === 0) {
            throw new NotFoundError("El producto no existe o no fue encontrado.");
          }

          const product = lockedProducts[0];
          if (product.status !== "PUBLISHED") {
            throw new NotFoundError("El producto no existe o no está publicado.");
          }

          if (product.has_variants) {
            throw new ValidationError(`El producto ${product.name} requiere selección de variante.`);
          }

          if (product.stock < item.quantity) {
            throw new InsufficientStockError(
              `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`
            );
          }

          const previousStock = product.stock;
          const newStock = previousStock - item.quantity;

          // Descontar inventario inmediatamente en la reserva
          await tx.product.update({
            where: { id: product.id },
            data: { stock: newStock },
          });

          // Registrar trazabilidad inmutable del movimiento RESERVA
          await tx.inventoryMovement.create({
            data: {
              productId: product.id,
              variantId: null,
              movementType: MovementType.RESERVA,
              quantity: -item.quantity,
              previousStock,
              newStock,
              referenceId: orderNumber,
              referenceType: "ORDER",
              notes: `Reserva automática por checkout de pedido #${orderNumber}`,
              createdBy: sessionUser?.userId || null,
            },
          });

          const unitPrice = Number(product.base_price);
          const lineTotal = unitPrice * item.quantity;
          calculatedSubtotal += lineTotal;

          orderItemsToCreate.push({
            productId: product.id,
            variantId: null,
            productTitle: product.name,
            variantTitle: null,
            sku: product.sku || "GEN-SKU",
            unitPrice,
            quantity: item.quantity,
            totalPrice: lineTotal,
            snapshot: {
              compareAtPrice: product.compare_at_price ? Number(product.compare_at_price) : null,
            },
          });
        }
      }

      // Evaluar envío gratuito según umbral configurado
      let shippingCost = Number(shippingMethod.price);
      if (
        shippingMethod.freeShippingThreshold &&
        calculatedSubtotal >= Number(shippingMethod.freeShippingThreshold)
      ) {
        shippingCost = 0.0;
      }

      const total = calculatedSubtotal + shippingCost;

      const hasProof = Boolean(validated.proofOfPaymentUrl);
      const initialStatus = hasProof
        ? OrderStatus.PAGO_EN_REVISION
        : OrderStatus.PENDIENTE_DE_PAGO;

      const adminNotes = idempotencyKey ? `IDEMPOTENCY_KEY:${idempotencyKey}` : null;

      // Crear pedido formal
      const order = await tx.order.create({
        data: {
          orderNumber,
          storeId: store.id,
          customerId: sessionUser?.userId || null,
          guestName: validated.guestName,
          guestPhone: validated.guestPhone,
          guestWhatsapp: validated.guestWhatsapp,
          guestEmail: validated.guestEmail,
          shippingMethodId: shippingMethod.id,
          shippingCost,
          subtotal: calculatedSubtotal,
          discountAmount: 0.0,
          total,
          status: initialStatus,
          shippingAddress: validated.shippingAddress,
          customerNotes: validated.customerNotes,
          adminNotes,
          proofOfPaymentUrl: validated.proofOfPaymentUrl || null,
          proofUploadedAt: hasProof ? new Date() : null,
          items: {
            create: orderItemsToCreate,
          },
          statusHistory: {
            create: {
              newStatus: initialStatus,
              notes: hasProof
                ? "Pedido creado con comprobante de pago adjunto. Pendiente de aprobación administrativa."
                : "Pedido creado por el cliente. Stock reservado. Esperando depósito bancario y comprobante.",
            },
          },
        },
        include: {
          items: true,
          shippingMethod: true,
        },
      });

      // 3.3 Generar token criptografico DENTRO de la transaccion atomica
      // Garantiza atomicidad estricta: si la firma falla, PostgreSQL hace ROLLBACK
      // completo de la orden, los items, el historial y los movimientos de inventario.
      const orderToken = await signJwt(
        {
          sub: order.id,
          orderNumber: order.orderNumber,
          role: Role.CUSTOMER,
          name: order.guestName || "Customer",
          email: order.guestEmail || "guest@delki.do",
          purpose: "order_confirmation",
        },
        "7d"
      );

      if (!orderToken) {
        throw new AppError(
          "No se pudo generar la credencial de confirmacion del pedido.",
          500,
          "TOKEN_GENERATION_ERROR"
        );
      }

      return { createdOrder: order, orderToken };
    });



    const cleanNumber = createdOrder.orderNumber.trim().toUpperCase().replace(/^#/, "");
    const response = NextResponse.json(
      {
        success: true,
        message: "Pedido creado exitosamente",
        data: {
          id: createdOrder.id,
          orderNumber: createdOrder.orderNumber,
          status: createdOrder.status,
          subtotal: Number(createdOrder.subtotal),
          shippingCost: Number(createdOrder.shippingCost),
          total: Number(createdOrder.total),
          createdAt: createdOrder.createdAt,
        },
      },
      { status: 201 }
    );

    response.cookies.set({
      name: `order_token_${cleanNumber}`,
      value: orderToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 dias
    });

    return response;
  } catch (error) {
    return handleApiError(error, "OrdersAPI.POST");
  }
}

