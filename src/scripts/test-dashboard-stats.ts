import { prisma } from "../lib/db";
import { DashboardService, CONFIRMED_SALES_STATUSES } from "../core/dashboard/dashboard-service";
import { MovementType, OrderStatus } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("           SUITE DE PRUEBAS: DASHBOARD ADMINISTRATIVO DE TIENDADELKI           ");
  console.log("================================================================================");

  let passedTests = 0;
  const totalTests = 7;

  try {
    // Preparar tienda y categorías si no existen
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: {
          name: "TiendaDelki Test Store",
          slug: "tiendadelki-test-store",
        },
      });
    }

    let category = await prisma.category.findFirst({ where: { name: "Dashboard Test Cat" } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: "Dashboard Test Cat",
          slug: "dashboard-test-cat-" + Date.now(),
        },
      });
    }

    let shipping = await prisma.shippingMethod.findFirst();
    if (!shipping) {
      shipping = await prisma.shippingMethod.create({
        data: {
          name: "Envío Estándar Test",
          price: 200,
        },
      });
    }

    // TEST 1: Crear producto simple con stock bajo y producto con stock agotado
    console.log("\n--- TEST 1: Verificación de Inventario Físico (Stock Bajo y Agotado) ---");
    const lowStockProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: `Producto Stock Bajo ${Date.now()}`,
        slug: `producto-stock-bajo-${Date.now()}`,
        basePrice: 1500,
        sku: `DASH-LOW-${Date.now().toString().slice(-5)}`,
        stock: 2,
        minStock: 5, // stock <= minStock => LOW STOCK
      },
    });

    const outOfStockProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: `Producto Agotado ${Date.now()}`,
        slug: `producto-agotado-${Date.now()}`,
        basePrice: 2000,
        sku: `DASH-OUT-${Date.now().toString().slice(-5)}`,
        stock: 0,
        minStock: 2, // stock === 0 => OUT OF STOCK
      },
    });

    const stats1 = await DashboardService.getDashboardStats();
    if (stats1.kpis.productosStockBajo.count >= 1 && stats1.kpis.productosAgotados.count >= 1) {
      console.log(`✓ Test 1 Exitoso: Stock bajo (${stats1.kpis.productosStockBajo.count}) y agotados (${stats1.kpis.productosAgotados.count}) calculados correctamente.`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 1: Esperaba al menos 1 bajo y 1 agotado.`);
    }

    // TEST 2: Venta Física NO debe sumar ventas monetarias pero SÍ reflejarse en inventario
    console.log("\n--- TEST 2: Venta Física NO suma facturación online pero descuenta inventario ---");
    const initialRevenue = stats1.kpis.ventas.totalRevenue;
    
    // Registrar movimiento de venta física en mostrador
    await prisma.inventoryMovement.create({
      data: {
        productId: lowStockProduct.id,
        movementType: MovementType.VENTA_FISICA,
        quantity: -1,
        previousStock: 2,
        newStock: 1,
        referenceType: "COUNTER_SALE",
        notes: "Venta física de prueba sin factura",
      },
    });
    await prisma.product.update({
      where: { id: lowStockProduct.id },
      data: { stock: 1 },
    });

    const stats2 = await DashboardService.getDashboardStats();
    if (stats2.kpis.ventas.totalRevenue === initialRevenue) {
      console.log(`✓ Test 2 Exitoso: Venta física descontó stock pero NO aumentó las ventas online (RD$ ${stats2.kpis.ventas.totalRevenue}).`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 2: Las ventas online cambiaron indebidamente tras una venta física.`);
    }

    // TEST 3: Orden con Pago en Revisión genera Alerta y se contabiliza en Pagos en Revisión
    console.log("\n--- TEST 3: Pedido en PAGO_EN_REVISION y Alertas Operativas ---");
    const reviewOrderNumber = `TK-REV-${Date.now().toString().slice(-4)}`;
    const reviewOrder = await prisma.order.create({
      data: {
        orderNumber: reviewOrderNumber,
        storeId: store.id,
        guestName: "Cliente Revision Test",
        guestPhone: "8095551234",
        guestWhatsapp: "8095551234",
        shippingMethodId: shipping.id,
        shippingCost: 200,
        subtotal: 1500,
        total: 1700,
        status: OrderStatus.PAGO_EN_REVISION,
        shippingAddress: { city: "Santo Domingo", address: "Av Winston Churchill" },
        proofOfPaymentUrl: "https://example.com/voucher.jpg",
        proofUploadedAt: new Date(),
        items: {
          create: {
            productId: lowStockProduct.id,
            productTitle: lowStockProduct.name,
            sku: lowStockProduct.sku || "DASH-SKU",
            unitPrice: 1500,
            quantity: 1,
            totalPrice: 1500,
            snapshot: { name: lowStockProduct.name },
          },
        },
      },
    });

    const stats3 = await DashboardService.getDashboardStats();
    const hasReviewAlert = stats3.alertas.some((a) => a.id === "alert_pagos_revision" && a.count > 0);
    if (stats3.kpis.pagosEnRevision.count >= 1 && hasReviewAlert) {
      console.log(`✓ Test 3 Exitoso: Pedidos en revisión (${stats3.kpis.pagosEnRevision.count}) y alerta correspondiente generada.`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 3: No se generó la métrica o alerta de pagos en revisión.`);
    }

    // TEST 4: Pedido PAGADO y PREPARANDO se suma a ventas online y genera alerta de empaque
    console.log("\n--- TEST 4: Ventas Online Confirmadas (PAGADO / PREPARANDO) ---");
    const prepOrderNumber = `TK-PREP-${Date.now().toString().slice(-4)}`;
    const prepOrder = await prisma.order.create({
      data: {
        orderNumber: prepOrderNumber,
        storeId: store.id,
        guestName: "Cliente Pagado Test",
        guestPhone: "8095555678",
        guestWhatsapp: "8095555678",
        shippingMethodId: shipping.id,
        shippingCost: 200,
        subtotal: 3000,
        total: 3200,
        status: OrderStatus.PREPARANDO, // Confirmado y listo para despacho
        shippingAddress: { city: "Santiago", address: "Calle del Sol #4" },
        items: {
          create: {
            productId: lowStockProduct.id,
            productTitle: lowStockProduct.name,
            sku: lowStockProduct.sku || "DASH-SKU",
            unitPrice: 1500,
            quantity: 2,
            totalPrice: 3000,
            snapshot: { name: lowStockProduct.name },
          },
        },
      },
    });

    const stats4 = await DashboardService.getDashboardStats();
    const hasPrepAlert = stats4.alertas.some((a) => a.id === "alert_pedidos_preparando" && a.count > 0);
    if (stats4.kpis.ventas.totalRevenue >= 3200 && hasPrepAlert) {
      console.log(`✓ Test 4 Exitoso: Venta online confirmada sumada a ingresos (RD$ ${stats4.kpis.ventas.totalRevenue}) y alerta de empaque generada.`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 4: Las ventas no sumaron la orden confirmada o faltó alerta de preparación.`);
    }

    // TEST 5: Series temporales de Ventas por Día, Semana y Mes
    console.log("\n--- TEST 5: Agrupaciones Temporales (Día, Semana, Mes) ---");
    if (
      stats4.charts.ventasPorDia.length === 14 &&
      stats4.charts.ventasPorSemana.length === 8 &&
      stats4.charts.ventasPorMes.length === 6
    ) {
      console.log(`✓ Test 5 Exitoso: Series temporales generadas con 14 días, 8 semanas y 6 meses de histórico.`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 5: Estructura de series temporales incorrecta.`);
    }

    // TEST 6: Ranking de Productos Más Vendidos y Categorías
    console.log("\n--- TEST 6: Productos y Categorías Más Vendidas ---");
    const topProd = stats4.charts.productosMasVendidos.find((p) => p.productId === lowStockProduct.id);
    if (topProd && topProd.unitsSold >= 2) {
      console.log(`✓ Test 6 Exitoso: Producto líder correctamente identificado con ${topProd.unitsSold} unidades vendidas.`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 6: No se encontró el producto en el ranking de más vendidos.`);
    }

    // TEST 7: Desglose de Estados de Pedidos
    console.log("\n--- TEST 7: Distribución de Pedidos por Estado ---");
    const prepStatus = stats4.charts.pedidosPorEstado.find((s) => s.status === "PREPARANDO");
    const reviewStatus = stats4.charts.pedidosPorEstado.find((s) => s.status === "PAGO_EN_REVISION");
    if (prepStatus && prepStatus.count >= 1 && reviewStatus && reviewStatus.count >= 1) {
      console.log(`✓ Test 7 Exitoso: Desglose completo de estados de pedidos verificado.`);
      passedTests++;
    } else {
      throw new Error(`Fallo en Test 7: Conteo por estado inexacto.`);
    }

    console.log("\n================================================================================");
    console.log(`RESULTADO FINAL: ${passedTests} / ${totalTests} PRUEBAS SUPERADAS EXITOSAMENTE.`);
    console.log("================================================================================\n");

    // Limpieza de datos de prueba
    await prisma.orderItem.deleteMany({ where: { orderId: { in: [reviewOrder.id, prepOrder.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [reviewOrder.id, prepOrder.id] } } });
    await prisma.inventoryMovement.deleteMany({ where: { productId: lowStockProduct.id } });
    await prisma.product.deleteMany({ where: { id: { in: [lowStockProduct.id, outOfStockProduct.id] } } });
  } catch (err) {
    console.error("❌ ERROR DURANTE LAS PRUEBAS:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
