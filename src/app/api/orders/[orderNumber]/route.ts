import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { getAuthenticatedUser } from "@/core/auth/session";
import { verifyJwt, ADMIN_ROLES } from "@/core/auth/jwt";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

function maskName(name: string | null | undefined): string {
  if (!name) return "Cliente";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params;

    if (!orderNumber || !orderNumber.trim()) {
      throw new NotFoundError("Número de pedido no suministrado.");
    }

    const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");

    // Buscar pedido por orderNumber o id
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: cleanNumber }, { id: cleanNumber }],
      },
      include: {
        items: {
          select: {
            id: true,
            productTitle: true,
            variantTitle: true,
            sku: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
        shippingMethod: {
          select: {
            id: true,
            name: true,
            price: true,
            freeShippingThreshold: true,
            estimatedDays: true,
          },
        },
        statusHistory: {
          select: {
            id: true,
            previousStatus: true,
            newStatus: true,
            createdAt: true,
            notes: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundError(`No se encontró ningún pedido con el número "${orderNumber}".`);
    }

    // =========================================================================
    // CONTROL ESTRICTO DE PRIVACIDAD Y AUTORIZACIÓN:
    // Determinar si el solicitante tiene autorización para ver datos privados
    // (dirección, teléfonos, notas, comprobantes) o únicamente tracking público.
    // =========================================================================
    let isAuthorized = false;
    let isAdmin = false;

    // 1. Sesión de usuario autenticada (Cookie de sesión)
    const sessionUser = await getAuthenticatedUser(req);
    if (sessionUser) {
      // 1.1 Administrador / Staff de la plataforma
      if (ADMIN_ROLES.includes(sessionUser.role)) {
        isAuthorized = true;
        isAdmin = true;
      }
      // 1.2 Cliente autenticado propietario del pedido
      else if (order.customerId && sessionUser.userId === order.customerId) {
        isAuthorized = true;
      }
    }

    // 2. Token criptográfico (Header Authorization, Header x-order-token o Param ?token=)
    if (!isAuthorized) {
      const { searchParams } = new URL(req.url);
      const urlToken = searchParams.get("token")?.trim() || null;
      const headerAuth = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim() || null;
      const headerOrderToken = req.headers.get("x-order-token")?.trim() || null;

      let cookieOrderToken: string | null = null;
      if (req.cookies && typeof req.cookies.get === "function") {
        cookieOrderToken =
          req.cookies.get(`order_token_${cleanNumber}`)?.value?.trim() ||
          req.cookies.get("order_token")?.value?.trim() ||
          null;
      } else if (req.headers && typeof req.headers.get === "function") {
        const cookieHeader = req.headers.get("cookie");
        if (cookieHeader) {
          const matchSpecific = cookieHeader.match(new RegExp(`(?:^|; )order_token_${cleanNumber}=([^;]*)`));
          const matchGeneric = cookieHeader.match(/(?:^|; )order_token=([^;]*)/);
          const foundMatch = matchSpecific || matchGeneric;
          cookieOrderToken = foundMatch ? decodeURIComponent(foundMatch[1]).trim() : null;
        }
      }

      const tokenToVerify = headerAuth || headerOrderToken || cookieOrderToken || urlToken;
      if (tokenToVerify) {
        const payload = await verifyJwt(tokenToVerify);
        if (!payload) {
          throw new UnauthorizedError("Token de autorización inválido o expirado.");
        }

        // 2.1 Rol administrativo con privilegios (SUPER_ADMIN / ADMIN / STAFF)
        if (payload.role && ADMIN_ROLES.includes(payload.role)) {
          isAuthorized = true;
          isAdmin = true;
        }
        // 2.2 Token temporal de confirmación:
        //     Requiere obligatoriamente purpose === "order_confirmation" Y vinculación estricta
        //     al pedido correspondiente (orderNumber o orderId).
        else if (payload.purpose === "order_confirmation") {
          const isMatchingOrder =
            payload.orderNumber === cleanNumber ||
            payload.orderNumber === order.orderNumber ||
            payload.sub === order.id;

          if (!isMatchingOrder) {
            throw new ForbiddenError("El token de confirmación no corresponde a este pedido.");
          }
          isAuthorized = true;
        }
        // 2.3 Token de cliente autenticado que sea dueño del pedido
        else if (order.customerId && payload.sub === order.customerId) {
          isAuthorized = true;
        }
        // 2.4 Token con purpose incorrecto u origen no autorizado
        else {
          throw new ForbiddenError("Token no autorizado para acceder a este pedido.");
        }
      }
    }

    // =========================================================================
    // CASO 1: SOLICITUD AUTORIZADA (PANTALLA DE CONFIRMACIÓN / ADMIN / PROPIETARIO)
    // Retorna todos los datos requeridos para la confirmación de la compra.
    // =========================================================================
    if (isAuthorized) {
      return NextResponse.json({
        success: true,
        data: {
          id: order.id,
          orderNumber: order.orderNumber,
          guestName: order.guestName,
          maskedGuestName: maskName(order.guestName),
          guestPhone: order.guestPhone,
          guestWhatsapp: order.guestWhatsapp,
          guestEmail: order.guestEmail,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          subtotal: Number(order.subtotal),
          shippingCost: Number(order.shippingCost),
          discountAmount: Number(order.discountAmount),
          total: Number(order.total),
          shippingAddress: order.shippingAddress,
          shippingMethod: order.shippingMethod,
          shippingMethodName: order.shippingMethod?.name,
          estimatedDeliveryDays: order.shippingMethod?.estimatedDays,
          carrierName: order.carrierName,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          shippedAt: order.shippedAt,
          proofOfPaymentUrl: order.proofOfPaymentUrl,
          proofUploadedAt: order.proofUploadedAt,
          proofRejectionReason: order.proofRejectionReason,
          customerNotes: order.customerNotes,
          adminNotes: isAdmin ? order.adminNotes : undefined,
          itemsCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
          items: order.items.map((it) => ({
            id: it.id,
            productTitle: it.productTitle,
            variantTitle: it.variantTitle,
            title: it.productTitle,
            variant: it.variantTitle,
            sku: it.sku,
            quantity: it.quantity,
            unitPrice: Number(it.unitPrice),
            price: Number(it.unitPrice),
            totalPrice: Number(it.totalPrice),
          })),
          ...(isAdmin
            ? {
                statusHistory: order.statusHistory.map((h) => ({
                  id: h.id,
                  previousStatus: h.previousStatus,
                  newStatus: h.newStatus,
                  notes: h.notes,
                  createdAt: h.createdAt,
                  status: h.newStatus,
                  timestamp: h.createdAt,
                })),
              }
            : {}),
          history: order.statusHistory.map((h) => ({
            status: h.newStatus,
            timestamp: h.createdAt,
            ...(isAdmin ? { notes: h.notes } : {}),
          })),
        },
      });
    }

    // =========================================================================
    // CASO 2: SOLICITUD PÚBLICA NO AUTORIZADA (/RASTREO EN VIVO)
    // PROTECCIÓN DE PRIVACIDAD ESTRICTA:
    // Nunca expone teléfonos, whatsapp, email, direcciones, notas ni comprobantes.
    // Nombre enmascarado ("Juan P.").
    // =========================================================================
    return NextResponse.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        maskedGuestName: maskName(order.guestName),
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        total: Number(order.total),
        carrierName: order.carrierName,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippedAt: order.shippedAt,
        shippingMethodName: order.shippingMethod?.name,
        estimatedDeliveryDays: order.shippingMethod?.estimatedDays,
        itemsCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
        items: order.items.map((it) => ({
          productTitle: it.productTitle,
          variantTitle: it.variantTitle,
          quantity: it.quantity,
          totalPrice: Number(it.totalPrice),
        })),
        history: order.statusHistory.map((h) => ({
          status: h.newStatus,
          timestamp: h.createdAt,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error, "PublicOrderTracking.GET");
  }
}
