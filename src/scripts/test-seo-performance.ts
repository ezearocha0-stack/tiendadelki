import { prisma } from "../lib/db";
import sitemap from "../app/sitemap";
import robots from "../app/robots";
import { ImageProcessor } from "../core/images/image-processor";
import sharp from "sharp";
import { GET as getCategories } from "../app/api/categories/route";
import { GET as getShippingMethods } from "../app/api/shipping-methods/route";
import { GET as getSettings } from "../app/api/settings/route";
import { GET as getProducts } from "../app/api/products/route";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

let passedCount = 0;
let totalCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalCount++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
  }
}

async function runSeoPerformanceTests() {
  console.log("\n==================================================");
  console.log("🚀 INICIANDO SUITE DE PRUEBAS: SEO, IMÁGENES Y RENDIMIENTO");
  console.log("==================================================\n");

  // -------------------------------------------------------------
  // TEST 1: Verificar Índices Compuestos en PostgreSQL
  // -------------------------------------------------------------
  console.log("📌 1. Verificando Índices Compuestos en Base de Datos...");
  try {
    const dbIndexes: Array<{ tablename: string; indexname: string; indexdef: string }> =
      await prisma.$queryRaw`
        SELECT tablename, indexname, indexdef 
        FROM pg_indexes 
        WHERE schemaname = 'public'
      `;

    const indexNames = dbIndexes.map((idx) => idx.indexname);

    // Índices de Product
    const hasProductCat = indexNames.some((n) => n.includes("status_category_id"));
    const hasProductFeatured = indexNames.some((n) => n.includes("status_is_featured"));
    const hasProductNew = indexNames.some((n) => n.includes("status_is_new"));
    const hasProductDiscount = indexNames.some((n) => n.includes("status_compare_at_price"));
    const hasProductCreated = indexNames.some((n) => n.includes("status_created_at"));
    const hasProductPrice = indexNames.some((n) => n.includes("status_base_price"));

    // Índices de Category, Image, Variant, Order
    const hasCategorySort = indexNames.some((n) => n.includes("is_active_sort_order"));
    const hasImagePrimary = indexNames.some((n) => n.includes("product_id_is_primary"));
    const hasVariantActive = indexNames.some((n) => n.includes("product_id_is_active"));
    const hasOrderCustomer = indexNames.some((n) => n.includes("customer_id_created_at"));

    assert(hasProductCat, "Índice compuesto Product(status, category_id) existe");
    assert(hasProductFeatured, "Índice compuesto Product(status, is_featured) existe");
    assert(hasProductNew, "Índice compuesto Product(status, is_new) existe");
    assert(hasProductDiscount, "Índice compuesto Product(status, compare_at_price) existe");
    assert(hasProductCreated, "Índice compuesto Product(status, created_at DESC) existe");
    assert(hasProductPrice, "Índice compuesto Product(status, base_price) existe");
    assert(hasCategorySort, "Índice compuesto Category(is_active, sort_order) existe");
    assert(hasImagePrimary, "Índice compuesto ProductImage(product_id, is_primary) existe");
    assert(hasVariantActive, "Índice compuesto ProductVariant(product_id, is_active) existe");
    assert(hasOrderCustomer, "Índice compuesto Order(customer_id, created_at DESC) existe");
  } catch (err: any) {
    assert(false, "Consulta de índices en PostgreSQL", err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Rendimiento de Consultas del Catálogo
  // -------------------------------------------------------------
  console.log("\n📌 2. Evaluando Rendimiento y Latencia de Consultas...");
  try {
    const t0 = performance.now();
    const deals = await prisma.product.findMany({
      where: { status: "PUBLISHED", compareAtPrice: { gt: 0 } },
      take: 8,
      orderBy: { createdAt: "desc" },
    });
    const t1 = performance.now();
    const elapsedDeals = t1 - t0;
    assert(elapsedDeals < 50, `Consulta de ofertas indexada ejecutada en ${elapsedDeals.toFixed(2)}ms (< 50ms)`);

    const t2 = performance.now();
    const featured = await prisma.product.findMany({
      where: { status: "PUBLISHED", isFeatured: true },
      take: 8,
      include: {
        images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }], take: 1 },
      },
    });
    const t3 = performance.now();
    const elapsedFeatured = t3 - t2;
    assert(elapsedFeatured < 50, `Consulta de destacados con imagen ejecutada en ${elapsedFeatured.toFixed(2)}ms (< 50ms)`);
  } catch (err: any) {
    assert(false, "Benchmark de consultas", err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Validación de Sitemap Dinámico
  // -------------------------------------------------------------
  console.log("\n📌 3. Validando Generación de Sitemap Dinámico (sitemap.xml)...");
  try {
    const siteMapEntries = await sitemap();
    assert(Array.isArray(siteMapEntries) && siteMapEntries.length > 5, "Sitemap genera lista de URLs válidas");

    const urls = siteMapEntries.map((e) => e.url);
    const hasHome = urls.some((u) => u.endsWith("/") || u.endsWith(".com"));
    const hasTienda = urls.some((u) => u.includes("/tienda"));
    const hasOfertas = urls.some((u) => u.includes("/ofertas"));
    const hasFavoritos = urls.some((u) => u.includes("/favoritos"));
    const hasRastreo = urls.some((u) => u.includes("/rastreo"));
    const hasCategorias = urls.some((u) => u.includes("/categorias"));

    assert(hasHome, "Sitemap incluye ruta raíz (home)");
    assert(hasTienda, "Sitemap incluye /tienda");
    assert(hasOfertas, "Sitemap incluye /ofertas");
    assert(hasFavoritos, "Sitemap incluye /favoritos");
    assert(hasRastreo, "Sitemap incluye /rastreo");
    assert(hasCategorias, "Sitemap incluye /categorias y URLs dinámicas de categorías");
  } catch (err: any) {
    assert(false, "Generación de sitemap", err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: Validación de Robots.txt
  // -------------------------------------------------------------
  console.log("\n📌 4. Validando Reglas de Robots (robots.txt)...");
  try {
    const robotsConfig = robots();
    assert(Boolean(robotsConfig.sitemap), "Robots.txt declara URL canónica del sitemap");

    const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
    const disallowList = Array.isArray(rules?.disallow) ? rules.disallow : [rules?.disallow];

    const blocksAdmin = disallowList.includes("/admin/");
    const blocksClient = disallowList.includes("/cliente/");
    const blocksCheckout = disallowList.includes("/checkout");
    const blocksOrders = disallowList.includes("/api/orders/");

    assert(blocksAdmin, "Robots protege rutas administrativas (/admin/)");
    assert(blocksClient, "Robots protege área privada de clientes (/cliente/)");
    assert(blocksCheckout, "Robots evita indexación de checkout (/checkout)");
    assert(blocksOrders, "Robots evita indexación de APIs de pedidos sensibles");
  } catch (err: any) {
    assert(false, "Generación de robots.txt", err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Procesador de Imágenes Sharp (WebP y Miniaturas)
  // -------------------------------------------------------------
  console.log("\n📌 5. Validando Optimización de Imágenes con Sharp...");
  try {
    // Generar imagen sintética de prueba (PNG 800x800)
    const testImageBuffer = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 3,
        background: { r: 59, g: 130, b: 246 },
      },
    })
      .png()
      .toBuffer();

    const result = await ImageProcessor.processAndStore(
      testImageBuffer,
      "test_product_sharp",
      "test-seo"
    );

    assert(result.format === "webp", "Imagen procesada en formato WebP de alta fidelidad");
    assert(result.url.endsWith(".webp"), "URL principal tiene extensión .webp");
    assert(result.thumbnailUrl.includes("_thumb.webp"), "Miniatura generada con sufijo _thumb.webp");
    assert(result.sizeBytes < testImageBuffer.length, "Compresión WebP reduce el tamaño del archivo preservando nitidez");

    // Limpiar archivo de prueba
    await ImageProcessor.deleteStoredImage(result.storageKey);
    assert(true, "Limpieza segura de imágenes y miniaturas de prueba");
  } catch (err: any) {
    assert(false, "Procesamiento de imágenes Sharp", err.message);
  }

  // -------------------------------------------------------------
  // TEST 6: Validación de Configuración Next.js (next.config.mjs)
  // -------------------------------------------------------------
  console.log("\n📌 6. Validando Configuración de Rendimiento Next.js...");
  try {
    const configPath = path.join(process.cwd(), "next.config.mjs");
    const configContent = fs.readFileSync(configPath, "utf-8");

    const hasAvif = configContent.includes("image/avif");
    const hasWebp = configContent.includes("image/webp");
    const hasCompress = configContent.includes("compress: true");
    const hasPoweredBy = configContent.includes("poweredByHeader: false");
    const hasDeviceSizes = configContent.includes("deviceSizes");

    assert(hasAvif && hasWebp, "Formatos de imagen de última generación habilitados (AVIF & WebP)");
    assert(hasCompress, "Compresión gzip/brotli habilitada en servidor Next.js");
    assert(hasPoweredBy, "Header X-Powered-By desactivado por seguridad y rendimiento");
    assert(hasDeviceSizes, "Breakpoints responsive para móviles definidos en deviceSizes");
  } catch (err: any) {
    assert(false, "Lectura de next.config.mjs", err.message);
  }

  // -------------------------------------------------------------
  // TEST 7: Cabeceras Cache-Control en APIs Públicas
  // -------------------------------------------------------------
  console.log("\n📌 7. Validando Cabeceras HTTP Cache-Control en Endpoints Públicos...");
  try {
    // 1. Categorías
    const catReq = new NextRequest("http://localhost:3000/api/categories");
    const catRes = await getCategories(catReq);
    const catCache = catRes.headers.get("Cache-Control");
    assert(
      Boolean(catCache && catCache.includes("s-maxage=")),
      `API Categorías devuelve Cache-Control (${catCache})`
    );

    // 2. Métodos de Envío
    const shipRes = await getShippingMethods();
    const shipCache = shipRes.headers.get("Cache-Control");
    assert(
      Boolean(shipCache && shipCache.includes("s-maxage=")),
      `API Métodos de Envío devuelve Cache-Control (${shipCache})`
    );

    // 3. Ajustes de Sistema Públicos
    const setRes = await getSettings();
    const setCache = setRes.headers.get("Cache-Control");
    assert(
      Boolean(setCache && setCache.includes("s-maxage=")),
      `API Ajustes del Sistema devuelve Cache-Control (${setCache})`
    );

    // 4. Productos Públicos
    const prodReq = new NextRequest("http://localhost:3000/api/products?status=PUBLISHED");
    const prodRes = await getProducts(prodReq);
    const prodCache = prodRes.headers.get("Cache-Control");
    assert(
      Boolean(prodCache && prodCache.includes("s-maxage=")),
      `API Productos Públicos devuelve Cache-Control (${prodCache})`
    );
  } catch (err: any) {
    assert(false, "Verificación de cabeceras de caché", err.message);
  }

  // -------------------------------------------------------------
  // RESUMEN FINAL
  // -------------------------------------------------------------
  console.log("\n==================================================");
  console.log(`📊 RESULTADO DE LA SUITE: ${passedCount} / ${totalCount} PRUEBAS PASADAS`);
  console.log("==================================================\n");

  if (passedCount === totalCount) {
    console.log("🎉 ¡TODAS LAS OPTIMIZACIONES DE SEO, IMÁGENES Y RENDIMIENTO OPERAN AL 100%!");
  } else {
    console.error("⚠️ Algunas pruebas no pasaron. Revisa los detalles anteriores.");
    process.exit(1);
  }
}

runSeoPerformanceTests()
  .catch((err) => {
    console.error("Error crítico ejecutando suite:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
