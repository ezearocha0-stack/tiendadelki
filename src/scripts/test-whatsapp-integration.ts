import { prisma } from "../lib/db";
import {
  formatWhatsAppPhone,
  formatWhatsAppPrice,
  buildCartWhatsAppMessage,
  buildProductInquiryMessage,
  generateWhatsAppUrl,
} from "../core/whatsapp/whatsapp-helper";
import {
  getSystemSetting,
  updateSystemSetting,
  getWhatsAppStoreNumber,
  getAllSystemSettings,
} from "../core/settings/settings-service";
import { signJwt, Role } from "../core/auth/jwt";

async function runWhatsAppTests() {
  console.log("📱 ========================================================");
  console.log("📱 INICIANDO SUITE DE PRUEBAS: INTEGRACIÓN DE WHATSAPP");
  console.log("📱 ========================================================\n");

  try {
    // 1. NORMALIZACIÓN Y FORMATEO DE NÚMEROS TELEFÓNICOS
    const phoneTests = [
      { input: "8296734710", expected: "18296734710" },
      { input: "829-673-4710", expected: "18296734710" },
      { input: "+1 (829) 673-4710", expected: "18296734710" },
      { input: "18296734710", expected: "18296734710" },
      { input: " 809 555 1234 ", expected: "18095551234" },
    ];

    for (const test of phoneTests) {
      const result = formatWhatsAppPhone(test.input);
      if (result !== test.expected) {
        throw new Error(
          `Fallo en normalización de teléfono: "${test.input}" resultó "${result}", esperado "${test.expected}"`
        );
      }
    }
    console.log("✅ [1/6] Normalización Telefónica: Formatos locales e internacionales validados (18296734710)");

    // 2. GENERACIÓN DEL MENSAJE DEL CARRITO ("Comprar por WhatsApp")
    const sampleCartItems = [
      {
        productTitle: "Camisa negra",
        variantTitle: "Talla: M",
        quantity: 1,
        price: 1500,
      },
      {
        productTitle: "Jean azul",
        variantTitle: "Talla: 32",
        quantity: 1,
        price: 2000,
      },
    ];
    const subtotal = 3500;

    const cartMessage = buildCartWhatsAppMessage(sampleCartItems, subtotal);

    // Validar líneas clave del mensaje conceptual
    const expectedSnippets = [
      "Hola, quiero realizar este pedido:",
      "1. Camisa negra",
      "   Talla: M",
      "   Cantidad: 1",
      "   Precio: RD$1,500",
      "2. Jean azul",
      "   Talla: 32",
      "   Cantidad: 1",
      "   Precio: RD$2,000",
      "Subtotal: RD$3,500",
      "Quiero coordinar el envío.",
    ];

    for (const snippet of expectedSnippets) {
      if (!cartMessage.includes(snippet)) {
        throw new Error(`El mensaje del carrito no incluye el fragmento requerido: "${snippet}"\nMensaje generado:\n${cartMessage}`);
      }
    }

    console.log("✅ [2/6] Formateo de Carrito WhatsApp: Estructura conceptual exacta con variantes, cantidades y precios");
    console.log("--------------------------------------------------");
    console.log(cartMessage);
    console.log("--------------------------------------------------");

    // 3. CONSULTA DE PRODUCTO INDIVIDUAL ("Consultar por WhatsApp")
    const productInquiry = buildProductInquiryMessage({
      name: "Camisa Oxford Slim",
      variantTitle: "Color: Blanco / Talla: L",
      sku: "OXF-BLA-L",
      price: 1800,
      productUrl: "https://tiendadelki.com/producto/camisa-oxford-slim",
    });

    if (
      !productInquiry.includes("Camisa Oxford Slim") ||
      !productInquiry.includes("Color: Blanco / Talla: L") ||
      !productInquiry.includes("OXF-BLA-L") ||
      !productInquiry.includes("RD$1,800")
    ) {
      throw new Error(`Fallo en mensaje de consulta de producto:\n${productInquiry}`);
    }
    console.log("✅ [3/6] Mensaje de Consulta de Producto: Nombre, variante, SKU y precio verificados");

    // 4. GENERACIÓN DE URL UNIVERSAL (wa.me)
    const rawUserPhone = "8296734710";
    const waUrl = generateWhatsAppUrl(rawUserPhone, cartMessage);

    if (!waUrl.startsWith("https://wa.me/18296734710?text=")) {
      throw new Error(`La URL generada no inicia con https://wa.me/18296734710: ${waUrl}`);
    }

    // Comprobar que decodificar el parámetro text recupera el mensaje original
    const urlObj = new URL(waUrl);
    const decodedMessage = urlObj.searchParams.get("text");
    if (decodedMessage !== cartMessage) {
      throw new Error("El mensaje codificado en la URL no coincide con el mensaje original tras decodificar.");
    }
    console.log("✅ [4/6] Enlace Universal WhatsApp: URL wa.me compatible móvil/desktop verificada");

    // 5. CONFIGURACIÓN ADMINISTRATIVA DINÁMICA EN BASE DE DATOS (SystemSetting)
    // Actualizar número oficial al requerido por el usuario (8296734710)
    await updateSystemSetting(
      "WHATSAPP_STORE_NUMBER",
      "8296734710",
      "Teléfono WhatsApp oficial de TiendaDelki"
    );

    const storeNumber = await getWhatsAppStoreNumber();
    if (storeNumber !== "8296734710") {
      throw new Error(`El número obtenido de la base de datos (${storeNumber}) no coincide con 8296734710`);
    }

    // Probar endpoint público GET /api/settings
    const { GET: getSettingsApi, PATCH: patchSettingsApi } = await import("../app/api/settings/route");
    const getRes = await getSettingsApi();
    const getJson = await getRes.json();

    if (!getJson.success || getJson.data.WHATSAPP_STORE_NUMBER !== "8296734710") {
      throw new Error(`Fallo al consultar /api/settings: ${JSON.stringify(getJson)}`);
    }

    // Probar actualización vía PATCH /api/settings
    const adminToken = await signJwt({
      sub: "test-admin-whatsapp",
      role: Role.ADMIN,
      name: "Admin WhatsApp",
      email: "ezearocha@gmail.com",
    });

    const patchReq = new Request("http://localhost:3000/api/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${adminToken}`,
        "x-user-id": "test-admin-whatsapp",
        "x-user-role": "ADMIN",
      },
      body: JSON.stringify({ WHATSAPP_STORE_NUMBER: "8296734710" }),
    });
    const patchRes = await patchSettingsApi(patchReq as any);
    const patchJson = await patchRes.json();

    if (!patchJson.success || patchJson.data.WHATSAPP_STORE_NUMBER !== "8296734710") {
      throw new Error(`Fallo al actualizar /api/settings: ${JSON.stringify(patchJson)}`);
    }
    console.log("✅ [5/6] Configuración Administrativa: SystemSetting persistido en PostgreSQL (8296734710)");

    // 6. INVARIANTE CRÍTICA: CERO CREACIÓN DE PEDIDOS EN BASE DE DATOS
    const ordersCountBefore = await prisma.order.count();

    // Simular que el cliente pulsa "Comprar por WhatsApp" múltiples veces
    const dummyUrl1 = generateWhatsAppUrl(storeNumber, cartMessage);
    const dummyUrl2 = generateWhatsAppUrl(storeNumber, cartMessage);

    const ordersCountAfter = await prisma.order.count();

    if (ordersCountBefore !== ordersCountAfter) {
      throw new Error(
        `VIOLACIÓN DE REGLA: Se crearon pedidos en la base de datos al usar WhatsApp. Antes: ${ordersCountBefore}, Después: ${ordersCountAfter}`
      );
    }
    console.log(`✅ [6/6] Invariante Respetada: Pedidos en BD antes = ${ordersCountBefore}, después = ${ordersCountAfter} (Sin pedidos espurios)`);

    console.log("\n========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE INTEGRACIÓN DE WHATSAPP SUPERADAS");
    console.log("========================================================\n");
  } catch (error) {
    console.error("\n❌ ERROR EN PRUEBAS DE WHATSAPP:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runWhatsAppTests();
