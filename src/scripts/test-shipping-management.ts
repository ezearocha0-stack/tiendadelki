import { prisma } from "../lib/db";
import { OrderStatus } from "@prisma/client";
import { NextRequest } from "next/server";

async function runShippingTests() {
  console.log("🚚 ========================================================");
  console.log("🚚 INICIANDO SUITE DE PRUEBAS: CONFIGURACIÓN DE ENVÍOS Y TRACKING");
  console.log("🚚 ========================================================\n");

  let testMethodId = "";
  let linkedMethodId = "";
  let testOrderId = "";
  let testOrderNumber = "";

  try {
    const { GET: listAdminShippingApi, POST: createAdminShippingApi } = await import(
      "../app/api/admin/shipping-methods/route"
    );
    const { PATCH: updateAdminShippingApi, DELETE: deleteAdminShippingApi } = await import(
      "../app/api/admin/shipping-methods/[id]/route"
    );
    const { GET: listPublicShippingApi } = await import("../app/api/shipping-methods/route");
    const { GET: publicTrackingApi } = await import("../app/api/orders/[orderNumber]/route");

    // 1. VALIDACIÓN EN CREACIÓN: PRECIO NEGATIVO O NOMBRE VACÍO DEBE FALLAR
    const invalidReq = new NextRequest("http://localhost:3000/api/admin/shipping-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "",
        price: -50,
      }),
    });
    const invalidRes = await createAdminShippingApi(invalidReq);
    const invalidJson = await invalidRes.json();

    if (invalidRes.status !== 422 || invalidJson.success) {
      throw new Error(`La API debió rechazar método con precio negativo y nombre vacío: ${JSON.stringify(invalidJson)}`);
    }
    console.log("✅ [1/7] Validaciones Zod: Creación con precio negativo o nombre vacío rechazada con 422");

    // 2. CREAR MÉTODO DE ENVÍO VÁLIDO VÍA API
    const validCreateReq = new NextRequest("http://localhost:3000/api/admin/shipping-methods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Envío Express Cibao",
        zoneDescription: "Santiago, La Vega y Moca",
        price: 350.0,
        freeShippingThreshold: 4000.0,
        estimatedDays: "24 horas",
        sortOrder: 10,
        isActive: true,
      }),
    });
    const validCreateRes = await createAdminShippingApi(validCreateReq);
    const validCreateJson = await validCreateRes.json();

    if (!validCreateJson.success || !validCreateJson.data.id) {
      throw new Error(`Fallo al crear método de envío: ${JSON.stringify(validCreateJson)}`);
    }
    testMethodId = validCreateJson.data.id;
    if (validCreateJson.data.price !== 350 || validCreateJson.data.name !== "Envío Express Cibao") {
      throw new Error("Los datos retornados al crear no coinciden con los enviados.");
    }
    console.log(`✅ [2/7] Creación Exitosa: "${validCreateJson.data.name}" (RD$ ${validCreateJson.data.price}) creado en PostgreSQL`);

    // 3. EDITAR MÉTODO (PATCH) Y TOGGLE DE ACTIVACIÓN
    const patchReq = new NextRequest(`http://localhost:3000/api/admin/shipping-methods/${testMethodId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        price: 375.0,
        estimatedDays: "12 a 24 horas garantizado",
        isActive: false,
      }),
    });
    const patchRes = await updateAdminShippingApi(patchReq, {
      params: Promise.resolve({ id: testMethodId }),
    });
    const patchJson = await patchRes.json();

    if (!patchJson.success || patchJson.data.price !== 375 || patchJson.data.isActive !== false) {
      throw new Error(`Fallo al actualizar método: ${JSON.stringify(patchJson)}`);
    }

    // Verificar que al estar inactivo no aparece en el listado público del checkout
    const publicRes1 = await listPublicShippingApi();
    const publicJson1 = await publicRes1.json();
    const isPresentInactive = publicJson1.data.some((m: any) => m.id === testMethodId);
    if (isPresentInactive) {
      throw new Error("El método desactivado no debió aparecer en el listado público de shipping methods.");
    }

    // Reactivar el método
    await updateAdminShippingApi(
      new NextRequest(`http://localhost:3000/api/admin/shipping-methods/${testMethodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      }),
      { params: Promise.resolve({ id: testMethodId }) }
    );
    console.log("✅ [3/7] Edición y Activación: Actualización de tarifas y filtrado dinámico en checkout verificados");

    // 4. ELIMINACIÓN SEGURA: BLOQUEAR BORRADO SI TIENE PEDIDOS ASOCIADOS
    const store = await prisma.store.findFirstOrThrow({ where: { isDefault: true } });
    const bankAccount = await prisma.bankAccount.findFirstOrThrow({ where: { isActive: true } });

    // Crear un método específico para vincularlo a una orden
    const linkedMethod = await prisma.shippingMethod.create({
      data: {
        name: "Método Con Pedidos Vinculados",
        zoneDescription: "Zona protegida",
        price: 150.0,
        isActive: true,
      },
    });
    linkedMethodId = linkedMethod.id;

    testOrderNumber = `TK-SHIP-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        storeId: store.id,
        guestName: "Cliente Prueba Envíos",
        guestPhone: "8095554321",
        guestWhatsapp: "8095554321",
        shippingMethodId: linkedMethodId,
        shippingCost: 150.0,
        subtotal: 1000.0,
        total: 1150.0,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        bankAccountId: bankAccount.id,
        shippingAddress: { city: "Santo Domingo" },
      },
    });
    testOrderId = order.id;

    // Intentar eliminar el método vinculado -> Debe arrojar error 409 Conflict
    const tryDeleteLinkedReq = new NextRequest(
      `http://localhost:3000/api/admin/shipping-methods/${linkedMethodId}`,
      { method: "DELETE" }
    );
    const tryDeleteLinkedRes = await deleteAdminShippingApi(tryDeleteLinkedReq, {
      params: Promise.resolve({ id: linkedMethodId }),
    });
    const tryDeleteLinkedJson = await tryDeleteLinkedRes.json();

    if (tryDeleteLinkedRes.status !== 409 || tryDeleteLinkedJson.success) {
      throw new Error(`Se esperaba error 409 al intentar borrar método con pedidos: ${JSON.stringify(tryDeleteLinkedJson)}`);
    }
    console.log("✅ [4/7] Eliminación Segura: Intento de eliminar método con pedidos rechazado con 409 Conflict");

    // 5. ELIMINACIÓN PERMITIDA CUANDO NO TIENE PEDIDOS ASOCIADOS
    const deleteFreeReq = new NextRequest(
      `http://localhost:3000/api/admin/shipping-methods/${testMethodId}`,
      { method: "DELETE" }
    );
    const deleteFreeRes = await deleteAdminShippingApi(deleteFreeReq, {
      params: Promise.resolve({ id: testMethodId }),
    });
    const deleteFreeJson = await deleteFreeRes.json();

    if (!deleteFreeJson.success) {
      throw new Error(`Fallo al eliminar método sin pedidos: ${JSON.stringify(deleteFreeJson)}`);
    }

    const checkDeleted = await prisma.shippingMethod.findUnique({ where: { id: testMethodId } });
    if (checkDeleted) {
      throw new Error("El método eliminado aún persiste en la base de datos.");
    }
    testMethodId = ""; // Ya eliminado
    console.log("✅ [5/7] Eliminación Permitida: Método sin pedidos fue eliminado permanentemente con éxito");

    // 6. VALIDACIÓN DEL TRACKING AL DESPACHAR Y ENLACE DE RASTREO
    const { PATCH: updateOrderStatusApi } = await import(
      "../app/api/admin/orders/[id]/status/route"
    );

    // Mover a PAGADO y luego PREPARANDO para poder despachar
    await prisma.order.update({
      where: { id: testOrderId },
      data: { status: OrderStatus.PREPARANDO },
    });

    // Despachar con datos de transportista y guía
    const shipReq = new NextRequest(
      `http://localhost:3000/api/admin/orders/${testOrderId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus: OrderStatus.ENVIADO,
          carrierName: "Metro Pac Express",
          trackingNumber: "MP-RD-990011",
          trackingUrl: "https://metropac.do/rastreo?guia=MP-RD-990011",
          notes: "Paquete entregado a estación central.",
        }),
      }
    );
    const shipRes = await updateOrderStatusApi(shipReq, {
      params: Promise.resolve({ id: testOrderId }),
    });
    const shipJson = await shipRes.json();

    if (!shipJson.success || shipJson.data.status !== OrderStatus.ENVIADO) {
      throw new Error(`Fallo al despachar orden: ${JSON.stringify(shipJson)}`);
    }
    console.log("✅ [6/7] Registro de Tracking: Despacho completado con Metro Pac Express / Guía MP-RD-990011");

    // 7. CONSULTA PÚBLICA DE ESTADO Y TRACKING (/api/orders/[orderNumber])
    const publicTrackReq = new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}`);
    const publicTrackRes = await publicTrackingApi(publicTrackReq, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    const publicTrackJson = await publicTrackRes.json();

    if (!publicTrackJson.success) {
      throw new Error(`Fallo en consulta pública de tracking: ${JSON.stringify(publicTrackJson)}`);
    }

    const trackData = publicTrackJson.data;
    if (
      trackData.orderNumber !== testOrderNumber ||
      trackData.status !== OrderStatus.ENVIADO ||
      trackData.carrierName !== "Metro Pac Express" ||
      trackData.trackingNumber !== "MP-RD-990011" ||
      !trackData.trackingUrl
    ) {
      throw new Error(`Datos de tracking incompletos o incorrectos: ${JSON.stringify(trackData)}`);
    }

    // Consulta de orden inexistente arroja 404
    const fakeTrackReq = new NextRequest("http://localhost:3000/api/orders/TK-INEXISTENTE-999");
    const fakeTrackRes = await publicTrackingApi(fakeTrackReq, {
      params: Promise.resolve({ orderNumber: "TK-INEXISTENTE-999" }),
    });
    if (fakeTrackRes.status !== 404) {
      throw new Error("La consulta de un pedido inexistente debió responder 404.");
    }
    console.log("✅ [7/7] Portal Público de Tracking: Estado en vivo, transportista, guía y URL verificados");

    console.log("\n========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE ENVÍOS Y TRACKING SUPERADAS");
    console.log("========================================================\n");
  } catch (error) {
    console.error("\n❌ ERROR EN PRUEBAS DE ENVÍOS:", error);
    process.exit(1);
  } finally {
    // Limpieza de datos de prueba
    if (testOrderId) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: testOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: testOrderId } }).catch(() => {});
    }
    if (linkedMethodId) {
      await prisma.shippingMethod.delete({ where: { id: linkedMethodId } }).catch(() => {});
    }
    if (testMethodId) {
      await prisma.shippingMethod.delete({ where: { id: testMethodId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runShippingTests();
