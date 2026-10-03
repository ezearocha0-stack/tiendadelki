import { PrismaClient, MovementType } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 ========================================================");
  console.log("🧪 INICIANDO SUITE DE PRUEBAS DE INTEGRACIÓN: TIENDADELKI");
  console.log("🧪 ========================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  async function test(name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedTests++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error("   Error:", err instanceof Error ? err.message : err);
    }
  }

  // Test 1: Conexión Básica
  await test("Conexión con PostgreSQL 16 y verificación de Store matriz", async () => {
    const store = await prisma.store.findFirst({ where: { isDefault: true } });
    if (!store) throw new Error("No se encontró la tienda principal");
    if (store.name !== "TiendaDelki Principal") throw new Error(`Nombre inesperado: ${store.name}`);
  });

  // Test 2: Catálogo con Variantes Multidimensionales
  await test("Verificación de catálogo y variantes (ropa con tallas y colores)", async () => {
    const product = await prisma.product.findUnique({
      where: { slug: "camisa-nike-dri-fit-sport" },
      include: { variants: true, category: true },
    });
    if (!product) throw new Error("Producto con variantes no encontrado");
    if (!product.hasVariants) throw new Error("hasVariants debe ser true");
    if (product.variants.length < 4) throw new Error(`Se esperaban 4 variantes, se encontraron ${product.variants.length}`);
  });

  // Test 3: Producto Simple (sin ropa / genérico)
  await test("Verificación de producto simple (artículo de hogar/decoración)", async () => {
    const product = await prisma.product.findUnique({
      where: { slug: "lampara-mesa-nordica-madera" },
    });
    if (!product) throw new Error("Producto simple no encontrado");
    if (product.hasVariants) throw new Error("hasVariants debe ser false");
    if (product.stock <= 0) throw new Error("Stock debe ser positivo");
  });

  // Test 4: Regla Fundamental - Venta Física Rápida
  await test("Regla Fundamental: 'Vendido Físicamente' descuenta stock y crea movimiento SIN crear pedido", async () => {
    // Tomar una variante
    const variant = await prisma.productVariant.findFirst({
      where: { sku: "NKE-SPO-BLK-S" },
    });
    if (!variant) throw new Error("Variante NKE-SPO-BLK-S no encontrada");

    const initialStock = variant.stock;
    const ordersCountBefore = await prisma.order.count();

    // Simular venta física rápida de 1 unidad
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.update({
        where: { id: variant.id },
        data: { stock: { decrement: 1 } },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          productId: variant.productId,
          variantId: variant.id,
          movementType: MovementType.VENTA_FISICA,
          quantity: -1,
          previousStock: initialStock,
          newStock: updated.stock,
          referenceType: "TEST_PHYSICAL_SALE",
          notes: "Venta física de prueba en mostrador",
        },
      });

      return { updated, movement };
    });

    const ordersCountAfter = await prisma.order.count();

    if (result.updated.stock !== initialStock - 1) {
      throw new Error(`El stock no disminuyó correctamente. Inicial: ${initialStock}, Actual: ${result.updated.stock}`);
    }
    if (ordersCountBefore !== ordersCountAfter) {
      throw new Error("VIOLACIÓN DE REGLA: Una venta física NO debe crear ningún pedido online!");
    }
    if (result.movement.movementType !== MovementType.VENTA_FISICA) {
      throw new Error("El movimiento de inventario debe ser de tipo VENTA_FISICA");
    }

    // Revertir para mantener estado limpio
    await prisma.productVariant.update({
      where: { id: variant.id },
      data: { stock: initialStock },
    });
  });

  // Test 5: Prevención de Inventario Negativo (Check Constraint de BD)
  await test("Prevención de Stock Negativo a nivel de Motor PostgreSQL (CHECK constraint)", async () => {
    const variant = await prisma.productVariant.findFirst();
    if (!variant) throw new Error("Variante no encontrada");

    let constraintBlocked = false;
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE product_variants SET stock = -10 WHERE id = '${variant.id}';`
      );
    } catch (e: unknown) {
      constraintBlocked = true;
    }

    if (!constraintBlocked) {
      throw new Error("El motor de base de datos no bloqueó el stock negativo!");
    }
  });

  // Test 6: Cuentas Bancarias y Métodos de Envío Dinámicos
  await test("Verificación de configuración dinámica de cuentas bancarias y envíos", async () => {
    const [bankAccounts, shippingMethods, settings] = await Promise.all([
      prisma.bankAccount.count({ where: { isActive: true } }),
      prisma.shippingMethod.count({ where: { isActive: true } }),
      prisma.systemSetting.count(),
    ]);

    if (bankAccounts < 3) throw new Error(`Faltan cuentas bancarias (encontradas: ${bankAccounts})`);
    if (shippingMethods < 3) throw new Error(`Faltan métodos de envío (encontrados: ${shippingMethods})`);
    if (settings < 4) throw new Error(`Faltan variables de configuración (encontradas: ${settings})`);
  });

  console.log("\n🧪 ========================================================");
  console.log(`🧪 RESULTADOS: ${passedTests}/${totalTests} PRUEBAS SUPERADAS`);
  console.log("🧪 ========================================================\n");

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests()
  .catch((e) => {
    console.error("Error fatal en pruebas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
