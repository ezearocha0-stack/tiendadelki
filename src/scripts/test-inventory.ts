import { InventoryService } from "../core/inventory/inventory-service";
import { ProductService } from "../core/catalog/product-service";
import { CategoryService } from "../core/catalog/category-service";
import { prisma } from "../lib/db";
import { MovementType } from "@prisma/client";
import { InsufficientStockError, ValidationError } from "../lib/errors";

async function runInventoryTests() {
  console.log("📦 ========================================================");
  console.log("📦 INICIANDO SUITE DE PRUEBAS DEL MOTOR DE INVENTARIO");
  console.log("📦 ========================================================\n");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`❌ [FAIL] ${name}`);
      console.error("   Error:", err instanceof Error ? err.message : err);
    }
  }

  // Pre-limpieza y creación de entorno de prueba
  const testCategory = await CategoryService.createCategory({
    name: `Cat Inv Test ${Date.now()}`,
    slug: `cat-inv-test-${Date.now()}`,
    isActive: true,
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] } },
  });
  if (!adminUser) throw new Error("Usuario administrativo no encontrado en base de datos.");
  const adminId = adminUser.id;

  // 1. Crear producto simple de prueba
  const simpleProduct = await ProductService.createProduct({
    name: "Taza de Cerámica Artesanal",
    slug: `taza-ceramica-${Date.now()}`,
    categoryId: testCategory.id,
    basePrice: 450.0,
    hasVariants: false,
    sku: `TAZ-${Date.now().toString().slice(-4)}`,
    stock: 10,
    minStock: 2,
    status: "PUBLISHED",
    isFeatured: false,
    isNew: false,
    images: [],
    customAttributes: [],
  });

  // 2. Crear producto con variantes de prueba
  const variantProduct = await ProductService.createProduct({
    name: "Camisa Oxford Formal",
    slug: `camisa-oxford-${Date.now()}`,
    categoryId: testCategory.id,
    basePrice: 1500.0,
    hasVariants: true,
    customAttributes: [
      { name: "Color", options: ["Blanco"] },
      { name: "Talla", options: ["M", "L"] },
    ],
    status: "PUBLISHED",
    isFeatured: false,
    isNew: false,
    images: [],
    variants: [
      {
        title: "Blanco / M",
        sku: `OXF-BLA-M-${Date.now().toString().slice(-4)}`,
        attributes: { Color: "Blanco", Talla: "M" },
        price: 1500.0,
        stock: 5,
        minStock: 2,
        isActive: true,
      },
      {
        title: "Blanco / L",
        sku: `OXF-BLA-L-${Date.now().toString().slice(-4)}`,
        attributes: { Color: "Blanco", Talla: "L" },
        price: 1500.0,
        stock: 1, // Solo 1 para prueba de concurrencia
        minStock: 1,
        isActive: true,
      },
    ],
  });

  const variantM = variantProduct.variants.find((v) => v.title.includes("M"))!;
  const variantL = variantProduct.variants.find((v) => v.title.includes("L"))!;

  try {
    // -----------------------------------------------------------------------
    // TEST 1: Regla Fundamental - Venta Física Rápida (Sin Pedidos, Sin Facturas)
    // -----------------------------------------------------------------------
    await test("Regla Fundamental: Venta física rápida descuenta stock SIN crear pedidos online", async () => {
      const ordersBefore = await prisma.order.count();
      const initialStock = variantM.stock; // 5

      const sale = await InventoryService.quickPhysicalSale(
        {
          productId: variantProduct.id,
          variantId: variantM.id,
          quantity: 2,
          notes: "Venta física mostrador efectivo",
        },
        adminId
      );

      const ordersAfter = await prisma.order.count();

      if (ordersBefore !== ordersAfter) {
        throw new Error("VIOLACIÓN DE REGLA: ¡Una venta física NO debe crear órdenes en la tabla orders!");
      }

      if (sale.previousStock !== initialStock || sale.newStock !== initialStock - 2) {
        throw new Error(`Cálculo de stock incorrecto. Anterior: ${sale.previousStock}, Nuevo: ${sale.newStock}`);
      }

      // Verificar registro en bitácora
      const movement = await prisma.inventoryMovement.findUnique({
        where: { id: sale.movementId },
      });

      if (!movement || movement.movementType !== MovementType.VENTA_FISICA) {
        throw new Error("El movimiento no se registró como VENTA_FISICA");
      }
      if (movement.quantity !== -2) {
        throw new Error(`La cantidad en el movimiento debe ser -2, se obtuvo: ${movement.quantity}`);
      }
      if (movement.createdBy !== adminId) {
        throw new Error("El ID del usuario administrativo no fue registrado");
      }
    });

    // -----------------------------------------------------------------------
    // TEST 2: Venta Física de Producto Simple
    // -----------------------------------------------------------------------
    await test("Venta física de producto simple (sin variantes)", async () => {
      const sale = await InventoryService.quickPhysicalSale(
        {
          productId: simpleProduct.id,
          quantity: 3,
          notes: "Venta física taza",
        },
        adminId
      );

      if (sale.previousStock !== 10 || sale.newStock !== 7) {
        throw new Error(`Stock incorrecto en producto simple. Anterior: ${sale.previousStock}, Nuevo: ${sale.newStock}`);
      }
    });

    // -----------------------------------------------------------------------
    // TEST 3: Entrada de Mercancía (ENTRADA)
    // -----------------------------------------------------------------------
    await test("Entrada de Mercancía: Incremento de existencias y trazabilidad", async () => {
      const entry = await InventoryService.createStockEntry(
        {
          productId: variantProduct.id,
          variantId: variantM.id,
          quantity: 10,
          notes: "Lote recibido de proveedor taller local",
          referenceId: "FACT-SUP-901",
        },
        adminId
      );

      // Tenía 3 (5 - 2 de la venta física anterior). 3 + 10 = 13.
      if (entry.newStock !== 13) {
        throw new Error(`Se esperaba stock 13 tras entrada, se obtuvo: ${entry.newStock}`);
      }

      const movement = await prisma.inventoryMovement.findUnique({
        where: { id: entry.movementId },
      });
      if (!movement || movement.movementType !== MovementType.ENTRADA || movement.quantity !== 10) {
        throw new Error("Movimiento de ENTRADA no registrado fielmente");
      }
    });

    // -----------------------------------------------------------------------
    // TEST 4: Ajustes Manuales (AJUSTE) - Por DELTA y por EXACT
    // -----------------------------------------------------------------------
    await test("Ajuste Manual: Modificación por Delta y Fijación Exacta con motivo", async () => {
      // Delta: -3 por merma/rotura
      const adjDelta = await InventoryService.adjustStock(
        {
          productId: simpleProduct.id,
          type: "DELTA",
          value: -2,
          notes: "2 tazas rotas al desembalar",
        },
        adminId
      );
      // Tenía 7. 7 - 2 = 5.
      if (adjDelta.newStock !== 5 || adjDelta.delta !== -2) {
        throw new Error(`Ajuste delta incorrecto. Stock esperado: 5, obtenido: ${adjDelta.newStock}`);
      }

      // Exacto: Auditoría física determinó que hay 15 unidades de variantM
      const adjExact = await InventoryService.adjustStock(
        {
          productId: variantProduct.id,
          variantId: variantM.id,
          type: "EXACT",
          value: 15,
          notes: "Recuento físico de auditoría mensual",
        },
        adminId
      );
      if (adjExact.newStock !== 15) {
        throw new Error(`Ajuste exacto incorrecto. Esperado: 15, obtenido: ${adjExact.newStock}`);
      }
    });

    // -----------------------------------------------------------------------
    // TEST 5: Devolución de Producto (DEVOLUCION)
    // -----------------------------------------------------------------------
    await test("Devolución de Producto: Reingreso de unidad al stock disponible", async () => {
      const ret = await InventoryService.recordReturn(
        {
          productId: simpleProduct.id,
          quantity: 1,
          notes: "Cliente devolvió producto en perfecto estado",
          referenceId: "RET-2026-01",
        },
        adminId
      );

      // Tenía 5. 5 + 1 = 6.
      if (ret.newStock !== 6) {
        throw new Error(`Se esperaba stock 6 tras devolución, se obtuvo: ${ret.newStock}`);
      }
    });

    // -----------------------------------------------------------------------
    // TEST 6: Ciclo de Reserva y Cancelación (RESERVA -> CANCELACION_RESERVA)
    // -----------------------------------------------------------------------
    await test("Reservas: Retención temporal de stock y posterior liberación por cancelación", async () => {
      // variantM tiene 15. Reservamos 4 para transferencia bancaria.
      const reservation = await InventoryService.reserveStock(
        {
          productId: variantProduct.id,
          variantId: variantM.id,
          quantity: 4,
          notes: "Esperando comprobante de depósito",
          referenceId: "ORD-RES-001",
        },
        adminId
      );

      if (reservation.newStock !== 11) {
        throw new Error(`Stock no retenido adecuadamente. Esperado: 11, obtenido: ${reservation.newStock}`);
      }

      // Cancelamos la reserva (tiempo expiró)
      const cancellation = await InventoryService.cancelReservation(
        {
          productId: variantProduct.id,
          variantId: variantM.id,
          quantity: 4,
          notes: "Comprobante no enviado en plazo límite de 24h",
          referenceId: "ORD-RES-001",
        },
        adminId
      );

      if (cancellation.newStock !== 15) {
        throw new Error(`Stock no liberado adecuadamente. Esperado: 15, obtenido: ${cancellation.newStock}`);
      }
    });

    // -----------------------------------------------------------------------
    // TEST 7: Caso Límite - Cantidad Superior al Stock Disponible
    // -----------------------------------------------------------------------
    await test("Caso Límite: Solicitud de cantidad superior al stock arroja InsufficientStockError", async () => {
      let blocked = false;
      try {
        await InventoryService.quickPhysicalSale({
          productId: simpleProduct.id,
          quantity: 9999, // Stock actual es 6
        });
      } catch (err) {
        if (err instanceof InsufficientStockError) {
          blocked = true;
        }
      }

      if (!blocked) {
        throw new Error("No se arrojó InsufficientStockError ante una solicitud excesiva");
      }
    });

    // -----------------------------------------------------------------------
    // TEST 8: Caso Límite - Stock 0
    // -----------------------------------------------------------------------
    await test("Caso Límite: Venta cuando el stock es 0 es rechazada", async () => {
      // Fijar stock a 0
      await prisma.product.update({
        where: { id: simpleProduct.id },
        data: { stock: 0 },
      });

      let blocked = false;
      try {
        await InventoryService.quickPhysicalSale({
          productId: simpleProduct.id,
          quantity: 1,
        });
      } catch (err) {
        if (err instanceof InsufficientStockError) {
          blocked = true;
        }
      }

      if (!blocked) {
        throw new Error("Se permitió vender un artículo con stock 0!");
      }
    });

    // -----------------------------------------------------------------------
    // TEST 9: Concurrencia Extrema - Dos ventas simultáneas por la última unidad
    // -----------------------------------------------------------------------
    await test("Concurrencia: Dos ventas simultáneas por la última unidad (bloqueo pesimista)", async () => {
      // variantL tiene exactamente 1 unidad en stock
      await prisma.productVariant.update({
        where: { id: variantL.id },
        data: { stock: 1 },
      });

      // Lanzar dos operaciones en paralelo estricto
      const results = await Promise.allSettled([
        InventoryService.quickPhysicalSale({
          productId: variantProduct.id,
          variantId: variantL.id,
          quantity: 1,
          notes: "Venta concurrente A",
        }),
        InventoryService.quickPhysicalSale({
          productId: variantProduct.id,
          variantId: variantL.id,
          quantity: 1,
          notes: "Venta concurrente B",
        }),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      if (fulfilled.length !== 1 || rejected.length !== 1) {
        throw new Error(
          `Condición de carrera fallida: Esperado 1 éxito y 1 rechazo. Éxitos: ${fulfilled.length}, Rechazos: ${rejected.length}`
        );
      }

      const finalVariant = await prisma.productVariant.findUniqueOrThrow({
        where: { id: variantL.id },
      });

      if (finalVariant.stock !== 0) {
        throw new Error(`El stock final debe ser exactamente 0, pero es: ${finalVariant.stock}`);
      }
    });

    // -----------------------------------------------------------------------
    // TEST 10: Prevención a nivel de Motor PostgreSQL (CHECK stock >= 0)
    // -----------------------------------------------------------------------
    await test("Motor PostgreSQL: Restricción CHECK previene escrituras negativas directas", async () => {
      let constraintBlocked = false;
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE product_variants SET stock = -1 WHERE id = '${variantM.id}';`
        );
      } catch (e) {
        constraintBlocked = true;
      }

      if (!constraintBlocked) {
        throw new Error("El motor PostgreSQL no aplicó la restricción CHECK (stock >= 0)!");
      }
    });
  } finally {
    // Limpieza de datos de prueba
    await prisma.inventoryMovement.deleteMany({
      where: {
        OR: [{ productId: simpleProduct.id }, { productId: variantProduct.id }],
      },
    });
    await prisma.productVariant.deleteMany({ where: { productId: variantProduct.id } });
    await prisma.product.deleteMany({
      where: { OR: [{ id: simpleProduct.id }, { id: variantProduct.id }] },
    });
    await prisma.category.delete({ where: { id: testCategory.id } });
  }

  console.log("\n📦 ========================================================");
  console.log(`📦 RESULTADOS: ${passed}/${total} PRUEBAS DE INVENTARIO SUPERADAS`);
  console.log("📦 ========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runInventoryTests()
  .catch((e) => {
    console.error("Error fatal en pruebas de inventario:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
