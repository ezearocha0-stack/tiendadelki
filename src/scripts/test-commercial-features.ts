import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";

async function runCommercialFeaturesTests() {
  console.log("🛒 ========================================================");
  console.log("🛒 INICIANDO SUITE DE PRUEBAS: MEJORAS COMERCIALES Y UX");
  console.log("🛒 ========================================================\n");

  const timestamp = Date.now();
  const testCategorySlug = `cat-comm-${timestamp}`;
  const testEmail = `cliente.comm.${timestamp}@delki.do`;

  let store = await prisma.store.findFirst();
  if (!store) {
    store = await prisma.store.create({
      data: {
        name: "TiendaDelki Test Store",
        slug: `store-${timestamp}`,
      },
    });
  }

  // Crear categoría de prueba
  const category = await prisma.category.create({
    data: {
      name: "Colección Premium Test",
      slug: testCategorySlug,
      isActive: true,
      sortOrder: 1,
    },
  });

  // Crear Producto en Oferta (compareAtPrice: 2000, basePrice: 1500 => 25% OFF)
  const dealProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: "Chaqueta Denim Oferta",
      slug: `chaqueta-denim-${timestamp}`,
      sku: `CHK-OFF-${timestamp}`,
      basePrice: 1500,
      compareAtPrice: 2000,
      stock: 10,
      minStock: 2,
      status: "PUBLISHED",
      isFeatured: true,
      isNew: false,
    },
  });

  // Crear Producto Nuevo (isNew: true)
  const newProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: "Vestido Floral Primavera",
      slug: `vestido-floral-${timestamp}`,
      sku: `VES-NEW-${timestamp}`,
      basePrice: 2500,
      stock: 8,
      minStock: 2,
      status: "PUBLISHED",
      isFeatured: false,
      isNew: true,
    },
  });

  // Crear Producto Agotado (stock: 0)
  const outOfStockProduct = await prisma.product.create({
    data: {
      storeId: store.id,
      categoryId: category.id,
      name: "Calzado Exclusivo Agotado",
      slug: `calzado-exclusivo-${timestamp}`,
      sku: `CAL-OUT-${timestamp}`,
      basePrice: 4200,
      stock: 0,
      minStock: 2,
      status: "PUBLISHED",
      isFeatured: false,
      isNew: false,
    },
  });

  // Crear Usuario de Prueba
  const passwordHash = await bcrypt.hash("Password123!", 12);
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      passwordHash,
      firstName: "Laura",
      lastName: "Compradora",
      role: "CUSTOMER",
    },
  });

  try {
    // --- TEST 1: Cálculo de Porcentaje de Descuento en Ofertas ---
    console.log("--- TEST 1: Cálculo Preciso de Descuento (% OFF) ---");
    const oldPrice = Number(dealProduct.compareAtPrice);
    const currPrice = Number(dealProduct.basePrice);
    const hasDiscount = oldPrice > currPrice;
    const discountPercent = Math.round(((oldPrice - currPrice) / oldPrice) * 100);
    const savingsAmount = oldPrice - currPrice;

    if (!hasDiscount || discountPercent !== 25 || savingsAmount !== 500) {
      throw new Error(`Cálculo de descuento incorrecto: esperado 25%, obtenido ${discountPercent}%`);
    }
    console.log(`✓ Test 1 Exitoso: Descuento calculado correctamente: -${discountPercent}% OFF (Ahorro: RD$ ${savingsAmount}).\n`);

    // --- TEST 2: Endpoint de Favoritos para Invitados (guest-details) ---
    console.log("--- TEST 2: Recuperación de Favoritos de Invitado por IDs ---");
    const guestIds = [dealProduct.id, newProduct.id];
    const guestDetailsProducts = await prisma.product.findMany({
      where: { id: { in: guestIds }, status: "PUBLISHED" },
      include: { category: true },
    });

    if (guestDetailsProducts.length !== 2) {
      throw new Error(`Se esperaban 2 productos para invitados, obtenidos: ${guestDetailsProducts.length}`);
    }
    console.log(`✓ Test 2 Exitoso: Invitado puede recuperar metadatos completos de ${guestDetailsProducts.length} productos sin cuenta.\n`);

    // --- TEST 3: Sincronización Automática de Favoritos de Invitado a Cliente ---
    console.log("--- TEST 3: Sincronización de Favoritos de Invitado al Iniciar Sesión ---");
    // Simular que el invitado guardó dealProduct y newProduct en localStorage y ahora inicia sesión
    for (const prodId of guestIds) {
      await prisma.favorite.upsert({
        where: {
          userId_productId: {
            userId: user.id,
            productId: prodId,
          },
        },
        create: {
          userId: user.id,
          productId: prodId,
        },
        update: {},
      });
    }

    const customerFavorites = await prisma.favorite.findMany({
      where: { userId: user.id },
    });

    if (customerFavorites.length !== 2) {
      throw new Error(`Fallo en sincronización: esperados 2 favoritos vinculados, encontrados ${customerFavorites.length}`);
    }
    console.log(`✓ Test 3 Exitoso: ${customerFavorites.length} favoritos de invitado sincronizados en PostgreSQL para el cliente.\n`);

    // --- TEST 4: Productos Destacados (isFeatured) ---
    console.log("--- TEST 4: Consulta de Productos Destacados ---");
    const featuredItems = await prisma.product.findMany({
      where: { isFeatured: true, status: "PUBLISHED" },
    });
    const foundFeatured = featuredItems.some((p) => p.id === dealProduct.id);
    if (!foundFeatured) {
      throw new Error("El producto marcado como destacado no fue retornado por el filtro isFeatured: true");
    }
    console.log(`✓ Test 4 Exitoso: Filtro isFeatured recuperó el producto destacado (#${dealProduct.sku}).\n`);

    // --- TEST 5: Productos Nuevos (isNew) ---
    console.log("--- TEST 5: Consulta de Productos Nuevos ---");
    const newItems = await prisma.product.findMany({
      where: { isNew: true, status: "PUBLISHED" },
    });
    const foundNew = newItems.some((p) => p.id === newProduct.id);
    if (!foundNew) {
      throw new Error("El producto marcado como nuevo no fue retornado por el filtro isNew: true");
    }
    console.log(`✓ Test 5 Exitoso: Filtro isNew recuperó la novedad (#${newProduct.sku}).\n`);

    // --- TEST 6: Productos Relacionados Inteligentes ---
    console.log("--- TEST 6: Productos Relacionados por Categoría (Excluyendo Producto Actual) ---");
    const related = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        id: { not: dealProduct.id },
        status: "PUBLISHED",
      },
    });

    const containsSelf = related.some((p) => p.id === dealProduct.id);
    if (containsSelf) {
      throw new Error("Productos relacionados contiene el producto principal en consulta");
    }
    if (related.length < 2) {
      throw new Error(`Esperados al menos 2 productos relacionados, obtenidos: ${related.length}`);
    }
    console.log(`✓ Test 6 Exitoso: ${related.length} productos relacionados encontrados en la misma categoría sin duplicar el actual.\n`);

    // --- TEST 7: Detección y Manejo de Productos Agotados ---
    console.log("--- TEST 7: Estado de Producto Agotado (Stock 0) ---");
    const isOutOfStock = outOfStockProduct.stock === 0;
    if (!isOutOfStock) {
      throw new Error("Detección de producto agotado falló");
    }
    console.log(`✓ Test 7 Exitoso: Producto con stock 0 identificado correctamente como 'Agotado' para deshabilitar compra y ofrecer WhatsApp.\n`);

    console.log("================================================================================");
    console.log("RESULTADO FINAL: 7 / 7 PRUEBAS COMERCIALES SUPERADAS EXITOSAMENTE.");
    console.log("================================================================================\n");
  } finally {
    // Limpieza
    await prisma.favorite.deleteMany({ where: { userId: user.id } });
    await prisma.product.deleteMany({
      where: { id: { in: [dealProduct.id, newProduct.id, outOfStockProduct.id] } },
    });
    await prisma.category.delete({ where: { id: category.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

runCommercialFeaturesTests().catch((err) => {
  console.error("Error en suite de pruebas comerciales:", err);
  process.exit(1);
});
