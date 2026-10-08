/**
 * SCRIPT DE PURGA DEFINITIVA DE PRODUCTOS DE PRUEBA
 * Elimina 'Camisa Nike Dri-FIT Sport' y 'Lámpara de Mesa Nórdica en Madera y Lino'
 * de la base de datos de TiendaDelki (movimientos, variantes, imágenes, producto).
 */

import { prisma } from "../lib/db";

async function main() {
  console.log("🧹 ========================================================");
  console.log("🧹 INICIANDO PURGA DEFINITIVA DE PRODUCTOS DE PRUEBA");
  console.log("🧹 ========================================================\n");

  const demoSlugs = [
    "camisa-nike-dri-fit-sport",
    "lampara-mesa-nordica-madera",
  ];

  const demoIds = [
    "cmv04vdzr000y9947ixdn4160",
    "cmv04vdyf000f99470qqit8dj",
  ];

  const demoSkus = [
    "HOG-LAMP-001",
    "NKE-SPO-BLK-S",
    "NKE-SPO-BLK-M",
    "NKE-SPO-BLK-L",
    "NKE-SPO-WHT-M",
  ];

  // 1. Buscar los productos
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { slug: { in: demoSlugs } },
        { id: { in: demoIds } },
        { sku: { in: demoSkus } },
        { variants: { some: { sku: { in: demoSkus } } } },
      ],
    },
    include: { variants: true, images: true },
  });

  if (products.length === 0) {
    console.log("✅ No se encontraron productos de prueba en la base de datos (ya estaban eliminados).");
    return;
  }

  console.log(`🔍 Encontrados ${products.length} producto(s) de prueba para eliminar.`);

  for (const prod of products) {
    console.log(`\n🗑️ Procesando eliminación de: '${prod.name}' (ID: ${prod.id}, Slug: ${prod.slug})`);

    // 1. Limpiar movimientos de inventario asociados
    const deletedMovements = await prisma.inventoryMovement.deleteMany({
      where: { productId: prod.id },
    });
    console.log(`   - Movimientos de inventario eliminados: ${deletedMovements.count}`);

    // 2. Limpiar variantes
    const deletedVariants = await prisma.productVariant.deleteMany({
      where: { productId: prod.id },
    });
    console.log(`   - Variantes eliminadas: ${deletedVariants.count}`);

    // 3. Limpiar imágenes
    const deletedImages = await prisma.productImage.deleteMany({
      where: { productId: prod.id },
    });
    console.log(`   - Imágenes eliminadas: ${deletedImages.count}`);

    // 4. Limpiar favoritos si los hubiera
    const deletedFavs = await prisma.favorite.deleteMany({
      where: { productId: prod.id },
    });
    console.log(`   - Favoritos eliminados: ${deletedFavs.count}`);

    // 5. Eliminar producto
    await prisma.product.delete({
      where: { id: prod.id },
    });
    console.log(`   ✅ Producto '${prod.name}' eliminado permanentemente de la base de datos.`);
  }

  console.log("\n🎉 Purga completada exitosamente.");
}

main()
  .catch((e) => {
    console.error("❌ Error durante la purga de productos:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
