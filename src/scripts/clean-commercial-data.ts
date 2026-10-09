/**
 * LIMPIEZA TOTAL DE DATOS COMERCIALES DE TIENDADELKI
 * - Deja la tienda en cero comercialmente lista para comenzar a operar.
 * - Preserva schema, migraciones, tabla Store por defecto y cuenta ezearocha@gmail.com (SUPER_ADMIN).
 * - Elimina productos, variantes, imágenes, marcas, categorías, pedidos, items, historiales, movimientos,
 *   cuentas bancarias antiguas, direcciones, favoritos, usuarios no administrativos, uploads y comprobantes.
 * - Establece la configuración comercial oficial en Monte Cristi / Barrio El Albinal.
 */

import { prisma } from "../lib/db";
import { updateStoreSettings } from "../core/settings/settings-service";
import fs from "fs";
import path from "path";

async function cleanStorageDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return 0;
  }
  let deletedCount = 0;
  const entries = fs.readdirSync(dirPath);
  for (const entry of entries) {
    if (entry === ".gitkeep") continue;
    const fullPath = path.join(dirPath, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        deletedCount++;
      } else {
        fs.unlinkSync(fullPath);
        deletedCount++;
      }
    } catch (e) {
      console.warn(`No se pudo eliminar archivo ${fullPath}:`, e);
    }
  }
  return deletedCount;
}

async function cleanCommercialData() {
  console.log("\n========================================================");
  console.log("🧹 INICIANDO LIMPIEZA TOTAL DE DATOS COMERCIALES");
  console.log("========================================================\n");

  // 1. Conteos ANTES de la limpieza
  const beforeCounts = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    images: await prisma.productImage.count(),
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    orderHistory: await prisma.orderStatusHistory.count(),
    customerAddresses: await prisma.customerAddress.count(),
    favorites: await prisma.favorite.count(),
    inventoryMovements: await prisma.inventoryMovement.count(),
    bankAccounts: await prisma.bankAccount.count(),
    orderReceipts: await prisma.orderReceipt.count(),
    usersTotal: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
  };

  console.log("📊 CONTEOS ANTES DE LA LIMPIEZA:");
  console.table(beforeCounts);

  // 2. Verificar que existe la cuenta administrativa principal
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "ezearocha@gmail.com";
  let adminUser = await prisma.user.findFirst({
    where: { email: { in: [adminEmail, "ezearocha@gmail.com", "admin@tiendadelki.com"] } },
  });
  if (!adminUser) {
    throw new Error(`ABORTANDO: No se encontró la cuenta administrativa (${adminEmail})`);
  }
  console.log(`🔒 Cuenta administrativa verificada: ${adminUser.email} (Rol: ${adminUser.role}, ID: ${adminUser.id})`);

  // 3. Ejecución de la limpieza en cascada controlada
  console.log("\n🗑️ Eliminando datos comerciales...");

  // Pedidos y detalles
  await prisma.favorite.deleteMany({});
  await prisma.orderReceipt.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.order.deleteMany({});

  // Inventario y Catálogo
  await prisma.inventoryMovement.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.productVariant.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.category.deleteMany({});

  // Cuentas bancarias antiguas
  await prisma.bankAccount.deleteMany({});

  // Clientes y Direcciones (conservar únicamente la cuenta del super admin)
  await prisma.customerAddress.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      id: {
        not: adminUser.id,
      },
    },
  });

  // Asegurar que conserve rol SUPER_ADMIN y estado activo
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { email: adminEmail, role: "SUPER_ADMIN", isActive: true },
  });

  // Asegurar que Store por defecto existe con nombre TiendaDelki
  await prisma.store.updateMany({
    where: { isDefault: true },
    data: { name: "TiendaDelki" },
  });

  // 4. Limpieza del Storage físico de archivos
  console.log("\n📂 Limpiando storage de imágenes de productos y comprobantes...");
  const uploadsProducts = path.join(process.cwd(), "public/uploads/products");
  const uploadsReceipts = path.join(process.cwd(), "public/uploads/receipts");
  const uploadsTestSeo = path.join(process.cwd(), "public/uploads/test-seo");
  const storageReceipts = path.join(process.cwd(), "storage/private/receipts");

  const deletedProductsFiles = await cleanStorageDirectory(uploadsProducts);
  const deletedReceiptsFiles = await cleanStorageDirectory(uploadsReceipts);
  const deletedTestFiles = await cleanStorageDirectory(uploadsTestSeo);
  const deletedPrivateFiles = await cleanStorageDirectory(storageReceipts);

  console.log(`   • public/uploads/products: ${deletedProductsFiles} archivos eliminados`);
  console.log(`   • public/uploads/receipts: ${deletedReceiptsFiles} archivos eliminados`);
  console.log(`   • public/uploads/test-seo: ${deletedTestFiles} archivos eliminados`);
  console.log(`   • storage/private/receipts: ${deletedPrivateFiles} archivos eliminados`);

  // 5. Establecer la configuración comercial limpia para Monte Cristi y Barrio El Albinal
  console.log("\n🏢 Estableciendo configuración comercial oficial de la tienda...");
  await updateStoreSettings({
    storeName: "TiendaDelki",
    shortDescription: "Tienda Física & Online – República Dominicana",
    description: "Tu tienda de confianza con inventario verificado y envíos a todas las provincias de República Dominicana.",
    logoUrl: "",
    phone: "",
    secondaryPhone: "",
    whatsapp: "8296734710",
    email: "contacto@tiendadelki.com",
    address: "Calle Principal",
    sector: "Barrio El Albinal",
    city: "San Fernando de Monte Cristi",
    province: "Monte Cristi",
    country: "República Dominicana",
    postalCode: "62000",
    scheduleDays: "Lunes a Sábado",
    scheduleOpen: "9:00 AM",
    scheduleClose: "7:00 PM",
    scheduleText: "Domingos y feriados: cerrado",
    currency: "DOP",
    currencySymbol: "RD$",
    contactMessage: "¡Hola TiendaDelki! Deseo consultar sobre sus productos y catálogo disponible.",
    deliveryMessage: "Envíos a todo el país y entregas locales en Monte Cristi.",
    instagram: "https://instagram.com/tiendadelki",
    facebook: "https://facebook.com/tiendadelki",
    tiktok: "https://tiktok.com/@tiendadelki",
  });

  // 6. Conteos DESPUÉS de la limpieza
  const afterCounts = {
    products: await prisma.product.count(),
    variants: await prisma.productVariant.count(),
    images: await prisma.productImage.count(),
    brands: await prisma.brand.count(),
    categories: await prisma.category.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    orderHistory: await prisma.orderStatusHistory.count(),
    customerAddresses: await prisma.customerAddress.count(),
    favorites: await prisma.favorite.count(),
    inventoryMovements: await prisma.inventoryMovement.count(),
    bankAccounts: await prisma.bankAccount.count(),
    orderReceipts: await prisma.orderReceipt.count(),
    usersTotal: await prisma.user.count(),
    adminUsers: await prisma.user.count({ where: { role: "SUPER_ADMIN" } }),
  };

  console.log("\n📊 CONTEOS DESPUÉS DE LA LIMPIEZA:");
  console.table(afterCounts);

  // Verificaciones de integridad comercial en cero
  if (
    afterCounts.products !== 0 ||
    afterCounts.variants !== 0 ||
    afterCounts.images !== 0 ||
    afterCounts.brands !== 0 ||
    afterCounts.categories !== 0 ||
    afterCounts.orders !== 0 ||
    afterCounts.orderItems !== 0 ||
    afterCounts.orderHistory !== 0 ||
    afterCounts.customerAddresses !== 0 ||
    afterCounts.favorites !== 0 ||
    afterCounts.inventoryMovements !== 0 ||
    afterCounts.bankAccounts !== 0 ||
    afterCounts.orderReceipts !== 0 ||
    afterCounts.usersTotal !== 1 ||
    afterCounts.adminUsers !== 1
  ) {
    throw new Error("ADVERTENCIA CRÍTICA: Los conteos finales no coinciden con la expectativa de 0 comercial.");
  }

  console.log("\n========================================================");
  console.log("✅ BASE DE DATOS Y STORAGE LIMPIOS AL 100% PARA OPERACIÓN COMERCIAL");
  console.log("========================================================\n");

  await prisma.$disconnect();
}

cleanCommercialData().catch((err) => {
  console.error("❌ ERROR DURANTE LA LIMPIEZA:", err);
  process.exit(1);
});
