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
    if (!store.name.includes("TiendaDelki")) throw new Error(`Nombre inesperado: ${store.name}`);
  });

  // Test 2: Catálogo con Variantes Multidimensionales
  await test("Verificación de catálogo y soporte de variantes", async () => {
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const store = await prisma.store.findFirst({ where: { isDefault: true } });
    if (!category || !store) throw new Error("Entidades base faltantes");

    const tempProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Test Temporal Variantes",
        slug: `test-temp-variant-${Date.now()}`,
        hasVariants: true,
        basePrice: 1000,
        variants: {
          create: [
            { sku: `TEST-VAR-1-${Date.now()}`, title: "V1", price: 1000, stock: 5, attributes: { color: "Rojo" } },
            { sku: `TEST-VAR-2-${Date.now()}`, title: "V2", price: 1000, stock: 5, attributes: { color: "Azul" } },
          ],
        },
      },
      include: { variants: true },
    });

    try {
      if (!tempProduct.hasVariants) throw new Error("hasVariants debe ser true");
      if (tempProduct.variants.length < 2) throw new Error("Debe tener variantes asociadas");
    } finally {
      await prisma.productVariant.deleteMany({ where: { productId: tempProduct.id } });
      await prisma.product.delete({ where: { id: tempProduct.id } });
    }
  });

  // Test 3: Producto Simple (sin ropa / genérico)
  await test("Verificación de producto simple (soporte stock directo)", async () => {
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const store = await prisma.store.findFirst({ where: { isDefault: true } });
    if (!category || !store) throw new Error("Entidades base faltantes");

    const tempProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Test Temporal Simple",
        slug: `test-temp-simple-${Date.now()}`,
        hasVariants: false,
        basePrice: 500,
        stock: 10,
      },
    });

    try {
      if (tempProduct.hasVariants) throw new Error("hasVariants debe ser false");
      if (tempProduct.stock <= 0) throw new Error("Stock debe ser positivo");
    } finally {
      await prisma.product.delete({ where: { id: tempProduct.id } });
    }
  });

  // Test 4: Regla Fundamental - Venta Física Rápida
  await test("Regla Fundamental: 'Vendido Físicamente' descuenta stock y crea movimiento SIN crear pedido", async () => {
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const store = await prisma.store.findFirst({ where: { isDefault: true } });
    if (!category || !store) throw new Error("Entidades base faltantes");

    const tempProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Test Venta Fisica",
        slug: `test-venta-fisica-${Date.now()}`,
        hasVariants: true,
        basePrice: 1500,
        variants: {
          create: [
            { sku: `TEST-SALE-${Date.now()}`, title: "Venta Unica", price: 1500, stock: 10, attributes: {} },
          ],
        },
      },
      include: { variants: true },
    });

    const variant = tempProduct.variants[0];
    const initialStock = variant.stock;

    try {
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
    } finally {
      await prisma.inventoryMovement.deleteMany({ where: { productId: tempProduct.id } });
      await prisma.productVariant.deleteMany({ where: { productId: tempProduct.id } });
      await prisma.product.delete({ where: { id: tempProduct.id } });
    }
  });

  // Test 5: Prevención de Inventario Negativo (Check Constraint de BD)
  await test("Prevención de Stock Negativo a nivel de Motor PostgreSQL (CHECK constraint)", async () => {
    const category = await prisma.category.findFirst({ where: { isActive: true } });
    const store = await prisma.store.findFirst({ where: { isDefault: true } });
    if (!category || !store) throw new Error("Entidades base faltantes");

    const tempProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: "Test Check Constraint",
        slug: `test-check-constraint-${Date.now()}`,
        hasVariants: true,
        basePrice: 500,
        variants: {
          create: [
            { sku: `TEST-CHECK-${Date.now()}`, title: "Check", price: 500, stock: 5, attributes: {} },
          ],
        },
      },
      include: { variants: true },
    });

    const variant = tempProduct.variants[0];

    try {
      let constraintBlocked = false;
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE product_variants SET stock = -10 WHERE id = '${variant.id}';`
        );
      } catch {
        constraintBlocked = true;
      }

      if (!constraintBlocked) {
        throw new Error("El motor de base de datos no bloqueó el stock negativo!");
      }
    } finally {
      await prisma.productVariant.deleteMany({ where: { productId: tempProduct.id } });
      await prisma.product.delete({ where: { id: tempProduct.id } });
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
