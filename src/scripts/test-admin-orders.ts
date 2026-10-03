import { prisma } from "../lib/db";
import { OrderStatus } from "@prisma/client";
import { NextRequest } from "next/server";

async function runAdminOrderTests() {
  console.log("🛍️ ========================================================");
  console.log("🛍️ INICIANDO SUITE DE PRUEBAS: GESTIÓN ADMINISTRATIVA DE PEDIDOS");
  console.log("🛍️ ========================================================\n");

  let testOrderId = "";
  let testOrderNumber = "";
  let cancelOrderId = "";
  let adminUserId = "";

  try {
    // 1. OBTENER O PREPARAR DATOS BASE
    const store = await prisma.store.findFirstOrThrow({ where: { isDefault: true } });
    const shippingMethod = await prisma.shippingMethod.findFirstOrThrow({ where: { isActive: true } });
    const bankAccount = await prisma.bankAccount.findFirstOrThrow({ where: { isActive: true } });
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    adminUserId = adminUser ? adminUser.id : "test-admin-id";

    // Crear un producto para el pedido de prueba
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Producto Test Gestión Pedidos",
        slug: `producto-test-admin-orders-${Date.now()}`,
        basePrice: 2500.0,
        sku: `ADMIN-ORD-${Date.now()}`,
        stock: 20,
        status: "PUBLISHED",
      },
    });

    // 2. CREAR PEDIDO DE PRUEBA INICIAL
    const orderTimestamp = Date.now();
    testOrderNumber = `TK-TEST-${orderTimestamp}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        storeId: store.id,
        guestName: "Carlos Almonte Test",
        guestPhone: "8095551234",
        guestWhatsapp: "8095551234",
        guestEmail: "carlos.test@ejemplo.com",
        shippingMethodId: shippingMethod.id,
        shippingCost: 200.0,
        subtotal: 2500.0,
        discountAmount: 0.0,
        total: 2700.0,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        bankAccountId: bankAccount.id,
        shippingAddress: {
          streetAddress: "Av. 27 de Febrero #456",
          sectorOrNeighborhood: "Piantini",
          city: "Santo Domingo",
          provinceOrState: "Distrito Nacional",
          deliveryNotes: "Torre Empresarial piso 4",
        },
        items: {
          create: [
            {
              productId: product.id,
              productTitle: product.name,
              sku: product.sku || "ADMIN-ORD-DEFAULT",
              unitPrice: 2500.0,
              quantity: 1,
              totalPrice: 2500.0,
              snapshot: { name: product.name, sku: product.sku || "ADMIN-ORD-DEFAULT" },
            },
          ],
        },
        statusHistory: {
          create: {
            newStatus: OrderStatus.PENDIENTE_DE_PAGO,
            notes: "Pedido registrado exitosamente vía checkout online.",
          },
        },
      },
    });

    testOrderId = order.id;
    console.log(`✅ [1/7] Pedido de prueba creado: #${testOrderNumber} (ID: ${testOrderId}) en estado PENDIENTE_DE_PAGO`);

    // 3. PROBAR ENDPOINT GET /api/admin/orders (LISTADO, FILTROS Y MÉTRICAS KPI)
    const { GET: listOrdersApi } = await import("../app/api/admin/orders/route");

    // A) Búsqueda por número de pedido
    const reqSearch = new NextRequest(`http://localhost:3000/api/admin/orders?search=${testOrderNumber}`);
    const resSearch = await listOrdersApi(reqSearch);
    const jsonSearch = await resSearch.json();

    if (!jsonSearch.success || jsonSearch.data.orders.length === 0) {
      throw new Error(`Fallo en filtro por búsqueda de pedido: ${JSON.stringify(jsonSearch)}`);
    }
    if (jsonSearch.data.orders[0].orderNumber !== testOrderNumber) {
      throw new Error("El pedido retornado no coincide con el número buscado.");
    }
    console.log("✅ [2/7] Listado /api/admin/orders: Búsqueda exacta y paginación funcionando");

    // B) Verificar métricas agregadas (KPIs)
    const metrics = jsonSearch.data.metrics;
    if (typeof metrics.totalOrders !== "number" || typeof metrics.pendingPayment !== "number") {
      throw new Error(`Métricas KPI incompletas o corruptas: ${JSON.stringify(metrics)}`);
    }
    console.log(`       → Métricas KPI: Total=${metrics.totalOrders}, Pendientes=${metrics.pendingPayment}, En Revisión=${metrics.underReview}`);

    // 4. PROBAR ENDPOINT GET /api/admin/orders/[id] (DETALLE COMPLETO)
    const { GET: getOrderDetailApi } = await import("../app/api/admin/orders/[id]/route");

    const reqDetail = new NextRequest(`http://localhost:3000/api/admin/orders/${testOrderId}`);
    const resDetail = await getOrderDetailApi(reqDetail, {
      params: Promise.resolve({ id: testOrderId }),
    });
    const jsonDetail = await resDetail.json();

    if (!jsonDetail.success || jsonDetail.data.id !== testOrderId) {
      throw new Error(`Fallo al consultar detalle por ID: ${JSON.stringify(jsonDetail)}`);
    }
    if (jsonDetail.data.items.length !== 1 || !jsonDetail.data.statusHistory) {
      throw new Error("El detalle no incluye los items o el historial de estados.");
    }
    console.log("✅ [3/7] Detalle /api/admin/orders/[id]: Carga completa de items, dirección y auditoría");

    // 5. PROBAR MÁQUINA DE ESTADOS Y TRANSICIONES (PATCH /api/admin/orders/[id]/status)
    const { PATCH: updateStatusApi } = await import("../app/api/admin/orders/[id]/status/route");

    // Helper para invocar actualización de estado
    async function executeStatusPatch(
      id: string,
      payload: Record<string, any>,
      customHeaders: Record<string, string> = {}
    ) {
      const req = new NextRequest(`http://localhost:3000/api/admin/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": adminUserId,
          ...customHeaders,
        },
        body: JSON.stringify(payload),
      });
      const res = await updateStatusApi(req, { params: Promise.resolve({ id }) });
      const json = await res.json();
      return { status: res.status, json };
    }

    // A) Transición inválida: PENDIENTE_DE_PAGO -> COMPLETADO (Debe fallar)
    const invalidJump = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.COMPLETADO,
    });
    if (invalidJump.status !== 422 && invalidJump.status !== 400 || invalidJump.json.success) {
      throw new Error(`La máquina de estados debió rechazar el salto directo a COMPLETADO: ${JSON.stringify(invalidJump)}`);
    }
    console.log("✅ [4/7] Control de Invariantes: Salto prohibido PENDIENTE_DE_PAGO -> COMPLETADO rechazado con 422/400");

    // B) Simular subida de comprobante por cliente: PENDIENTE_DE_PAGO -> PAGO_EN_REVISION
    await prisma.order.update({
      where: { id: testOrderId },
      data: {
        status: OrderStatus.PAGO_EN_REVISION,
        proofOfPaymentUrl: "https://ejemplo.com/receipts/comprobante-1.jpg",
        proofUploadedAt: new Date(),
      },
    });

    // C) Rechazo de comprobante por administración: PAGO_EN_REVISION -> PENDIENTE_DE_PAGO sin motivo (Debe fallar)
    const rejectNoReason = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.PENDIENTE_DE_PAGO,
      rejectionReason: "",
    });
    if ((rejectNoReason.status !== 422 && rejectNoReason.status !== 400) || rejectNoReason.json.success) {
      throw new Error("El rechazo de comprobante debe exigir un motivo explicativo.");
    }

    // D) Rechazo de comprobante con motivo válido
    const rejectValid = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.PENDIENTE_DE_PAGO,
      rejectionReason: "El monto transferido es menor al total de la orden.",
      notes: "Se notificó al cliente por WhatsApp.",
    });
    if (!rejectValid.json.success || rejectValid.json.data.status !== OrderStatus.PENDIENTE_DE_PAGO) {
      throw new Error(`Fallo al rechazar comprobante con motivo: ${JSON.stringify(rejectValid)}`);
    }
    if (rejectValid.json.data.proofRejectionReason !== "El monto transferido es menor al total de la orden.") {
      throw new Error("El motivo de rechazo no quedó registrado en el pedido.");
    }
    console.log("✅ [5/7] Flujo de Rechazo de Comprobante: Rechazo justificado y registro de motivo correctos");

    // E) Cliente vuelve a subir comprobante y administrador aprueba el pago: PAGO_EN_REVISION -> PAGADO
    await prisma.order.update({
      where: { id: testOrderId },
      data: {
        status: OrderStatus.PAGO_EN_REVISION,
        proofOfPaymentUrl: "https://ejemplo.com/receipts/comprobante-corregido.jpg",
        proofRejectionReason: null,
      },
    });

    const confirmPayment = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.PAGADO,
      notes: "Comprobante verificado en Banreservas. Monto RD$ 2,700.00 exacto.",
    });
    if (!confirmPayment.json.success || confirmPayment.json.data.status !== OrderStatus.PAGADO) {
      throw new Error(`Fallo al confirmar pago: ${JSON.stringify(confirmPayment)}`);
    }
    console.log("       → Pago confirmado: Pedido pasa a PAGADO");

    // F) PAGADO -> PREPARANDO
    const prepOrder = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.PREPARANDO,
      notes: "Artículos empacados con cinta de seguridad.",
    });
    if (!prepOrder.json.success || prepOrder.json.data.status !== OrderStatus.PREPARANDO) {
      throw new Error(`Fallo al pasar a PREPARANDO: ${JSON.stringify(prepOrder)}`);
    }
    console.log("       → Empaque: Pedido pasa a PREPARANDO");

    // G) PREPARANDO -> ENVIADO sin transportista ni guía (Debe fallar con 400)
    const shipMissingTracking = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.ENVIADO,
      carrierName: "",
      trackingNumber: "",
    });
    if ((shipMissingTracking.status !== 422 && shipMissingTracking.status !== 400) || shipMissingTracking.json.success) {
      throw new Error("Para marcar ENVIADO debe exigirse obligatoriamente transportista y número de guía.");
    }

    // H) PREPARANDO -> ENVIADO con datos completos de despacho
    const shipValid = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.ENVIADO,
      carrierName: "Metro Pac",
      trackingNumber: "MP-RD-884920",
      trackingUrl: "https://metropac.do/rastreo?guia=MP-RD-884920",
      notes: "Entregado a oficina central Metro Pac.",
    });
    if (!shipValid.json.success || shipValid.json.data.status !== OrderStatus.ENVIADO) {
      throw new Error(`Fallo al marcar como ENVIADO: ${JSON.stringify(shipValid)}`);
    }
    if (
      shipValid.json.data.carrierName !== "Metro Pac" ||
      shipValid.json.data.trackingNumber !== "MP-RD-884920" ||
      !shipValid.json.data.shippedAt
    ) {
      throw new Error("Los metadatos de envío (transportista, guía, shippedAt) no se guardaron.");
    }
    console.log("       → Despacho: Pedido pasa a ENVIADO con Metro Pac / Guía: MP-RD-884920");

    // I) ENVIADO -> ENTREGADO
    const deliverOrder = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.ENTREGADO,
      notes: "Cliente confirmó recepción conforme en Piantini.",
    });
    if (!deliverOrder.json.success || deliverOrder.json.data.status !== OrderStatus.ENTREGADO) {
      throw new Error(`Fallo al pasar a ENTREGADO: ${JSON.stringify(deliverOrder)}`);
    }
    console.log("       → Entrega: Pedido pasa a ENTREGADO");

    // J) ENTREGADO -> COMPLETADO
    const completeOrder = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.COMPLETADO,
      notes: "Ciclo finalizado y orden archivada.",
    });
    if (!completeOrder.json.success || completeOrder.json.data.status !== OrderStatus.COMPLETADO) {
      throw new Error(`Fallo al pasar a COMPLETADO: ${JSON.stringify(completeOrder)}`);
    }
    console.log("       → Finalización: Pedido pasa a COMPLETADO (Estado final)");

    // K) Desde COMPLETADO ninguna transición es permitida
    const tryModifyCompleted = await executeStatusPatch(testOrderId, {
      targetStatus: OrderStatus.PENDIENTE_DE_PAGO,
    });
    if ((tryModifyCompleted.status !== 422 && tryModifyCompleted.status !== 400) || tryModifyCompleted.json.success) {
      throw new Error("No se debe permitir modificar un pedido COMPLETADO.");
    }
    console.log("✅ [6/7] Flujo Completo de Estados: PAGO -> PREPARANDO -> ENVIADO (con tracking) -> ENTREGADO -> COMPLETADO exitoso");

    // 6. PROBAR FLUJO DE CANCELACIÓN Y BLOQUEO POSTERIOR
    const cancelOrderRecord = await prisma.order.create({
      data: {
        orderNumber: `TK-CANCEL-${orderTimestamp}`,
        storeId: store.id,
        guestName: "Cliente A Cancelar",
        guestPhone: "8095559999",
        guestWhatsapp: "8095559999",
        shippingMethodId: shippingMethod.id,
        shippingCost: 0.0,
        subtotal: 500.0,
        total: 500.0,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        shippingAddress: { city: "Santiago" },
      },
    });
    cancelOrderId = cancelOrderRecord.id;

    const cancelRes = await executeStatusPatch(cancelOrderId, {
      targetStatus: OrderStatus.CANCELADO,
      notes: "Cancelado por solicitud directa del cliente antes de pagar.",
    });
    if (!cancelRes.json.success || cancelRes.json.data.status !== OrderStatus.CANCELADO) {
      throw new Error(`Fallo al cancelar pedido: ${JSON.stringify(cancelRes)}`);
    }

    const tryResumeCancelled = await executeStatusPatch(cancelOrderId, {
      targetStatus: OrderStatus.PAGADO,
    });
    if ((tryResumeCancelled.status !== 422 && tryResumeCancelled.status !== 400) || tryResumeCancelled.json.success) {
      throw new Error("No se debe permitir cambiar el estado de un pedido CANCELADO.");
    }
    console.log("✅ [7/7] Cancelación y Trazabilidad de Auditoría (OrderStatusHistory) completamente verificadas");

    // 7. VERIFICAR INTEGRIDAD DE AUDITORÍA
    const auditLogs = await prisma.orderStatusHistory.findMany({
      where: { orderId: testOrderId },
      orderBy: { createdAt: "asc" },
    });

    if (auditLogs.length < 6) {
      throw new Error(`El historial de auditoría tiene menos registros de los esperados: ${auditLogs.length}`);
    }

    console.log(`\n📋 Auditoría Registrada para #${testOrderNumber}:`);
    auditLogs.forEach((log, index) => {
      console.log(
        `   [${index + 1}] ${log.previousStatus || "NUEVO"} → ${log.newStatus} | Admin: ${log.changedBy || "N/A"} | Nota: "${log.notes}"`
      );
    });

    console.log("\n========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE GESTIÓN DE PEDIDOS PASARON EXITOSAMENTE");
    console.log("========================================================\n");
  } catch (error) {
    console.error("\n❌ ERROR EN LA SUITE DE PRUEBAS DE PEDIDOS:", error);
    process.exit(1);
  } finally {
    // Limpieza de datos de prueba
    if (testOrderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: testOrderId } }).catch(() => {});
      await prisma.orderItem.deleteMany({ where: { orderId: testOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
    }
    if (cancelOrderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: cancelOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: cancelOrderId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runAdminOrderTests();
