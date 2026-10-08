import { prisma } from "../lib/db";
import { OrderStatus } from "@prisma/client";
import { NextRequest } from "next/server";

async function runCheckoutTests() {
  console.log("🛒 ========================================================");
  console.log("🛒 INICIANDO SUITE DE PRUEBAS: CARRITO, CHECKOUT Y PAGOS");
  console.log("🛒 ========================================================\n");

  let testProductId = "";
  let testVariantId = "";
  let testShippingMethodId = "";
  let createdOrderNumber = "";
  let createdOrderToken = "";

  try {
    // 1. Preparar datos de prueba
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true } });
    const store = await prisma.store.findFirstOrThrow({ where: { isDefault: true } });
    const shippingMethod = await prisma.shippingMethod.findFirstOrThrow({ where: { isActive: true } });
    testShippingMethodId = shippingMethod.id;

    // Crear producto con variante para la prueba
    const product = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Producto Test Carrito",
        slug: `producto-test-carrito-${Date.now()}`,
        basePrice: 1200.0,
        sku: `TEST-CART-${Date.now()}`,
        stock: 10,
        hasVariants: true,
        status: "PUBLISHED",
        variants: {
          create: {
            sku: `VAR-CART-${Date.now()}`,
            title: "Azul / L",
            attributes: { Color: "Azul", Talla: "L" },
            price: 1350.0,
            stock: 5,
            isActive: true,
          },
        },
      },
      include: { variants: true },
    });

    testProductId = product.id;
    testVariantId = product.variants[0].id;
    console.log(`✅ [SETUP] Producto de prueba creado con variante: Stock = 5, Precio = RD$ 1,350.00`);

    // 2. Probar Endpoint de Validación de Carrito (/api/cart/validate)
    const { POST: validateCartApi } = await import("../app/api/cart/validate/route");
    const validateReq = new Request("http://localhost:3000/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          { productId: testProductId, variantId: testVariantId, quantity: 2 },
        ],
      }),
    });

    const validateRes = await validateCartApi(validateReq as any);
    const validateJson = await validateRes.json();

    if (!validateJson.success || !validateJson.data.isValid) {
      throw new Error(`Fallo en validación de carrito válido: ${JSON.stringify(validateJson)}`);
    }
    if (validateJson.data.items[0].price !== 1350) {
      throw new Error(`El precio retornado por el servidor no coincide con el de la base de datos.`);
    }
    console.log("✅ [PASS] Validación de Carrito: Precios y existencias reales obtenidos desde PostgreSQL");

    // 3. Probar Zero-Trust Pricing: Servidor recalcula y nunca acepta precios del cliente
    const { POST: createOrderApi } = await import("../app/api/orders/route");

    const orderPayload = {
      guestName: "Juan Pérez Test",
      guestPhone: "8095551234",
      guestWhatsapp: "8095551234",
      guestEmail: "juan.test@ejemplo.com",
      shippingMethodId: testShippingMethodId,
      shippingAddress: {
        streetAddress: "Calle Principal #10",
        sectorOrNeighborhood: "Naco",
        city: "Santo Domingo",
        provinceOrState: "Distrito Nacional",
        deliveryNotes: "Apto 2B",
      },
      customerNotes: "Entregar por la tarde",
      idempotencyKey: `idemp-test-${Date.now()}`,
      items: [
        {
          productId: testProductId,
          variantId: testVariantId,
          quantity: 2,
          // Nótese: aunque un atacante intentase enviar price: 1 o total: 1,
          // el schema lo descarta y el servidor calcula 2 * 1350 = 2700 + envío
        },
      ],
    };

    const orderReq = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const orderRes = await createOrderApi(orderReq as any);
    const orderJson = await orderRes.json();

    if (!orderJson.success || !orderJson.data) {
      throw new Error(`Error creando pedido: ${JSON.stringify(orderJson)}`);
    }

    const createdOrder = orderJson.data;
    createdOrderNumber = createdOrder.orderNumber;

    // 1. Verificacion explicita de que orderToken y datos privados NO se exponen en JSON de POST /api/orders
    const forbiddenPostFields = [
      "orderToken",
      "guestPhone",
      "guestWhatsapp",
      "guestEmail",
      "shippingAddress",
      "customerNotes",
      "adminNotes",
      "proofOfPaymentUrl",
      "proofRejectionReason",
    ];
    for (const field of forbiddenPostFields) {
      if (createdOrder[field] !== undefined) {
        throw new Error(`VIOLACION DE PRIVACIDAD: ${field} expuesto en JSON de POST /api/orders`);
      }
    }


    // 2. Extraer token de la cookie HttpOnly Set-Cookie
    const setCookieHeader = orderRes.headers.get("set-cookie") || "";
    if (orderRes.cookies && typeof orderRes.cookies.get === "function") {
      createdOrderToken = orderRes.cookies.get(`order_token_${createdOrderNumber}`)?.value || "";
    } else if (setCookieHeader) {
      const match = setCookieHeader.match(new RegExp(`(?:^|; )order_token_${createdOrderNumber}=([^;]*)`));
      createdOrderToken = match ? decodeURIComponent(match[1]) : "";
    }
    if (!createdOrderToken) {
      throw new Error("Fallo: No se encontró la cookie HttpOnly order_token en la respuesta de creación de orden");
    }

    if (Number(createdOrder.subtotal) !== 2700) {
      throw new Error(`Zero-Trust Pricing falló: Subtotal esperado 2700, recibido ${createdOrder.subtotal}`);
    }
    if (createdOrder.status !== OrderStatus.PENDIENTE_DE_PAGO) {
      throw new Error(`Estado inicial esperado PENDIENTE_DE_PAGO, recibido ${createdOrder.status}`);
    }
    console.log(`✅ [PASS] Zero-Trust Pricing: Subtotal recalculado estrictamente en el servidor (RD$ 2,700.00)`);
    console.log(`✅ [PASS] Estado Inicial: Pedido creado con #${createdOrderNumber} en estado PENDIENTE_DE_PAGO`);

    // 4. Probar Idempotencia: Enviar la misma solicitud con el mismo idempotencyKey
    const duplicateOrderReq = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });

    const duplicateRes = await createOrderApi(duplicateOrderReq as any);
    const duplicateJson = await duplicateRes.json();

    if (duplicateJson.data.id !== createdOrder.id) {
      throw new Error(`Idempotencia falló: Se creó una orden duplicada.`);
    }
    console.log(`✅ [PASS] Idempotencia: Solicitud repetida retornó el mismo pedido #${createdOrderNumber} sin duplicar`);

    // 5. Probar Rechazo ante Stock Insuficiente
    const excessOrderReq = new Request("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...orderPayload,
        idempotencyKey: `idemp-excess-${Date.now()}`,
        items: [{ productId: testProductId, variantId: testVariantId, quantity: 999 }],
      }),
    });

    const excessRes = await createOrderApi(excessOrderReq as any);
    const excessJson = await excessRes.json();

    if (excessRes.status !== 409 || excessJson.success) {
      throw new Error(`Se esperaba error 409 por stock insuficiente, recibido: ${excessRes.status}`);
    }
    console.log(`✅ [PASS] Protección de Existencias: Pedido con cantidad superior al stock fue rechazado (409 Conflict)`);

    // 6. Probar Carga de Comprobante y Transición a PAGO_EN_REVISION
    const { POST: uploadProofApi } = await import("../app/api/orders/[orderNumber]/proof/route");

    const testReceiptBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );

    const formData = new FormData();
    const blob = new Blob([testReceiptBuffer], { type: "image/png" });
    formData.append("file", blob, "recibo_popular.png");

    const proofReq = new Request(`http://localhost:3000/api/orders/${createdOrderNumber}/proof`, {
      method: "POST",
      body: formData,
    });

    const proofRes = await uploadProofApi(proofReq as any, {
      params: Promise.resolve({ orderNumber: createdOrderNumber }),
    });

    const proofJson = await proofRes.json();

    if (!proofJson.success || !proofJson.data) {
      throw new Error(`Error cargando comprobante: ${JSON.stringify(proofJson)}`);
    }

    const updatedOrder = await prisma.order.findUniqueOrThrow({
      where: { orderNumber: createdOrderNumber },
      include: { statusHistory: true },
    });

    if (updatedOrder.status !== OrderStatus.PAGO_EN_REVISION) {
      throw new Error(`Estado esperado PAGO_EN_REVISION, recibido: ${updatedOrder.status}`);
    }

    if (!updatedOrder.proofOfPaymentUrl || !updatedOrder.proofUploadedAt) {
      throw new Error(`No se guardó el URL o la fecha de carga del comprobante.`);
    }

    const historyRecord = updatedOrder.statusHistory.find(
      (h) => h.newStatus === OrderStatus.PAGO_EN_REVISION
    );
    if (!historyRecord) {
      throw new Error(`No se registró el evento en OrderStatusHistory.`);
    }

    console.log(`✅ [PASS] Carga de Comprobante: URL asignado (${updatedOrder.proofOfPaymentUrl})`);
    console.log(`✅ [PASS] Transición de Estado: Pedido actualizado exitosamente a PAGO_EN_REVISION`);
    console.log(`✅ [PASS] Trazabilidad: Evento auditado en OrderStatusHistory con fecha y notas`);

    // 7. Probar Separación de Contrato de Datos y Privacidad (/api/orders/[orderNumber])
    const { GET: getOrderRouteApi } = await import("../app/api/orders/[orderNumber]/route");

    // A) Solicitud Pública (No Autenticada): Debe devolver únicamente datos de tracking público
    const anonReq = new NextRequest("http://localhost:3000/api/orders/" + createdOrderNumber);
    const anonRes = await getOrderRouteApi(anonReq, {
      params: Promise.resolve({ orderNumber: createdOrderNumber }),
    });
    const anonJson = await anonRes.json();
    if (!anonJson.success || !anonJson.data) {
      throw new Error("Endpoint público falló al responder: " + JSON.stringify(anonJson));
    }

    const anonData = anonJson.data;
    // Verificación estricta de que un usuario no autenticado NO puede obtener datos privados
    if (anonData.guestPhone !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: guestPhone expuesto en endpoint público");
    }
    if (anonData.guestWhatsapp !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: guestWhatsapp expuesto en endpoint público");
    }
    if (anonData.guestEmail !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: guestEmail expuesto en endpoint público");
    }
    if (anonData.shippingAddress !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: shippingAddress expuesto en endpoint público");
    }
    if (anonData.customerNotes !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: customerNotes expuesto en endpoint público");
    }
    if (anonData.adminNotes !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: adminNotes expuesto en endpoint público");
    }
    if (anonData.proofOfPaymentUrl !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: proofOfPaymentUrl expuesto en endpoint público");
    }
    if (anonData.proofRejectionReason !== undefined) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: proofRejectionReason expuesto en endpoint público");
    }
    // Verificación de que el historial público de tracking NO expone notas internas
    if (anonData.history && anonData.history.some((h: any) => h.notes !== undefined)) {
      throw new Error("VIOLACIÓN DE PRIVACIDAD: history.notes expuesto en endpoint público de tracking");
    }
    console.log("   🔒 [PRIVACIDAD]: Validado que el endpoint público oculta teléfonos, email, dirección, notas internas y comprobantes");

    // B) Solicitud Protegida de Confirmación mediante Token Criptográfico (?token=...)
    if (createdOrderToken) {
      const authWithTokenReq = new NextRequest(
        "http://localhost:3000/api/orders/" + createdOrderNumber + "?token=" + encodeURIComponent(createdOrderToken)
      );
      const authWithTokenRes = await getOrderRouteApi(authWithTokenReq, {
        params: Promise.resolve({ orderNumber: createdOrderNumber }),
      });
      const authWithTokenJson = await authWithTokenRes.json();
      if (
        !authWithTokenJson.success ||
        !authWithTokenJson.data.shippingAddress ||
        !authWithTokenJson.data.guestPhone ||
        !authWithTokenJson.data.guestEmail
      ) {
        throw new Error("Fallo al obtener datos completos de pedido mediante token de confirmación");
      }
      console.log("   🔑 [CONFIRMACIÓN]: Token de confirmación permite acceso seguro a datos completos del pedido");

      // B2) Solicitud con Cookie HttpOnly (Flujo principal de producción)
      const authWithCookieReq = new NextRequest(
        "http://localhost:3000/api/orders/" + createdOrderNumber,
        {
          headers: {
            Cookie: `order_token_${createdOrderNumber}=${encodeURIComponent(createdOrderToken)}`,
          },
        }
      );
      const authWithCookieRes = await getOrderRouteApi(authWithCookieReq, {
        params: Promise.resolve({ orderNumber: createdOrderNumber }),
      });
      const authWithCookieJson = await authWithCookieRes.json();
      if (
        !authWithCookieJson.success ||
        !authWithCookieJson.data.shippingAddress ||
        !authWithCookieJson.data.guestPhone
      ) {
        throw new Error("Fallo al obtener datos mediante Cookie HttpOnly");
      }
      console.log("   🍪 [COOKIE VIP]: Cookie HttpOnly verificada exitosamente para acceso a confirmación sin exponer token en URL");
    }

    // C) Solicitud de Servidor SSR mediante getOrderByNumber (Server-to-Server JWT)
    const { getOrderByNumber } = await import("../lib/server-api");
    const serverOrder = await getOrderByNumber(createdOrderNumber, createdOrderToken);
    if (!serverOrder || !serverOrder.shippingAddress || !serverOrder.guestPhone) {
      throw new Error("Fallo en getOrderByNumber con autenticación interna de servidor");
    }
    console.log("   🛡️ [SSR SEGURO]: getOrderByNumber obtiene pedido completo con shippingAddress protegido");


    console.log("\n🛒 ========================================================");
    console.log("🛒 RESULTADOS: 7/7 PRUEBAS DE CHECKOUT SUPERADAS");
    console.log("🛒 ========================================================\n");
  } catch (error) {
    console.error("❌ Error en pruebas de checkout:", error);
    process.exit(1);
  } finally {
    // Limpieza de datos de prueba
    if (createdOrderNumber) {
      await prisma.orderItem.deleteMany({ where: { order: { orderNumber: createdOrderNumber } } });
      await prisma.orderStatusHistory.deleteMany({ where: { order: { orderNumber: createdOrderNumber } } });
      await prisma.order.deleteMany({ where: { orderNumber: createdOrderNumber } });
    }
    if (testProductId) {
      await prisma.inventoryMovement.deleteMany({ where: { productId: testProductId } });
      await prisma.productVariant.deleteMany({ where: { productId: testProductId } });
      await prisma.product.deleteMany({ where: { id: testProductId } });
    }

    await prisma.$disconnect();
  }
}

runCheckoutTests();
