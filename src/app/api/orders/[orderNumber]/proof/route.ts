import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ForbiddenError, ValidationError, UnauthorizedError } from "@/lib/errors";
import { getAuthenticatedUser } from "@/core/auth/session";
import { ADMIN_ROLES, Role, signJwt, verifyJwt } from "@/core/auth/jwt";
import { storageService } from "@/core/storage/storage-service";
import { validateFileBuffer, sanitizeFilename, detectFileMime } from "@/lib/file-validator";
import { OrderStatus } from "@prisma/client";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

export const config = {
  api: {
    bodyParser: false,
  },
};

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

/**
 * GET /api/orders/[orderNumber]/proof
 * Transmite de manera segura el comprobante privado únicamente a usuarios autorizados
 * (Administradores, el cliente propietario del pedido o poseedores de un token criptográfico de acceso).
 * Busca prioritariamente en PostgreSQL (persistencia 100% gratuita a prueba de redeploys)
 * con fallback al filesystem local.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params;
    const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: cleanNumber }, { id: cleanNumber }],
      },
    });

    if (!order) {
      throw new NotFoundError(`Pedido #${orderNumber} no encontrado.`);
    }

    if (!order.proofOfPaymentUrl) {
      throw new NotFoundError("El pedido no tiene ningún comprobante de pago adjunto.");
    }

    // 1. Verificación de Autorización Estricta
    const sessionUser = await getAuthenticatedUser(req);
    let isAuthorized = false;

    // Administradores: Acceso total
    if (sessionUser && ADMIN_ROLES.includes(sessionUser.role)) {
      isAuthorized = true;
    }

    // Clientes autenticados propietarios del pedido
    if (!isAuthorized && sessionUser && order.customerId && sessionUser.userId === order.customerId) {
      isAuthorized = true;
    }

    // Token criptográfico temporal (para invitados en su pantalla de confirmación)
    if (!isAuthorized) {
      const { searchParams } = new URL(req.url);
      const token = searchParams.get("token");
      if (token) {
        const payload = await verifyJwt(token);
        if (
          payload &&
          (payload.sub === order.id || payload.orderNumber === order.orderNumber)
        ) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenError("Acceso denegado: no tiene permisos para visualizar este comprobante bancario.");
    }

    // 2. Localizar y leer el comprobante
    let buffer: Buffer | null = null;
    let contentType = "application/octet-stream";

    const receiptMatch = order.adminNotes?.match(/RECEIPT_FILE:([^\s|]+)/);
    const receiptPath = receiptMatch && receiptMatch[1] ? receiptMatch[1].trim() : null;

    // 2.1 Buscar en PostgreSQL (100% persistente y gratuito)
    const dbReceipt = await prisma.orderReceipt.findFirst({
      where: {
        OR: [
          { orderId: order.id },
          receiptPath ? { storagePath: receiptPath } : undefined,
        ].filter(Boolean) as any,
      },
      orderBy: { createdAt: "desc" },
    });

    if (dbReceipt && dbReceipt.data) {
      buffer = Buffer.from(dbReceipt.data);
      contentType = dbReceipt.mimeType || "application/octet-stream";
    }

    // 2.2 Fallback: filesystem privado local
    if (!buffer && receiptPath) {
      try {
        buffer = await storageService.readPrivateFile(receiptPath);
        const detected = detectFileMime(buffer);
        if (detected) contentType = detected.mime;
      } catch (e) {
        // Fallback local no encontrado
      }
    }

    // 2.3 Fallback histórico: si el URL apuntaba a /uploads/receipts/...
    if (!buffer && order.proofOfPaymentUrl.includes("/uploads/")) {
      const publicRelative = order.proofOfPaymentUrl.split("?")[0].replace(/^\/uploads\//, "");
      const fullPath = path.resolve(process.cwd(), env.UPLOAD_DIR, publicRelative);
      try {
        buffer = await fs.readFile(fullPath);
        const detected = detectFileMime(buffer);
        if (detected) contentType = detected.mime;
      } catch (e) {
        // Fallback no encontrado
      }
    }

    if (!buffer) {
      throw new NotFoundError("El archivo físico del comprobante no fue encontrado en el servidor.");
    }

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return handleApiError(error, "OrdersProofAPI.GET");
  }
}

/**
 * POST /api/orders/[orderNumber]/proof
 * Recibe, valida criptográficamente (magic bytes) y persiste el comprobante
 * tanto en PostgreSQL (permanente) como en filesystem local (cache temporal).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { orderNumber } = await params;
    const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: cleanNumber }, { id: cleanNumber }],
      },
    });

    if (!order) {
      throw new NotFoundError(`Pedido #${orderNumber} no encontrado.`);
    }

    // Comprobar estado del pedido
    if (order.status === OrderStatus.CANCELADO) {
      throw new ValidationError("No es posible subir un comprobante para un pedido cancelado.");
    }
    if (order.status === OrderStatus.PAGADO || order.status === OrderStatus.COMPLETADO) {
      throw new ValidationError("Este pedido ya ha sido pagado y confirmado previamente.");
    }

    // Comprobar propiedad si el pedido está ligado a un cliente registrado
    const sessionUser = await getAuthenticatedUser(req);
    if (order.customerId) {
      if (!sessionUser) {
        throw new UnauthorizedError("Debe iniciar sesión para adjuntar comprobante a este pedido.");
      }
      if (sessionUser.userId !== order.customerId && !ADMIN_ROLES.includes(sessionUser.role)) {
        throw new ForbiddenError("No tiene autorización para modificar el comprobante de este pedido.");
      }
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      throw new ValidationError("No se suministró ningún comprobante.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError("El tamaño del archivo no puede superar los 10MB.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validación estricta con Magic Bytes
    const validation = validateFileBuffer(
      buffer,
      ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      10 * 1024 * 1024
    );

    if (!validation.isValid) {
      throw new ValidationError(
        validation.error ||
          "El comprobante debe ser una imagen válida (JPG, PNG, WebP) o un archivo PDF legítimo."
      );
    }

    const safeFilename = sanitizeFilename(file.name);
    const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
    const mimeType = validation.detectedMime || "application/octet-stream";

    // 1. Guardar en filesystem privado local (cache temporal)
    let storedPath = `receipts/${Date.now()}-${safeFilename}`;
    try {
      const stored = await storageService.uploadPrivateFile(buffer, safeFilename, "receipts");
      storedPath = stored.relativePath;
    } catch (e) {
      // Ignorar si el filesystem local fuera efímero o de solo lectura
    }

    // Token criptográfico temporal para que el cliente que sube pueda visualizar su comprobante
    const proofToken = await signJwt(
      {
        sub: order.id,
        orderNumber: order.orderNumber,
        email: order.guestEmail || "guest@delki.do",
        role: Role.CUSTOMER,
        name: "ProofViewer",
      },
      "7d"
    );

    const secureProofUrl = `/api/orders/${order.orderNumber}/proof?token=${proofToken}`;

    // Actualizar pedido a PAGO_EN_REVISION atómicamente
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Guardar en PostgreSQL de forma atómica dentro de la transacción (cero riesgo de huérfanos)
      await tx.orderReceipt.create({
        data: {
          orderId: order.id,
          filename: safeFilename,
          storagePath: storedPath,
          mimeType,
          size: buffer.length,
          sha256,
          data: buffer as any,
        },
      });
      const previousStatus = order.status;
      const newStatus = OrderStatus.PAGO_EN_REVISION;

      const adminNotes = order.adminNotes
        ? `${order.adminNotes} | RECEIPT_FILE:${storedPath}`
        : `RECEIPT_FILE:${storedPath}`;

      const orderUpdated = await tx.order.update({
        where: { id: order.id },
        data: {
          proofOfPaymentUrl: secureProofUrl,
          proofUploadedAt: new Date(),
          proofRejectionReason: null,
          adminNotes,
          status: newStatus,
        },
        include: {
          items: true,
          shippingMethod: true,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          previousStatus,
          newStatus,
          notes: "Comprobante de depósito/transferencia subido por el cliente y persistido en PostgreSQL.",
          changedBy: sessionUser?.userId || null,
        },
      });

      return orderUpdated;
    });

    return NextResponse.json({
      success: true,
      message: "Comprobante de pago recibido y persistido exitosamente. Pedido en revisión.",
      data: updatedOrder,
    });
  } catch (error) {
    return handleApiError(error, "OrdersProofAPI.POST");
  }
}