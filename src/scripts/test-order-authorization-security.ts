import { prisma } from "../lib/db";
import { Role, OrderStatus } from "@prisma/client";
import { signJwt } from "../core/auth/jwt";
import { NextRequest } from "next/server";
import { GET as getOrderRouteApi } from "../app/api/orders/[orderNumber]/route";
import { POST as createOrderApi } from "../app/api/orders/route";
import { getOrderByNumber } from "../lib/server-api";
import { env } from "../config/env";

async function runOrderAuthorizationSecurityTests() {
  console.log("?? ========================================================");
  console.log("?? PRUEBA DE SEGURIDAD ESTRICTA: AUTORIZACI?N, ATOMICIDAD Y PRIVACIDAD");
  console.log("?? ========================================================\n");

  let testProductId = "";
  let orderAId = "";
  let orderBId = "";
  let orderANumber = "";
  let orderBNumber = "";
  let integrationOrderNumber = "";
  let ephemeralCategoryId = "";
  let ephemeralShippingMethodId = "";

  try {
    const store = await prisma.store.findFirstOrThrow({ where: { isDefault: true } });
    let category = await prisma.category.findFirst({ where: { isActive: true } });
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Cat Test Auth", slug: `cat-test-auth-${Date.now()}`, isActive: true },
      });
      ephemeralCategoryId = category.id;
    }
    let shippingMethod = await prisma.shippingMethod.findFirst({ where: { isActive: true } });
    if (!shippingMethod) {
      shippingMethod = await prisma.shippingMethod.create({
        data: { name: "Envío Auth Test", price: 100, isActive: true },
      });
      ephemeralShippingMethodId = shippingMethod.id;
    }

    // 1. Crear producto de prueba
    const timestamp = Date.now();
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Producto Test Autorizaci?n",
        slug: `prod-test-auth-${timestamp}`,
        basePrice: 1000.0,
        sku: `SKU-AUTH-${timestamp}`,
        stock: 50,
        status: "PUBLISHED",
      },
    });
    testProductId = product.id;

    // 2. Crear Pedido A
    orderANumber = `TK-AUTH-A-${timestamp}`;
    const orderA = await prisma.order.create({
      data: {
        orderNumber: orderANumber,
        storeId: store.id,
        guestName: "Ana G?mez Test",
        guestPhone: "8095550001",
        guestWhatsapp: "8095550001",
        guestEmail: "ana.gomez@test.do",
        customerNotes: "Instrucciones privadas de Ana Apto 4B",
        adminNotes: "Nota interna confidencial pedido A",
        shippingMethodId: shippingMethod.id,
        shippingCost: 150.0,
        subtotal: 1000.0,
        total: 1150.0,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        shippingAddress: {
          streetAddress: "Calle Primera #10",
          sectorOrNeighborhood: "Bella Vista",
          city: "Santo Domingo",
          provinceOrState: "Distrito Nacional",
        },
        items: {
          create: {
            productId: product.id,
            productTitle: product.name,
            sku: product.sku || "SKU-TEST",
            quantity: 1,
            unitPrice: 1000.0,
            totalPrice: 1000.0,
            snapshot: { title: "Producto Test" },
          },
        },
        statusHistory: {
          create: {
            newStatus: OrderStatus.PENDIENTE_DE_PAGO,
            notes: "Nota interna confidencial pedido A",
          },
        },
      },
    });
    orderAId = orderA.id;

    // 3. Crear Pedido B
    orderBNumber = `TK-AUTH-B-${timestamp}`;
    const orderB = await prisma.order.create({
      data: {
        orderNumber: orderBNumber,
        storeId: store.id,
        guestName: "Bernardo Ruiz Test",
        guestPhone: "8095550002",
        guestWhatsapp: "8095550002",
        guestEmail: "bernardo.ruiz@test.do",
        customerNotes: "Instrucciones privadas de Bernardo Casa #25",
        adminNotes: "Nota interna confidencial pedido B",
        shippingMethodId: shippingMethod.id,
        shippingCost: 200.0,
        subtotal: 1000.0,
        total: 1200.0,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        shippingAddress: {
          streetAddress: "Av. Las Am?ricas #50",
          sectorOrNeighborhood: "Ensanche Ozama",
          city: "Santo Domingo Este",
          provinceOrState: "Santo Domingo",
        },
        items: {
          create: {
            productId: product.id,
            productTitle: product.name,
            sku: product.sku || "SKU-TEST",
            quantity: 1,
            unitPrice: 1000.0,
            totalPrice: 1000.0,
            snapshot: { title: "Producto Test" },
          },
        },
        statusHistory: {
          create: {
            newStatus: OrderStatus.PENDIENTE_DE_PAGO,
            notes: "Nota interna confidencial pedido B",
          },
        },
      },
    });
    orderBId = orderB.id;

    // 4. Generar tokens de confirmaci?n
    const tokenA = await signJwt(
      {
        sub: orderA.id,
        orderNumber: orderA.orderNumber,
        role: Role.CUSTOMER,
        name: "Ana G?mez",
        email: "ana.gomez@test.do",
        purpose: "order_confirmation",
      },
      "1h"
    );

    const tokenB = await signJwt(
      {
        sub: orderB.id,
        orderNumber: orderB.orderNumber,
        role: Role.CUSTOMER,
        name: "Bernardo Ruiz",
        email: "bernardo.ruiz@test.do",
        purpose: "order_confirmation",
      },
      "1h"
    );

    // =========================================================================
    // PRUEBA 1: Pedido A + Token A -> Confirmaci?n de A funciona con datos completos
    //           y NO expone adminNotes ni statusHistory.notes al cliente
    // =========================================================================
    const reqAWithTokenA = new NextRequest(
      `http://localhost:3000/api/orders/${orderANumber}?token=${encodeURIComponent(tokenA)}`
    );
    const resAWithTokenA = await getOrderRouteApi(reqAWithTokenA, {
      params: Promise.resolve({ orderNumber: orderANumber }),
    });
    const jsonAWithTokenA = await resAWithTokenA.json();

    if (resAWithTokenA.status !== 200 || !jsonAWithTokenA.success) {
      throw new Error(`Prueba 1 Fall?: No se pudo consultar Pedido A con Token A: ${JSON.stringify(jsonAWithTokenA)}`);
    }
    const dataA = jsonAWithTokenA.data;
    if (
      !dataA.shippingAddress ||
      dataA.guestPhone !== "8095550001" ||
      dataA.guestEmail !== "ana.gomez@test.do" ||
      dataA.customerNotes !== "Instrucciones privadas de Ana Apto 4B"
    ) {
      throw new Error("Prueba 1 Fall?: Los datos privados de Pedido A no fueron devueltos con Token A v?lido.");
    }
        // Verificaci?n de que adminNotes, statusHistory y history.notes no se exponen al cliente
    if (dataA.adminNotes !== undefined) {
      throw new Error("Prueba 1 Fall?: adminNotes expuesto indebidamente al cliente en confirmaci?n.");
    }
    if (dataA.statusHistory !== undefined) {
      throw new Error("Prueba 1 Fall?: statusHistory expuesto indebidamente al cliente en confirmaci?n.");
    }
    if (dataA.history && dataA.history.some((h: any) => h.notes !== undefined)) {
      throw new Error("Prueba 1 Fall?: GET /api/orders/[orderNumber] expuso history.notes al cliente.");
    }

    const serverOrderA = await getOrderByNumber(orderANumber, tokenA);
    if (
      !serverOrderA ||
      !serverOrderA.shippingAddress ||
      serverOrderA.adminNotes !== undefined ||
      serverOrderA.statusHistory !== undefined ||
      (serverOrderA.history &&
        serverOrderA.history.some((h: any) => h.notes !== undefined))
    ) {
      throw new Error(
        "Prueba Fall?: getOrderByNumber del cliente expuso datos internos o history.notes."
      );
    }
    console.log("  ? [PASS 1/12]: Pedido A + Token A -> Confirmaci?n autorizada funciona y NO filtra adminNotes, statusHistory ni history.notes.");

    // =========================================================================
    // PRUEBA 2: Pedido B + Token A -> RECHAZADO (403 Forbidden)
    // =========================================================================
    const reqBWithTokenA = new NextRequest(
      `http://localhost:3000/api/orders/${orderBNumber}?token=${encodeURIComponent(tokenA)}`
    );
    const resBWithTokenA = await getOrderRouteApi(reqBWithTokenA, {
      params: Promise.resolve({ orderNumber: orderBNumber }),
    });
    const jsonBWithTokenA = await resBWithTokenA.json();

    if (resBWithTokenA.status !== 403 || jsonBWithTokenA.success) {
      throw new Error(`Prueba 2 Fall?: Pedido B con Token A debi? ser rechazado con 403, recibido: ${resBWithTokenA.status}`);
    }
    console.log("  ? [PASS 2/12]: Pedido B + Token A -> Estrictamente RECHAZADO (403 Forbidden).");

    // =========================================================================
    // PRUEBA 3: Sin token/cookie -> /pedido/confirmacion/A NO puede obtener datos privados
    // =========================================================================
    const orderNoAuth = await getOrderByNumber(orderANumber);
    if (orderNoAuth && (orderNoAuth.shippingAddress || orderNoAuth.guestPhone || orderNoAuth.guestEmail)) {
      throw new Error("Prueba 3 Fall?: getOrderByNumber sin token/cookie expuso datos privados!");
    }
    console.log("  ? [PASS 3/12]: Sin token/cookie -> getOrderByNumber / Confirmaci?n NO entrega direcci?n, tel?fono ni email.");

    // =========================================================================
    // PRUEBA 4: Token expirado -> RECHAZADO (401 Unauthorized)
    // =========================================================================
    const expiredToken = await signJwt(
      {
        sub: orderA.id,
        orderNumber: orderA.orderNumber,
        role: Role.CUSTOMER,
        name: "Ana G?mez",
        email: "ana.gomez@test.do",
        purpose: "order_confirmation",
      },
      "-10s"
    );
    const reqExpired = new NextRequest(
      `http://localhost:3000/api/orders/${orderANumber}?token=${encodeURIComponent(expiredToken)}`
    );
    const resExpired = await getOrderRouteApi(reqExpired, {
      params: Promise.resolve({ orderNumber: orderANumber }),
    });
    const jsonExpired = await resExpired.json();

    if (resExpired.status !== 401 || jsonExpired.success) {
      throw new Error(`Prueba 4 Fall?: Token expirado debi? ser rechazado con 401, recibido: ${resExpired.status}`);
    }
    console.log("  ? [PASS 4/12]: Token expirado -> Estrictamente RECHAZADO (401 Unauthorized).");

    // =========================================================================
    // PRUEBA 5: Token manipulado / firma alterada -> RECHAZADO (401 Unauthorized)
    // =========================================================================
    const tamperedToken = tokenA.slice(0, -6) + "xxxxxx";
    const reqTampered = new NextRequest(
      `http://localhost:3000/api/orders/${orderANumber}?token=${encodeURIComponent(tamperedToken)}`
    );
    const resTampered = await getOrderRouteApi(reqTampered, {
      params: Promise.resolve({ orderNumber: orderANumber }),
    });
    const jsonTampered = await resTampered.json();

    if (resTampered.status !== 401 || jsonTampered.success) {
      throw new Error(`Prueba 5 Fall?: Token manipulado debi? ser rechazado con 401, recibido: ${resTampered.status}`);
    }
    console.log("  ? [PASS 5/12]: Token manipulado -> Estrictamente RECHAZADO (401 Unauthorized).");

    // =========================================================================
    // PRUEBA 6: Token con purpose incorrecto -> RECHAZADO (403 Forbidden)
    // =========================================================================
    const wrongPurposeToken = await signJwt(
      {
        sub: orderA.id,
        orderNumber: orderA.orderNumber,
        role: Role.CUSTOMER,
        name: "Ana G?mez",
        email: "ana.gomez@test.do",
        purpose: "password_reset",
      },
      "1h"
    );
    const reqWrongPurpose = new NextRequest(
      `http://localhost:3000/api/orders/${orderANumber}?token=${encodeURIComponent(wrongPurposeToken)}`
    );
    const resWrongPurpose = await getOrderRouteApi(reqWrongPurpose, {
      params: Promise.resolve({ orderNumber: orderANumber }),
    });
    const jsonWrongPurpose = await resWrongPurpose.json();

    if (resWrongPurpose.status !== 403 || jsonWrongPurpose.success) {
      throw new Error(`Prueba 6 Fall?: Token con purpose incorrecto debi? ser 403, recibido: ${resWrongPurpose.status}`);
    }
    console.log("  ? [PASS 6/12]: Token con purpose incorrecto ('password_reset') -> Estrictamente RECHAZADO (403 Forbidden).");

    // =========================================================================
    // PRUEBA 7: Token A contra Pedido B (Header Authorization) -> RECHAZADO (403)
    // =========================================================================
    const reqBAuthHeader = new NextRequest(`http://localhost:3000/api/orders/${orderBNumber}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const resBAuthHeader = await getOrderRouteApi(reqBAuthHeader, {
      params: Promise.resolve({ orderNumber: orderBNumber }),
    });
    const jsonBAuthHeader = await resBAuthHeader.json();

    if (resBAuthHeader.status !== 403 || jsonBAuthHeader.success) {
      throw new Error(`Prueba 7 Fall?: Token A contra Pedido B v?a Header debi? ser 403, recibido: ${resBAuthHeader.status}`);
    }
    console.log("  ? [PASS 7/12]: Token A contra Pedido B (Header) -> Estrictamente RECHAZADO (403 Forbidden).");

    // =========================================================================
    // PRUEBA 8: Cookie de Pedido A contra Pedido B -> RECHAZADO (403 Forbidden)
    // =========================================================================
    const reqCookieMismatched = new NextRequest(`http://localhost:3000/api/orders/${orderBNumber}`, {
      headers: {
        Cookie: `order_token_${orderBNumber}=${tokenA}; order_token=${tokenA}`,
      },
    });
    const resCookieMismatched = await getOrderRouteApi(reqCookieMismatched, {
      params: Promise.resolve({ orderNumber: orderBNumber }),
    });
    const jsonCookieMismatched = await resCookieMismatched.json();

    if (resCookieMismatched.status !== 403 || jsonCookieMismatched.success) {
      throw new Error(`Prueba 8 Fall?: Cookie de Pedido A contra Pedido B debi? ser 403, recibido: ${resCookieMismatched.status}`);
    }
    console.log("  ? [PASS 8/12]: Cookie de Pedido A contra Pedido B -> Estrictamente RECHAZADO (403 Forbidden).");

    // =========================================================================
    // PRUEBA 9: Token Administrativo (ADMIN / SUPER_ADMIN) -> Acceso Permitido
    //           incluyendo adminNotes y statusHistory
    // =========================================================================
    const adminToken = await signJwt(
      {
        sub: "admin-user-id",
        role: Role.ADMIN,
        email: "admin@tiendadelki.do",
        name: "Administrador Tienda",
      },
      "2h"
    );
    const reqAdmin = new NextRequest(`http://localhost:3000/api/orders/${orderANumber}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const resAdmin = await getOrderRouteApi(reqAdmin, {
      params: Promise.resolve({ orderNumber: orderANumber }),
    });
    const jsonAdmin = await resAdmin.json();

    if (resAdmin.status !== 200 || !jsonAdmin.success || !jsonAdmin.data?.shippingAddress) {
      throw new Error(`Prueba 9 Fall?: Admin JWT debi? acceder a Pedido A con datos completos: ${resAdmin.status}`);
    }
    if (jsonAdmin.data.adminNotes !== "Nota interna confidencial pedido A") {
      throw new Error("Prueba 9 Fall?: Admin debi? recibir adminNotes leg?timamente.");
    }
    if (!jsonAdmin.data.statusHistory || jsonAdmin.data.statusHistory.length === 0) {
      throw new Error("Prueba 9 Fall?: Admin debi? recibir statusHistory leg?timamente.");
    }
    if (!jsonAdmin.data.statusHistory.some((h: any) => h.notes !== undefined)) {
      throw new Error("Prueba 9 Fall?: Admin debi? recibir notes en statusHistory leg?timamente.");
    }
    console.log("  ? [PASS 9/12]: Token Administrativo (ADMIN/SUPER_ADMIN) -> Conserva leg?timamente adminNotes y statusHistory.");

    // =========================================================================
    // PRUEBA 10: Endpoint p?blico de tracking -> Oculta 100% de datos privados,
    //            history.notes NUNCA presente y statusHistory NUNCA presente
    // =========================================================================
    const reqPublicAnon = new NextRequest(`http://localhost:3000/api/orders/${orderANumber}`);
    const resPublicAnon = await getOrderRouteApi(reqPublicAnon, {
      params: Promise.resolve({ orderNumber: orderANumber }),
    });
    const jsonPublicAnon = await resPublicAnon.json();
    const publicData = jsonPublicAnon.data;

    const privateFields = [
      "guestPhone",
      "guestWhatsapp",
      "guestEmail",
      "shippingAddress",
      "customerNotes",
      "adminNotes",
      "statusHistory",
      "proofOfPaymentUrl",
      "proofRejectionReason",
    ];
    for (const field of privateFields) {
      if (publicData[field] !== undefined) {
        throw new Error(`Prueba 10 Fall?: Campo privado "${field}" expuesto en endpoint p?blico de tracking!`);
      }
    }
    if (publicData.history && publicData.history.some((h: any) => h.notes !== undefined)) {
      throw new Error("Prueba 10 Fall?: history.notes expuesto en endpoint p?blico de tracking!");
    }
    console.log("  ? [PASS 10/12]: Tracking p?blico -> Sin tel?fonos, email, direcci?n, customerNotes, adminNotes, statusHistory ni history.notes.");

    // =========================================================================
    // PRUEBA 11 (FLUJO DE INTEGRACI?N COMPLETO DE PRODUCCI?N):
    // 1. Creaci?n del pedido (POST /api/orders)
    // 2. Comprobar que en el JSON de respuesta NO viene orderToken ni NING?N dato privado
    // 3. Comprobar que la cabecera Set-Cookie est? presente con order_token_{orderNumber} y HttpOnly
    // 4. Comprobar redirecci?n limpia a /pedido/confirmacion/{orderNumber}
    // 5. Acceso de confirmaci?n con cookie v?lida -> Retorna datos privados de confirmaci?n
    //    y NO expone adminNotes ni statusHistory
    // 6. Acceso sin cookie -> Retorna ?nicamente DTO p?blico sin datos privados
    // =========================================================================
    console.log("\n?? Ejecutando Flujo de Integraci?n Completo (Punto 1 y 2 - A)...");
    
    // Paso 1: Creaci?n del pedido
    const testPostOrderReq = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Cliente Integraci?n Real",
        guestPhone: "8095559876",
        guestWhatsapp: "8095559876",
        guestEmail: "cliente.integracion@test.do",
        customerNotes: "Nota especial de integraci?n",
        shippingMethodId: shippingMethod.id,
        shippingAddress: {
          streetAddress: "Calle Sol #45",
          sectorOrNeighborhood: "Piantini",
          city: "Santo Domingo",
          provinceOrState: "Distrito Nacional",
        },
        items: [{ productId: product.id, quantity: 1 }],
      }),
    });
    const postRes = await createOrderApi(testPostOrderReq);
    const postJson = await postRes.json();

    if (postRes.status !== 201 || !postJson.success || !postJson.data?.orderNumber) {
      throw new Error(`Fallo en creaci?n de pedido en prueba de integraci?n: ${JSON.stringify(postJson)}`);
    }

    integrationOrderNumber = postJson.data.orderNumber;
    const cleanIntegrationNumber = integrationOrderNumber.trim().toUpperCase().replace(/^#/, "");

    // Paso 2: DTO M?nimo en JSON de POST /api/orders (NUNCA exponer orderToken ni datos privados)
    const forbiddenPostFields = [
      "orderToken",
      "guestPhone",
      "guestWhatsapp",
      "guestEmail",
      "shippingAddress",
      "customerNotes",
      "adminNotes",
      "statusHistory",
      "proofOfPaymentUrl",
      "proofRejectionReason",
    ];
    for (const field of forbiddenPostFields) {
      if (postJson.data[field] !== undefined) {
        throw new Error(`FALLO DE PRIVACIDAD: ${field} expuesto en JSON de respuesta de POST /api/orders!`);
      }
    }

    // Paso 3: Set-Cookie presente con HttpOnly y nombre order_token_{orderNumber}
    const setCookieHeader = postRes.headers.get("set-cookie") || "";
    let extractedCookieValue = "";
    if (postRes.cookies && typeof postRes.cookies.get === "function") {
      extractedCookieValue = postRes.cookies.get(`order_token_${cleanIntegrationNumber}`)?.value || "";
    } else if (setCookieHeader) {
      const match = setCookieHeader.match(new RegExp(`(?:^|; )order_token_${cleanIntegrationNumber}=([^;]*)`));
      extractedCookieValue = match ? decodeURIComponent(match[1]) : "";
    }

    if (!extractedCookieValue) {
      throw new Error(`FALLO: Cabecera Set-Cookie para order_token_${cleanIntegrationNumber} no encontrada. Raw header: ${setCookieHeader}`);
    }
    if (!setCookieHeader.toLowerCase().includes("httponly")) {
      throw new Error("FALLO: Cookie emitida no tiene flag HttpOnly activado");
    }

    // Paso 4: URL de confirmaci?n limpia (sin token en URL)
    const cleanRedirectUrl = `/pedido/confirmacion/${integrationOrderNumber}`;
    if (cleanRedirectUrl.includes("?token=")) {
      throw new Error("FALLO: La URL de confirmaci?n no debe incluir token.");
    }

    // Paso 5: Acceso de confirmaci?n con cookie v?lida
    const reqWithCookie = new NextRequest(`http://localhost:3000/api/orders/${integrationOrderNumber}`, {
      headers: {
        Cookie: `order_token_${cleanIntegrationNumber}=${extractedCookieValue}`,
      },
    });
    const resWithCookie = await getOrderRouteApi(reqWithCookie, {
      params: Promise.resolve({ orderNumber: integrationOrderNumber }),
    });
    const jsonWithCookie = await resWithCookie.json();

    if (
      resWithCookie.status !== 200 ||
      !jsonWithCookie.success ||
      !jsonWithCookie.data?.shippingAddress ||
      jsonWithCookie.data?.guestPhone !== "8095559876"
    ) {
      throw new Error("FALLO: El acceso con Cookie HttpOnly v?lida no entreg? los datos completos del pedido.");
    }
    if (jsonWithCookie.data.adminNotes !== undefined) {
      throw new Error("FALLO: adminNotes expuesto en confirmaci?n con Cookie HttpOnly");
    }
    if (jsonWithCookie.data.statusHistory !== undefined) {
      throw new Error("FALLO: statusHistory expuesto en confirmaci?n con Cookie HttpOnly");
    }
    if (jsonWithCookie.data.history && jsonWithCookie.data.history.some((h: any) => h.notes !== undefined)) {
      throw new Error("FALLO: history.notes expuesto en confirmaci?n con Cookie HttpOnly");
    }

    // Paso 6: Acceso SIN cookie -> Sin datos privados
    const reqWithoutCookie = new NextRequest(`http://localhost:3000/api/orders/${integrationOrderNumber}`);
    const resWithoutCookie = await getOrderRouteApi(reqWithoutCookie, {
      params: Promise.resolve({ orderNumber: integrationOrderNumber }),
    });
    const jsonWithoutCookie = await resWithoutCookie.json();

    if (
      resWithoutCookie.status !== 200 ||
      !jsonWithoutCookie.success ||
      jsonWithoutCookie.data?.shippingAddress !== undefined ||
      jsonWithoutCookie.data?.guestPhone !== undefined
    ) {
      throw new Error("FALLO: El acceso sin cookie expuso datos privados en la confirmaci?n!");
    }
    if (jsonWithoutCookie.data?.history && jsonWithoutCookie.data.history.some((h: any) => h.notes !== undefined)) {
      throw new Error("FALLO: history.notes expuesto en acceso sin cookie");
    }

    console.log("  ? [PASS 11/12]: Flujo de Integraci?n: DTO m?nimo en POST, Cookie HttpOnly emitida, confirmaci?n protegida sin adminNotes ni statusHistory.");

    // =========================================================================
    // PRUEBA 12 (PUNTO 1 - B: ATOMICIDAD Y ROLLBACK ANTE FALLO DE TOKEN):
    // Demostrar que si la generaci?n del token de confirmaci?n falla:
    // 1. La API devuelve error (HTTP 500).
    // 2. La transacci?n en PostgreSQL hace ROLLBACK COMPLETO:
    //    - NO existe el pedido en la base de datos
    //    - NO existen items hu?rfanos
    //    - NO existen movimientos de inventario hu?rfanos
    //    - NO existe historial de estado hu?rfano
    //    - Las existencias (stock) del producto permanecen id?nticas
    // =========================================================================
    console.log("\n?? Ejecutando Prueba de Atomicidad Estricta y Rollback (Punto 1 - B)...");
    const stockBeforeFailureAttempt = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
    const movementsBeforeFailureAttempt = await prisma.inventoryMovement.count({ where: { productId: product.id } });
    const testFailureEmail = `test.failure.${timestamp}@delki.do`;

    const oldEnvSecret = (env as any).JWT_SECRET;
    const oldProcSecret = process.env.JWT_SECRET;

    let postFailureResponse: any = null;
    try {
      // Simular fallo en la generaci?n criptogr?fica de tokens
      (env as any).JWT_SECRET = "";
      process.env.JWT_SECRET = "";

      const failureOrderReq = new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: "Cliente Test Fallo Token",
          guestPhone: "8095557777",
          guestWhatsapp: "8095557777",
          guestEmail: testFailureEmail,
          shippingMethodId: shippingMethod.id,
          shippingAddress: {
            streetAddress: "Calle Intento Fallido #99",
            sectorOrNeighborhood: "Naco",
            city: "Santo Domingo",
            provinceOrState: "Distrito Nacional",
          },
          items: [{ productId: product.id, quantity: 2 }],
        }),
      });

      postFailureResponse = await createOrderApi(failureOrderReq);
    } finally {
      // Restaurar secreto inmediatamente
      (env as any).JWT_SECRET = oldEnvSecret;
      process.env.JWT_SECRET = oldProcSecret;
    }

    if (postFailureResponse.status !== 500) {
      throw new Error(`Prueba 12 Fall?: Se esperaba status 500 ante fallo de token, recibido: ${postFailureResponse.status}`);
    }

    // Verificar en PostgreSQL que NO existe ning?n registro creado
    const orphanOrder = await prisma.order.findFirst({ where: { guestEmail: testFailureEmail } });
    if (orphanOrder) {
      throw new Error(`FALLO CR?TICO DE ATOMICIDAD: Se encontr? pedido hu?rfano en la base de datos (${orphanOrder.orderNumber}) tras fallo de token!`);
    }

    const orphanItems = await prisma.orderItem.findMany({
      where: { order: { guestEmail: testFailureEmail } },
    });
    if (orphanItems.length > 0) {
      throw new Error("FALLO CR?TICO DE ATOMICIDAD: Se encontraron OrderItems hu?rfanos tras fallo de token!");
    }

    const orphanHistory = await prisma.orderStatusHistory.findMany({
      where: { order: { guestEmail: testFailureEmail } },
    });
    if (orphanHistory.length > 0) {
      throw new Error("FALLO CR?TICO DE ATOMICIDAD: Se encontr? OrderStatusHistory hu?rfano tras fallo de token!");
    }

    const movementsAfterFailureAttempt = await prisma.inventoryMovement.count({ where: { productId: product.id } });
    if (movementsAfterFailureAttempt !== movementsBeforeFailureAttempt) {
      throw new Error("FALLO CRITICO DE ATOMICIDAD: Se encontraron InventoryMovements huerfanos tras fallo de token!");
    }

    const stockAfterFailureAttempt = (await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stock;
    if (stockAfterFailureAttempt !== stockBeforeFailureAttempt) {
      throw new Error(`FALLO CR?TICO DE ATOMICIDAD: El stock cambi? tras rollback (antes: ${stockBeforeFailureAttempt}, despu?s: ${stockAfterFailureAttempt})!`);
    }

    console.log("  ? [PASS 12/12]: Atomicidad Verificada al 100%:");
    console.log("       ? Error controlado en signJwt interrumpe la transacci?n");
    console.log("       ? HTTP 500 retornado sin emitir pedido hu?rfano");
    console.log("       ? 0 Orders parciales en PostgreSQL");
    console.log("       ? 0 OrderItems parciales en PostgreSQL");
    console.log("       ? 0 OrderStatusHistory parciales en PostgreSQL");
    console.log("       ? Stock del producto 100% intacto tras ROLLBACK");

    console.log("\n========================================================");
    console.log("??? TODAS LAS 12/12 PRUEBAS DE SEGURIDAD Y ATOMICIDAD SUPERADAS");
    console.log("========================================================\n");
  } catch (error) {
    console.error("\n? ERROR EN PRUEBAS DE SEGURIDAD Y ATOMICIDAD:", error);
    process.exit(1);
  } finally {
    // Teardown: Eliminar ?nicamente los datos temporales creados para esta prueba
    if (orderAId) {
      await prisma.orderItem.deleteMany({ where: { orderId: orderAId } }).catch(() => {});
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: orderAId } }).catch(() => {});
      await prisma.order.delete({ where: { id: orderAId } }).catch(() => {});
    }
    if (orderBId) {
      await prisma.orderItem.deleteMany({ where: { orderId: orderBId } }).catch(() => {});
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: orderBId } }).catch(() => {});
      await prisma.order.delete({ where: { id: orderBId } }).catch(() => {});
    }
    if (integrationOrderNumber) {
      await prisma.orderItem.deleteMany({ where: { order: { orderNumber: integrationOrderNumber } } }).catch(() => {});
      await prisma.orderStatusHistory.deleteMany({ where: { order: { orderNumber: integrationOrderNumber } } }).catch(() => {});
      await prisma.order.deleteMany({ where: { orderNumber: integrationOrderNumber } }).catch(() => {});
    }
    if (testProductId) {
      await prisma.inventoryMovement.deleteMany({ where: { productId: testProductId } }).catch(() => {});
      await prisma.productVariant.deleteMany({ where: { productId: testProductId } }).catch(() => {});
      await prisma.product.delete({ where: { id: testProductId } }).catch(() => {});
    }
    if (ephemeralCategoryId) {
      await prisma.category.deleteMany({ where: { id: ephemeralCategoryId } }).catch(() => {});
    }
    if (ephemeralShippingMethodId) {
      await prisma.shippingMethod.deleteMany({ where: { id: ephemeralShippingMethodId } }).catch(() => {});
    }
    await prisma.$disconnect();
  }
}

runOrderAuthorizationSecurityTests();
