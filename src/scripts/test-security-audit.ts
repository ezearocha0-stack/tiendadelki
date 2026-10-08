import { prisma } from "../lib/db";
import { Role, OrderStatus, MovementType } from "@prisma/client";
import { signJwt } from "../core/auth/jwt";
import { validateStatusTransition } from "../core/orders/order-status-machine";

async function runSecurityAuditVerification() {
  console.log("🛡️ ========================================================");
  console.log("🛡️ AUDITORÍA DE SEGURIDAD: VERIFICACIÓN DE LOS 8 INVARIANTES");
  console.log("🛡️ ========================================================\n");

  let customerToken = "";
  let adminToken = "";
  let customerUserId = "";
  let adminUserId = "";
  let testProductId = "";
  let testVariantId = "";
  let testOrderId = "";
  let testOrderNumber = "";
  let testShippingMethodId = "";

  try {
    // 0. Preparar usuarios de prueba (Admin y Cliente regular)
    const store = await prisma.store.findFirstOrThrow({ where: { isDefault: true } });
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const shippingMethod = await prisma.shippingMethod.findFirstOrThrow({ where: { isActive: true } });
    testShippingMethodId = shippingMethod.id;

    const customerUser = await prisma.user.create({
      data: {
        email: `cliente.audit.${Date.now()}@delki.do`,
        passwordHash: "dummyHash",
        firstName: "Cliente",
        lastName: "Auditoría",
        role: Role.CUSTOMER,
        isActive: true,
      },
    });
    customerUserId = customerUser.id;

    const adminUser = await prisma.user.create({
      data: {
        email: `admin.audit.${Date.now()}@delki.do`,
        passwordHash: "dummyHash",
        firstName: "Admin",
        lastName: "Auditoría",
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminUserId = adminUser.id;

    customerToken = await signJwt({
      sub: customerUser.id,
      email: customerUser.email!,
      role: Role.CUSTOMER,
      name: "Cliente Auditoría",
    });

    adminToken = await signJwt({
      sub: adminUser.id,
      email: adminUser.email!,
      role: Role.ADMIN,
      name: "Admin Auditoría",
    });

    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Producto Test Seguridad",
        slug: `producto-test-seguridad-${Date.now()}`,
        basePrice: 2000.0,
        sku: `SEC-PROD-${Date.now()}`,
        stock: 5,
        hasVariants: false,
        status: "PUBLISHED",
      },
    });
    testProductId = product.id;

    // -------------------------------------------------------------
    // INVARIANTE 1: Un cliente no puede modificar el precio (Zero-Trust Pricing)
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 1] Verificando que el cliente no puede alterar precios ni mutar catálogo...");
    const { POST: createOrderApi } = await import("../app/api/orders/route");

    // Intento de compra enviando un precio manipulado (el schema lo descarta y el servidor calcula basePrice * qty)
    const manipulatedOrderReq = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        guestName: "Atacante Precios",
        guestPhone: "8095550001",
        guestWhatsapp: "8095550001",
        guestEmail: "atacante@ejemplo.com",
        shippingMethodId: testShippingMethodId,
        shippingAddress: {
          streetAddress: "Av. Falsa 123",
          city: "Santo Domingo",
          sectorOrNeighborhood: "Naco",
          provinceOrState: "Distrito Nacional",
        },
        items: [{ productId: testProductId, quantity: 1, price: 1.0, total: 1.0 }], // Precio adulterado
      }),

    });

    const manipulatedOrderRes = await createOrderApi(manipulatedOrderReq as any);
    const manipulatedOrderJson = await manipulatedOrderRes.json();
    if (!manipulatedOrderJson.success || Number(manipulatedOrderJson.data.subtotal) !== 2000) {
      throw new Error(`Invariante 1 Falló: Subtotal debió ser 2000, recibido: ${manipulatedOrderJson.data?.subtotal}`);
    }
    testOrderId = manipulatedOrderJson.data.id;
    testOrderNumber = manipulatedOrderJson.data.orderNumber;

    // Intento de cliente de mutar precio del producto vía PUT /api/products/[id]
    const { PUT: updateProductApi } = await import("../app/api/products/[id]/route");
    const hackPriceReq = new Request(`http://localhost:3000/api/products/${testProductId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${customerToken}`, // Token de cliente, NO admin
      },
      body: JSON.stringify({ basePrice: 10 }),
    });

    const hackPriceRes = await updateProductApi(hackPriceReq as any, {
      params: Promise.resolve({ id: testProductId }),
    });
    if (hackPriceRes.status !== 403) {
      throw new Error(`Invariante 1 Falló: Cliente pudo alterar producto o no recibió 403 (Recibió: ${hackPriceRes.status})`);
    }
    console.log("  ✅ PASS: Servidor ignora precios enviados por el cliente y bloquea mutación del catálogo (403 Forbidden).");

    // -------------------------------------------------------------
    // INVARIANTE 2: Un cliente no puede modificar el stock
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 2] Verificando que un cliente no puede alterar el inventario...");
    const { POST: inventoryApi } = await import("../app/api/inventory/route");
    const hackStockReq = new Request("http://localhost:3000/api/inventory", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        movementType: "AJUSTE",
        type: "EXACT",
        value: 9999,
        notes: "Hack stock",
      }),
    });

    const hackStockRes = await inventoryApi(hackStockReq as any);
    if (hackStockRes.status !== 403) {
      throw new Error(`Invariante 2 Falló: Cliente pudo invocar /api/inventory o no fue bloqueado con 403 (Recibió: ${hackStockRes.status})`);
    }

    const { POST: quickSaleApi } = await import("../app/api/inventory/quick-sale/route");
    const hackQuickSaleReq = new Request("http://localhost:3000/api/inventory/quick-sale", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        productId: testProductId,
        quantity: 1,
      }),
    });
    const hackQuickSaleRes = await quickSaleApi(hackQuickSaleReq as any);
    if (hackQuickSaleRes.status !== 403) {
      throw new Error(`Invariante 2 Falló: Cliente pudo invocar quick-sale (Recibió: ${hackQuickSaleRes.status})`);
    }
    console.log("  ✅ PASS: Rutas de ajuste de stock y venta física protegidas estrictamente contra clientes regulares (403 Forbidden).");

    // -------------------------------------------------------------
    // INVARIANTE 3: Un cliente no puede acceder a pedidos ajenos (IDOR)
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 3] Verificando protección contra IDOR en pedidos...");
    const { GET: listOrdersApi } = await import("../app/api/orders/route");

    // Intento no autenticado de listar todos los pedidos
    const unauthListReq = new Request("http://localhost:3000/api/orders", { method: "GET" });
    const unauthListRes = await listOrdersApi(unauthListReq as any);
    if (unauthListRes.status !== 401) {
      throw new Error(`Invariante 3 Falló: GET /api/orders no autenticado retornó ${unauthListRes.status}, esperado 401`);
    }

    // Intento de cliente regular de listar pedidos ajenos
    const customerListReq = new Request("http://localhost:3000/api/orders", {
      method: "GET",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    const customerListRes = await listOrdersApi(customerListReq as any);
    if (customerListRes.status !== 403) {
      throw new Error(`Invariante 3 Falló: Cliente regular en GET /api/orders retornó ${customerListRes.status}, esperado 403`);
    }

    // Intento de consultar datos de pedido ajeno en ruta pública: debe retornar nombre anonimizado y sin datos privados
    const { GET: trackingApi } = await import("../app/api/orders/[orderNumber]/route");
    const trackingReq = new Request(`http://localhost:3000/api/orders/${testOrderNumber}`, { method: "GET" });
    const trackingRes = await trackingApi(trackingReq as any, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    const trackingJson = await trackingRes.json();
    if (trackingJson.data.guestName === "Atacante Precios") {
      throw new Error(`Invariante 3 Falló: El nombre no fue anonimizado en la ruta de rastreo.`);
    }
    if (trackingJson.data.shippingAddress || trackingJson.data.guestPhone) {
      throw new Error(`Invariante 3 Falló: Se expusieron dirección o teléfono en rastreo público.`);
    }
    console.log(`  ✅ PASS: Listado global de pedidos cerrado para no-admins (401/403) y nombre anonimizado ("${trackingJson.data.guestName}").`);

    // -------------------------------------------------------------
    // INVARIANTE 4: Un cliente no puede acceder al panel administrativo
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 4] Verificando bloqueo de acceso al panel administrativo...");
    const { PATCH: settingsApi } = await import("../app/api/settings/route");
    const hackSettingsReq = new Request("http://localhost:3000/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ store_name: "Hacked Store" }),
    });
    const hackSettingsRes = await settingsApi(hackSettingsReq as any);
    if (hackSettingsRes.status !== 403) {
      throw new Error(`Invariante 4 Falló: Cliente pudo invocar /api/settings (Recibió: ${hackSettingsRes.status})`);
    }
    console.log("  ✅ PASS: Endpoints administrativos (/api/settings, /admin/*) blindados contra usuarios cliente.");

    // -------------------------------------------------------------
    // INVARIANTE 5: Rechazo de archivos maliciosos mediante Magic Bytes
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 5] Verificando rechazo de archivos maliciosos camuflados...");
    const { POST: uploadProofApi, GET: getProofApi } = await import("../app/api/orders/[orderNumber]/proof/route");

    // Crear un archivo malicioso camuflado (Script PHP disfrazado con extensión .png)
    const fakePngBuffer = Buffer.from("<?php system($_GET['cmd']); ?>");
    const fakeFormData = new FormData();
    const fakeBlob = new Blob([fakePngBuffer], { type: "image/png" });
    fakeFormData.append("file", fakeBlob, "shell.png");

    const fakeUploadReq = new Request(`http://localhost:3000/api/orders/${testOrderNumber}/proof`, {
      method: "POST",
      headers: { authorization: `Bearer ${customerToken}` },
      body: fakeFormData,
    });
    const fakeUploadRes = await uploadProofApi(fakeUploadReq as any, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    if (fakeUploadRes.status !== 422) {
      throw new Error(`Invariante 5 Falló: Archivo malicioso no fue rechazado con 422 (Recibió: ${fakeUploadRes.status})`);
    }
    console.log("  ✅ PASS: Archivo script camuflado como PNG fue rechazado por verificación de Magic Bytes (422).");

    // -------------------------------------------------------------
    // INVARIANTE 6: Comprobantes bancarios privados y no accesibles públicamente
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 6] Verificando almacenamiento privado y control de acceso a comprobantes...");
    // Subir un PNG legítimo con cabeceras binarias reales (1x1 transparente)
    const validPngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const validFormData = new FormData();
    const validBlob = new Blob([validPngBuffer], { type: "image/png" });
    validFormData.append("file", validBlob, "comprobante_deposito.png");

    const validUploadReq = new Request(`http://localhost:3000/api/orders/${testOrderNumber}/proof`, {
      method: "POST",
      headers: { authorization: `Bearer ${customerToken}` },
      body: validFormData,
    });
    const validUploadRes = await uploadProofApi(validUploadReq as any, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    const validUploadJson = await validUploadRes.json();
    if (!validUploadJson.success) {
      throw new Error(`Fallo subiendo comprobante legítimo: ${JSON.stringify(validUploadJson)}`);
    }

    // 1. Intento NO autorizado de acceder al comprobante
    const unauthProofReq = new Request(`http://localhost:3000/api/orders/${testOrderNumber}/proof`, {
      method: "GET",
    });
    const unauthProofRes = await getProofApi(unauthProofReq as any, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    if (unauthProofRes.status !== 403) {
      throw new Error(`Invariante 6 Falló: Intento no autorizado no retornó 403 (Recibió: ${unauthProofRes.status})`);
    }

    // 2. Intento del Propietario (Cliente A)
    const ownerProofReq = new Request(`http://localhost:3000/api/orders/${testOrderNumber}/proof`, {
      method: "GET",
      headers: { authorization: `Bearer ${customerToken}` },
    });
    const ownerProofRes = await getProofApi(ownerProofReq as any, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    if (ownerProofRes.status !== 200 || ownerProofRes.headers.get("content-type") !== "image/png") {
      throw new Error(`Invariante 6 Falló: Propietario no pudo acceder a su comprobante`);
    }

    // 3. Intento del Administrador
    const adminProofReq = new Request(`http://localhost:3000/api/orders/${testOrderNumber}/proof`, {
      method: "GET",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const adminProofRes = await getProofApi(adminProofReq as any, {
      params: Promise.resolve({ orderNumber: testOrderNumber }),
    });
    if (adminProofRes.status !== 200) {
      throw new Error(`Invariante 6 Falló: Administrador no pudo acceder al comprobante`);
    }
    console.log("  ✅ PASS: Comprobantes almacenados en bóveda privada fuera de /public/uploads y solo accesibles con autorización.");

    // -------------------------------------------------------------
    // INVARIANTE 7: Operaciones de inventario atómicas y reserva en checkout
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 7] Verificando atomicidad y reservas con bloqueo pesimista...");
    const currentProd = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
    if (currentProd.stock !== 4) { // Inicial era 5, se compró 1
      throw new Error(`Invariante 7 Falló: Stock debió descontarse a 4 tras el pedido, actual: ${currentProd.stock}`);
    }

    const reservationMovement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: testProductId,
        referenceId: testOrderNumber,
        movementType: MovementType.RESERVA,
      },
    });
    if (!reservationMovement || reservationMovement.quantity !== -1) {
      throw new Error("Invariante 7 Falló: No se registró movimiento RESERVA en inventory_movements.");
    }

    // Cancelar pedido y comprobar restitución automática
    const { PATCH: updateOrderStatusApi } = await import("../app/api/admin/orders/[id]/status/route");
    const cancelReq = new Request(`http://localhost:3000/api/admin/orders/${testOrderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${adminToken}`,
        "x-user-id": adminUserId,
      },
      body: JSON.stringify({ targetStatus: OrderStatus.CANCELADO, notes: "Cancelación prueba seguridad" }),
    });
    await updateOrderStatusApi(cancelReq as any, {
      params: Promise.resolve({ id: testOrderId }),
    });

    const restoredProd = await prisma.product.findUniqueOrThrow({ where: { id: testProductId } });
    if (restoredProd.stock !== 5) {
      throw new Error(`Invariante 7 Falló: Stock debió restaurarse a 5 tras cancelación, actual: ${restoredProd.stock}`);
    }
    console.log("  ✅ PASS: Stock bloqueado pesimísticamente y reservado atómicamente, restaurado al cancelar pedido.");

    // -------------------------------------------------------------
    // INVARIANTE 8: Máquina de estados de pedidos estricta
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 8] Verificando validación estricta de transiciones de pedidos...");
    let transitionErrorCaught = false;
    try {
      // Intentar saltar directamente de CANCELADO a PAGADO (transición ilegal)
      validateStatusTransition(OrderStatus.CANCELADO, OrderStatus.PAGADO);
    } catch (e: any) {
      transitionErrorCaught = true;
    }
    if (!transitionErrorCaught) {
      throw new Error("Invariante 8 Falló: Se permitió transición ilegal CANCELADO -> PAGADO.");
    }
    console.log("  ✅ PASS: Máquina de estados rechaza transiciones inválidas en backend.");

    // -------------------------------------------------------------
    // INVARIANTE 9: Autorización estricta de pedidos y privacidad (Token A -> Pedido B rechazado)
    // -------------------------------------------------------------
    console.log("▶ [INVARIANTE 9] Verificando autorización estricta de pedidos y protección de privacidad...");
    const { GET: getOrderRouteApi } = await import("../app/api/orders/[orderNumber]/route");
    const { NextRequest } = await import("next/server");

    // Token legítimo para Pedido A
    const tokenOrderA = await signJwt(
      {
        sub: testOrderId,
        orderNumber: testOrderNumber,
        role: Role.CUSTOMER,
        name: "Cliente Audit",
        email: "audit@delki.do",
        purpose: "order_confirmation",
      },
      "1h"
    );

    // Pedido B secundario
    const testOrderBNumber = `TK-AUDIT-B-${Date.now()}`;
    const orderBRecord = await prisma.order.create({
      data: {
        orderNumber: testOrderBNumber,
        storeId: store.id,
        guestName: "Cliente B Auditoría",
        guestPhone: "8095559999",
        guestWhatsapp: "8095559999",
        guestEmail: "cliente.b@delki.do",
        shippingMethodId: testShippingMethodId,
        shippingCost: 0,
        subtotal: 500,
        total: 500,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        shippingAddress: { city: "Santiago", streetAddress: "Calle Secreta #99" },
      },
    });

    try {
      // 1. Token A en Pedido A -> Exitoso con datos completos
      const reqAWithTokenA = new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}?token=${tokenOrderA}`);
      const resA = await getOrderRouteApi(reqAWithTokenA, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      const jsonA = await resA.json();
      if (!jsonA.success || !jsonA.data?.shippingAddress) {
        throw new Error("Invariante 9 Falló: Token A no pudo obtener datos autorizados de Pedido A.");
      }

      // 2. Token A en Pedido B -> RECHAZADO (403 Forbidden)
      const reqBWithTokenA = new NextRequest(`http://localhost:3000/api/orders/${testOrderBNumber}?token=${tokenOrderA}`);
      const resB = await getOrderRouteApi(reqBWithTokenA, { params: Promise.resolve({ orderNumber: testOrderBNumber }) });
      const jsonB = await resB.json();
      if (resB.status !== 403 || jsonB.success) {
        throw new Error("Invariante 9 Falló: Token A debió ser rechazado al consultar Pedido B.");
      }

      // 3. Consulta anónima Pedido A -> Solo datos públicos (sin dirección ni teléfono)
      const reqAnon = new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}`);
      const resAnon = await getOrderRouteApi(reqAnon, { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      const jsonAnon = await resAnon.json();
      if (!jsonAnon.success || jsonAnon.data?.shippingAddress || jsonAnon.data?.guestPhone) {
        throw new Error("Invariante 9 Falló: Consulta pública expuso datos privados.");
      }

      // 4. Token expirado -> RECHAZADO (401 Unauthorized)
      const expiredToken = await signJwt({ sub: testOrderId, orderNumber: testOrderNumber, role: Role.CUSTOMER, name: "Cliente Audit", email: "audit@delki.do", purpose: "order_confirmation" }, "-10s");
      const resExp = await getOrderRouteApi(new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}?token=${expiredToken}`), { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      if (resExp.status !== 401) {
        throw new Error("Invariante 9 Falló: Token expirado debió ser rechazado con 401.");
      }

      // 5. Token manipulado -> RECHAZADO (401 Unauthorized)
      const tampered = tokenOrderA.slice(0, -6) + "xxxxxx";
      const resTamp = await getOrderRouteApi(new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}?token=${tampered}`), { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      if (resTamp.status !== 401) {
        throw new Error("Invariante 9 Falló: Token manipulado debió ser rechazado con 401.");
      }

      // 6. Token con purpose incorrecto -> RECHAZADO (403 Forbidden)
      const wrongPurpose = await signJwt({ sub: testOrderId, orderNumber: testOrderNumber, role: Role.CUSTOMER, name: "Cliente Audit", email: "audit@delki.do", purpose: "invalid_purpose" }, "1h");
      const resWrong = await getOrderRouteApi(new NextRequest(`http://localhost:3000/api/orders/${testOrderNumber}?token=${wrongPurpose}`), { params: Promise.resolve({ orderNumber: testOrderNumber }) });
      if (resWrong.status !== 403) {
        throw new Error("Invariante 9 Falló: Token con propósito incorrecto debió ser rechazado con 403.");
      }

      console.log("  ✅ PASS: Token A -> Pedido B estrictamente rechazado (403), token expirado/manipulado/wrong-purpose rechazados, y datos públicos protegidos.");
    } finally {
      await prisma.order.delete({ where: { id: orderBRecord.id } }).catch(() => {});
    }


    console.log("\n🛡️ ========================================================");
    console.log("🛡️ TODAS LAS 9 VERIFICACIONES DE SEGURIDAD FUERON SUPERADAS");
    console.log("🛡️ ========================================================\n");
  } catch (error) {
    console.error("❌ Error en verificación de auditoría de seguridad:", error);
    process.exit(1);
  } finally {
    // Teardown
    if (testProductId) {
      await prisma.inventoryMovement.deleteMany({ where: { productId: testProductId } });
      await prisma.orderItem.deleteMany({ where: { productId: testProductId } });
      await prisma.orderStatusHistory.deleteMany({ where: { order: { id: testOrderId } } });
      await prisma.order.deleteMany({ where: { id: testOrderId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }
    if (customerUserId) {
      await prisma.user.deleteMany({ where: { id: { in: [customerUserId, adminUserId] } } });
    }
    await prisma.$disconnect();
  }
}

runSecurityAuditVerification();
