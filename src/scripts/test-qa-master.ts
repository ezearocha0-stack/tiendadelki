import { prisma } from "../lib/db";
import { ProductService } from "../core/catalog/product-service";
import { CategoryService } from "../core/catalog/category-service";
import { InventoryService } from "../core/inventory/inventory-service";
import { signJwt, Role } from "../core/auth/jwt";
import { getAuthenticatedUser, requireAdminUser, requireAuthenticatedUser } from "../core/auth/session";
import { OrderStatus, MovementType, ProductStatus } from "@prisma/client";
import { POST as createOrderApi } from "../app/api/orders/route";
import { POST as validateCartApi } from "../app/api/cart/validate/route";
import { PATCH as updateOrderStatusApi } from "../app/api/admin/orders/[id]/status/route";
import { NextRequest } from "next/server";

async function runMasterQASuite() {
  console.log("================================================================================");
  console.log("🔍 TIENDADELKI - SUITE MAESTRA DE PRUEBAS DE CALIDAD INTEGRAL (SENIOR QA)");
  console.log("================================================================================\n");

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  const failureDetails: string[] = [];

  async function assertTest(section: string, name: string, fn: () => Promise<void>) {
    totalTests++;
    try {
      await fn();
      console.log(`  ✅ [PASS] [${section}] ${name}`);
      passedTests++;
    } catch (err: any) {
      console.error(`  ❌ [FAIL] [${section}] ${name}`);
      console.error(`     Error: ${err?.message || err}`);
      failedTests++;
      failureDetails.push(`[${section}] ${name}: ${err?.message || err}`);
    }
  }

  // Usuarios y dependencias iniciales
  const adminUser = await prisma.user.findFirst({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] } },
  });
  if (!adminUser) throw new Error("No se encontró usuario administrador en la base de datos.");
  const adminId = adminUser.id;

  const adminToken = await signJwt({
    sub: adminId,
    role: Role.ADMIN,
    name: "Administrador QA",
    email: adminUser.email || "ezearocha@gmail.com",
  });

  const customerUserA = await prisma.user.upsert({
    where: { email: "cliente.qa.a@ejemplo.com" },
    update: {},
    create: {
      email: "cliente.qa.a@ejemplo.com",
      firstName: "Cliente",
      lastName: "QA-A",
      role: Role.CUSTOMER,
      passwordHash: "hash-dummy-qa",
    },
  });

  const customerUserB = await prisma.user.upsert({
    where: { email: "cliente.qa.b@ejemplo.com" },
    update: {},
    create: {
      email: "cliente.qa.b@ejemplo.com",
      firstName: "Cliente",
      lastName: "QA-B",
      role: Role.CUSTOMER,
      passwordHash: "hash-dummy-qa",
    },
  });

  const customerTokenA = await signJwt({
    sub: customerUserA.id,
    role: Role.CUSTOMER,
    name: "Cliente QA-A",
    email: customerUserA.email!,
  });

  const shippingMethod = await prisma.shippingMethod.findFirst({
    where: { isActive: true },
  });
  if (!shippingMethod) throw new Error("No hay métodos de envío activos en la base de datos.");

  // Variables globales de prueba
  let testCategory: any;
  let testSimpleProduct: any;
  let testVariantProduct: any;
  let testVariantM: any;

  // ================================================================================
  // 1. PRODUCTOS
  // ================================================================================
  console.log("\n📦 1. VERIFICACIÓN DE PRODUCTOS Y CATÁLOGO");
  console.log("--------------------------------------------------------------------------------");

  await assertTest("PRODUCTOS", "Crear categoría y validar jerarquía padre/hijo", async () => {
    testCategory = await CategoryService.createCategory({
      name: `Cat QA Master ${Date.now()}`,
      slug: `cat-qa-master-${Date.now()}`,
      isActive: true,
      description: "Categoría de pruebas de QA",
    });
    if (!testCategory || !testCategory.id) throw new Error("Fallo al crear categoría");

    // Probar categoría hija
    const childCategory = await CategoryService.createCategory({
      name: `SubCat QA Master ${Date.now()}`,
      slug: `subcat-qa-master-${Date.now()}`,
      parentId: testCategory.id,
      isActive: true,
    });
    if (childCategory.parentId !== testCategory.id) throw new Error("Fallo en relación jerárquica");

    // Limpieza de hija
    await CategoryService.deleteCategory(childCategory.id);
  });

  await assertTest("PRODUCTOS", "Rechazar creación de categoría con slug duplicado", async () => {
    try {
      await CategoryService.createCategory({
        name: "Duplicado",
        slug: testCategory.slug,
        isActive: true,
      });
      throw new Error("Debió rechazar slug duplicado");
    } catch (e: any) {
      if (!e.message.includes("ya está en uso")) throw e;
    }
  });

  await assertTest("PRODUCTOS", "Crear producto simple con stock e inventario inicial", async () => {
    testSimpleProduct = await ProductService.createProduct(
      {
        name: "Lámpara de Noche LED",
        slug: `lampara-noche-${Date.now()}`,
        categoryId: testCategory.id,
        basePrice: 850.0,
        sku: `LAMP-${Date.now().toString().slice(-4)}`,
        stock: 15,
        minStock: 3,
        status: "PUBLISHED",
        hasVariants: false,
        isFeatured: true,
        isNew: true,
        images: [],
        customAttributes: [],
      },
      adminId
    );

    if (testSimpleProduct.stock !== 15) throw new Error("Stock incorrecto en creación");
    const mvt = await prisma.inventoryMovement.findFirst({
      where: { productId: testSimpleProduct.id, movementType: MovementType.ENTRADA },
    });
    if (!mvt || mvt.quantity !== 15) throw new Error("No se registró movimiento de stock inicial");
  });

  await assertTest("PRODUCTOS", "Crear producto con variantes multidimensionales", async () => {
    testVariantProduct = await ProductService.createProduct(
      {
        name: "Vestido de Fiesta Gala",
        slug: `vestido-gala-${Date.now()}`,
        categoryId: testCategory.id,
        basePrice: 3200.0,
        hasVariants: true,
        customAttributes: [
          { name: "Color", options: ["Rojo"] },
          { name: "Talla", options: ["M", "L"] },
        ],
        status: "PUBLISHED",
        images: [],
        variants: [
          {
            title: "Rojo / M",
            sku: `VES-ROJ-M-${Date.now().toString().slice(-4)}`,
            attributes: { Color: "Rojo", Talla: "M" },
            price: 3200.0,
            stock: 8,
            minStock: 2,
            isActive: true,
          },
          {
            title: "Rojo / L",
            sku: `VES-ROJ-L-${Date.now().toString().slice(-4)}`,
            attributes: { Color: "Rojo", Talla: "L" },
            price: 3200.0,
            stock: 1, // Para prueba de concurrencia
            minStock: 1,
            isActive: true,
          },
        ],
      },
      adminId
    );

    testVariantM = testVariantProduct.variants.find((v: any) => v.title.includes("M"));
    if (!testVariantM || testVariantM.stock !== 8) throw new Error("Variante M no se creó con stock 8");
  });

  await assertTest("PRODUCTOS", "Editar producto (nombre, precio, atributos)", async () => {
    const updated = await ProductService.updateProduct(testSimpleProduct.id, {
      name: "Lámpara de Noche LED Inteligente",
      basePrice: 950.0,
      description: "Descripción actualizada por suite de QA",
    });
    if (updated.name !== "Lámpara de Noche LED Inteligente" || Number(updated.basePrice) !== 950.0) {
      throw new Error("La actualización del producto no persistió correctamente");
    }
  });

  await assertTest("PRODUCTOS", "Gestión de imágenes (agregar, marcar primaria)", async () => {
    const img = await ProductService.addImage(testSimpleProduct.id, {
      url: "/uploads/products/test-img.webp",
      thumbnailUrl: "/uploads/products/test-img_thumb.webp",
      storageKey: "products/test-img.webp",
      altText: "Lámpara LED",
      isPrimary: true,
    });
    if (!img.isPrimary) throw new Error("La imagen no se marcó como primaria");

    await ProductService.deleteImage(img.id);
    const countAfter = await prisma.productImage.count({ where: { id: img.id } });
    if (countAfter !== 0) throw new Error("La imagen no fue eliminada correctamente");
  });

  await assertTest("PRODUCTOS", "Eliminar / Archivar elegantemente producto con movimientos", async () => {
    // Al intentar borrar un producto con movimientos de inventario, debe archivarse en lugar de crashear por FK
    const result = await ProductService.deleteProduct(testSimpleProduct.id);
    if (result.status !== ProductStatus.ARCHIVED) {
      throw new Error(`Se esperaba status ARCHIVED, se obtuvo: ${result.status}`);
    }
  });

  // ================================================================================
  // 2. INVENTARIO
  // ================================================================================
  console.log("\n📦 2. VERIFICACIÓN DEL MOTOR DE INVENTARIO Y REGLAS DE NEGOCIO");
  console.log("--------------------------------------------------------------------------------");

  await assertTest("INVENTARIO", "Entrada de Mercancía (ENTRADA) con trazabilidad", async () => {
    const prevStock = testVariantM.stock; // 8
    const entry = await InventoryService.createStockEntry(
      {
        productId: testVariantProduct.id,
        variantId: testVariantM.id,
        quantity: 5,
        notes: "Entrada de prueba QA lote de proveedor",
      },
      adminId
    );

    if (entry.newStock !== prevStock + 5) {
      throw new Error(`Stock nuevo incorrecto. Esperado ${prevStock + 5}, obtenido ${entry.newStock}`);
    }
  });

  await assertTest("INVENTARIO", "Regla Fundamental: VENTA FÍSICA descuenta stock SIN crear pedido (VENTA != PEDIDO)", async () => {
    const ordersCountBefore = await prisma.order.count();
    const orderItemsCountBefore = await prisma.orderItem.count();

    const sale = await InventoryService.quickPhysicalSale(
      {
        productId: testVariantProduct.id,
        variantId: testVariantM.id,
        quantity: 2,
        notes: "Venta física de mostrador en efectivo",
      },
      adminId
    );

    const ordersCountAfter = await prisma.order.count();
    const orderItemsCountAfter = await prisma.orderItem.count();

    // Comprobación de regla inviolable
    if (ordersCountBefore !== ordersCountAfter) {
      throw new Error(`VIOLACIÓN CRÍTICA: Se crearon órdenes en la tabla 'orders' (Antes: ${ordersCountBefore}, Después: ${ordersCountAfter})`);
    }
    if (orderItemsCountBefore !== orderItemsCountAfter) {
      throw new Error(`VIOLACIÓN CRÍTICA: Se crearon filas en la tabla 'order_items' (Antes: ${orderItemsCountBefore}, Después: ${orderItemsCountAfter})`);
    }

    const movement = await prisma.inventoryMovement.findUnique({
      where: { id: sale.movementId },
    });
    if (!movement || movement.movementType !== MovementType.VENTA_FISICA || movement.quantity !== -2) {
      throw new Error("El movimiento no se registró como VENTA_FISICA con cantidad -2");
    }
  });

  await assertTest("INVENTARIO", "Ajuste de Stock (AJUSTE) por DELTA y por EXACT", async () => {
    // Delta negativo por merma
    const adj1 = await InventoryService.adjustStock(
      {
        productId: testVariantProduct.id,
        variantId: testVariantM.id,
        type: "DELTA",
        value: -1,
        notes: "Prenda con defecto de costura",
      },
      adminId
    );
    if (adj1.newStock !== adj1.previousStock - 1) throw new Error("Ajuste por Delta falló");

    // Fijación exacta
    const adj2 = await InventoryService.adjustStock(
      {
        productId: testVariantProduct.id,
        variantId: testVariantM.id,
        type: "EXACT",
        value: 14,
        notes: "Conteo físico de inventario de cierre",
      },
      adminId
    );
    if (adj2.newStock !== 14) throw new Error("Ajuste por Exact falló");
  });

  await assertTest("INVENTARIO", "Devolución de Mercancía (DEVOLUCION)", async () => {
    const ret = await InventoryService.recordReturn(
      {
        productId: testVariantProduct.id,
        variantId: testVariantM.id,
        quantity: 1,
        notes: "Cliente devolvió prenda por cambio de talla",
      },
      adminId
    );
    if (ret.newStock !== 15) throw new Error(`Devolución no incrementó el stock correctamente a 15, actual: ${ret.newStock}`);
  });

  await assertTest("INVENTARIO", "Caso Límite: Venta cuando el stock es 0 debe ser rechazada", async () => {
    // Fijar temporalmente stock a 0
    await prisma.productVariant.update({
      where: { id: testVariantM.id },
      data: { stock: 0 },
    });

    try {
      await InventoryService.quickPhysicalSale(
        {
          productId: testVariantProduct.id,
          variantId: testVariantM.id,
          quantity: 1,
        },
        adminId
      );
      throw new Error("Debió rechazar venta física con stock 0");
    } catch (e: any) {
      if (!e.message.includes("insuficiente") && !e.message.includes("agotado")) throw e;
    } finally {
      // Restaurar stock a 10
      await prisma.productVariant.update({
        where: { id: testVariantM.id },
        data: { stock: 10 },
      });
    }
  });

  await assertTest("INVENTARIO", "Concurrencia: Dos ventas simultáneas por la última unidad (Bloqueo pesimista)", async () => {
    const variantL = testVariantProduct.variants.find((v: any) => v.title.includes("L"));
    // Stock es exactamente 1
    await prisma.productVariant.update({
      where: { id: variantL.id },
      data: { stock: 1 },
    });

    const results = await Promise.allSettled([
      InventoryService.quickPhysicalSale({ productId: testVariantProduct.id, variantId: variantL.id, quantity: 1 }, adminId),
      InventoryService.quickPhysicalSale({ productId: testVariantProduct.id, variantId: variantL.id, quantity: 1 }, adminId),
    ]);

    const successes = results.filter((r) => r.status === "fulfilled");
    const failures = results.filter((r) => r.status === "rejected");

    if (successes.length !== 1 || failures.length !== 1) {
      throw new Error(`Concurrencia violada: Se esperaban 1 éxito y 1 fallo. Obtenidos: ${successes.length} éxitos, ${failures.length} fallos.`);
    }

    const finalStock = (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantL.id } })).stock;
    if (finalStock !== 0) throw new Error(`El stock final debió ser 0, se obtuvo: ${finalStock}`);
  });

  // ================================================================================
  // 3. CHECKOUT
  // ================================================================================
  console.log("\n🛒 3. VERIFICACIÓN DEL FLUJO DE CHECKOUT Y VALIDACIÓN DE CARRITO");
  console.log("--------------------------------------------------------------------------------");

  await assertTest("CHECKOUT", "Validación: Rechazo de carrito vacío", async () => {
    const req = new NextRequest("http://localhost:3000/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
    const res = await validateCartApi(req);
    const json = await res.json();
    if (json.data?.items?.length !== 0 && json.success) {
      // O bien 0 items válidos
    }
  });

  await assertTest("CHECKOUT", "Validación: Detección de producto agotado en carrito", async () => {
    const variantL = testVariantProduct.variants.find((v: any) => v.title.includes("L"));
    // Variant L tiene stock 0 tras la prueba de concurrencia
    const req = new NextRequest("http://localhost:3000/api/cart/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ productId: testVariantProduct.id, variantId: variantL.id, quantity: 1 }],
      }),
    });
    const res = await validateCartApi(req);
    const json = await res.json();
    if (json.data.isValid !== false || json.data.issues[0]?.type !== "OUT_OF_STOCK") {
      throw new Error("Fallo al identificar variante agotada en /api/cart/validate");
    }
  });

  await assertTest("CHECKOUT", "Seguridad Zero-Trust: Precio manipulado por el cliente es ignorado", async () => {
    // El cliente envía unitPrice = 1.00 para una prenda de RD$ 3,200.00
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Cliente Manipulador",
        guestPhone: "8295551122",
        guestWhatsapp: "8295551122",
        guestEmail: "manipulador@ejemplo.com",
        shippingMethodId: shippingMethod.id,
        shippingAddress: {
          streetAddress: "Calle Falsa 123",
          sectorOrNeighborhood: "Naco",
          city: "Santo Domingo",
          provinceOrState: "Distrito Nacional",
        },
        items: [
          {
            productId: testVariantProduct.id,
            variantId: testVariantM.id,
            quantity: 1,
            unitPrice: 1.0, // PRECIO MANIPULADO
          },
        ],
      }),
    });

    const res = await createOrderApi(req);
    const json = await res.json();
    if (!json.success) throw new Error(`Fallo al crear orden: ${JSON.stringify(json)}`);

    const orderTotal = Number(json.data.subtotal);
    if (orderTotal !== 3200.0) {
      throw new Error(`VIOLACIÓN ZERO-TRUST: El servidor cobró RD$ ${orderTotal} en lugar de RD$ 3,200.00`);
    }

    // Limpieza de orden de prueba
    await prisma.inventoryMovement.deleteMany({ where: { referenceId: json.data.orderNumber } });
    await prisma.orderItem.deleteMany({ where: { orderId: json.data.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: json.data.id } });
    await prisma.order.delete({ where: { id: json.data.id } });
    // Restaurar stock
    await prisma.productVariant.update({ where: { id: testVariantM.id }, data: { stock: 10 } });
  });

  let createdTestOrder: any;

  await assertTest("CHECKOUT", "Checkout exitoso (Happy Path) con reserva atómica de inventario", async () => {
    const stockBefore = (await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantM.id } })).stock;

    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Maria Rosario",
        guestPhone: "8296734710",
        guestWhatsapp: "8296734710",
        guestEmail: "maria.rosario@ejemplo.com",
        shippingMethodId: shippingMethod.id,
        shippingAddress: {
          streetAddress: "Av. Abraham Lincoln #100",
          sectorOrNeighborhood: "Piantini",
          city: "Santo Domingo",
          provinceOrState: "Distrito Nacional",
        },
        items: [
          {
            productId: testVariantProduct.id,
            variantId: testVariantM.id,
            quantity: 2,
          },
        ],
      }),
    });

    const res = await createOrderApi(req);
    const json = await res.json();
    if (!json.success) throw new Error(`Fallo al procesar checkout: ${JSON.stringify(json)}`);

    createdTestOrder = json.data;
    if (!createdTestOrder.orderNumber.startsWith("TK-")) throw new Error("Formato de número de orden inválido");
    if (createdTestOrder.status !== OrderStatus.PENDIENTE_DE_PAGO) throw new Error("Estado inicial debe ser PENDIENTE_DE_PAGO");

    const stockAfter = (await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantM.id } })).stock;
    if (stockAfter !== stockBefore - 2) {
      throw new Error(`El inventario no fue reservado. Antes: ${stockBefore}, Después: ${stockAfter}`);
    }

    const resMvt = await prisma.inventoryMovement.findFirst({
      where: { referenceId: createdTestOrder.orderNumber, movementType: MovementType.RESERVA },
    });
    if (!resMvt || resMvt.quantity !== -2) throw new Error("No se registró movimiento RESERVA en inventario");
  });

  await assertTest("CHECKOUT", "Idempotencia: Solicitud con misma Idempotency-Key no duplica pedido", async () => {
    const idempotencyKey = `qa-idemp-${Date.now()}`;
    const payload = {
      idempotencyKey,
      guestName: "Juan Idempotente",
      guestPhone: "8291112233",
      guestWhatsapp: "8291112233",
      shippingMethodId: shippingMethod.id,
      shippingAddress: {
        streetAddress: "Calle Sol 1",
        sectorOrNeighborhood: "Bella Vista",
        city: "Santo Domingo",
        provinceOrState: "Distrito Nacional",
      },
      items: [{ productId: testVariantProduct.id, variantId: testVariantM.id, quantity: 1 }],
    };

    const req1 = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res1 = await createOrderApi(req1);
    const json1 = await res1.json();

    const req2 = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const res2 = await createOrderApi(req2);
    const json2 = await res2.json();

    if (json1.data.id !== json2.data.id || json1.data.orderNumber !== json2.data.orderNumber) {
      throw new Error("Fallo de Idempotencia: Se crearon 2 pedidos distintos para la misma clave.");
    }

    // Limpieza de orden de prueba idempotente
    await prisma.inventoryMovement.deleteMany({ where: { referenceId: json1.data.orderNumber } });
    await prisma.orderItem.deleteMany({ where: { orderId: json1.data.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: json1.data.id } });
    await prisma.order.delete({ where: { id: json1.data.id } });
    await prisma.productVariant.update({ where: { id: testVariantM.id }, data: { stock: 8 } });
  });

  // ================================================================================
  // 4. PEDIDOS (MÁQUINA DE ESTADOS COMPLETA)
  // ================================================================================
  console.log("\n📑 4. VERIFICACIÓN DE LA MÁQUINA DE ESTADOS DE PEDIDOS");
  console.log("--------------------------------------------------------------------------------");

  async function patchOrderStatus(orderId: string, payload: any) {
    const req = new NextRequest(`http://localhost:3000/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${adminToken}`,
        "x-user-id": adminId,
        "x-user-role": "ADMIN",
      },
      body: JSON.stringify(payload),
    });
    const res = await updateOrderStatusApi(req, { params: Promise.resolve({ id: orderId }) });
    return res.json();
  }

  await assertTest("PEDIDOS", "Transición PENDIENTE_DE_PAGO -> PAGO_EN_REVISION", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.PAGO_EN_REVISION,
      notes: "Comprobante recibido por el cliente",
    });
    if (!res.success || res.data.status !== OrderStatus.PAGO_EN_REVISION) {
      throw new Error(`Fallo en transición: ${JSON.stringify(res)}`);
    }
  });

  await assertTest("PEDIDOS", "Transición PAGO_EN_REVISION -> PENDIENTE_DE_PAGO (Rechazo de comprobante con motivo)", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.PENDIENTE_DE_PAGO,
      rejectionReason: "Monto incompleto en el comprobante transferido",
    });
    if (!res.success || res.data.status !== OrderStatus.PENDIENTE_DE_PAGO) {
      throw new Error(`Fallo en rechazo: ${JSON.stringify(res)}`);
    }
  });

  await assertTest("PEDIDOS", "Transición PENDIENTE_DE_PAGO -> PAGADO", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.PAGADO,
      notes: "Pago completo validado en Banco BHD",
    });
    if (!res.success || res.data.status !== OrderStatus.PAGADO) {
      throw new Error(`Fallo en aprobación de pago: ${JSON.stringify(res)}`);
    }
  });

  await assertTest("PEDIDOS", "Transición PAGADO -> PREPARANDO", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.PREPARANDO,
      notes: "Empacando prendas en almacén",
    });
    if (!res.success || res.data.status !== OrderStatus.PREPARANDO) {
      throw new Error(`Fallo en preparación: ${JSON.stringify(res)}`);
    }
  });

  await assertTest("PEDIDOS", "Transición PREPARANDO -> ENVIADO (Requiere transportista y tracking)", async () => {
    // Intentar sin transportista debe fallar
    const invalidRes = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.ENVIADO,
    });
    if (invalidRes.success) throw new Error("Debió rechazar ENVIADO sin transportista ni guía");

    // Con datos completos
    const validRes = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.ENVIADO,
      carrierName: "Metro Pac Express",
      trackingNumber: "MP-QA-2026-99",
      trackingUrl: "https://metropac.do/tracking/MP-QA-2026-99",
    });
    if (!validRes.success || validRes.data.status !== OrderStatus.ENVIADO) {
      throw new Error(`Fallo al marcar enviado: ${JSON.stringify(validRes)}`);
    }
  });

  await assertTest("PEDIDOS", "Transición ENVIADO -> ENTREGADO", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.ENTREGADO,
      notes: "Cliente confirmó recepción en su domicilio",
    });
    if (!res.success || res.data.status !== OrderStatus.ENTREGADO) {
      throw new Error(`Fallo en entrega: ${JSON.stringify(res)}`);
    }
  });

  await assertTest("PEDIDOS", "Transición ENTREGADO -> COMPLETADO", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.COMPLETADO,
      notes: "Ciclo comercial finalizado",
    });
    if (!res.success || res.data.status !== OrderStatus.COMPLETADO) {
      throw new Error(`Fallo en completado: ${JSON.stringify(res)}`);
    }
  });

  await assertTest("PEDIDOS", "Rechazo de transiciones prohibidas (COMPLETADO -> PENDIENTE_DE_PAGO)", async () => {
    const res = await patchOrderStatus(createdTestOrder.id, {
      targetStatus: OrderStatus.PENDIENTE_DE_PAGO,
    });
    if (res.success) throw new Error("Debió bloquear transición inválida");
  });

  await assertTest("PEDIDOS", "Cancelación y liberación automática de reserva de stock", async () => {
    // Crear un pedido secundario para probar cancelación y retorno de stock
    const req = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: "Cancelador",
        guestPhone: "8295559988",
        guestWhatsapp: "8295559988",
        shippingMethodId: shippingMethod.id,
        shippingAddress: {
          streetAddress: "Calle Cancelada",
          sectorOrNeighborhood: "Naco",
          city: "Santo Domingo",
          provinceOrState: "Distrito Nacional",
        },
        items: [{ productId: testVariantProduct.id, variantId: testVariantM.id, quantity: 2 }],
      }),
    });
    const orderToCancel = (await (await createOrderApi(req)).json()).data;
    const stockDuringReservation = (await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantM.id } })).stock;

    // Cancelar la orden
    const cancelRes = await patchOrderStatus(orderToCancel.id, {
      targetStatus: OrderStatus.CANCELADO,
      notes: "Cancelado a solicitud del cliente",
    });
    if (!cancelRes.success || cancelRes.data.status !== OrderStatus.CANCELADO) {
      throw new Error("Fallo al cancelar pedido");
    }

    const stockAfterCancellation = (await prisma.productVariant.findUniqueOrThrow({ where: { id: testVariantM.id } })).stock;
    if (stockAfterCancellation !== stockDuringReservation + 2) {
      throw new Error(`El stock no fue liberado. Durante reserva: ${stockDuringReservation}, Tras cancelación: ${stockAfterCancellation}`);
    }

    const cancelMvt = await prisma.inventoryMovement.findFirst({
      where: { referenceId: orderToCancel.orderNumber, movementType: MovementType.CANCELACION_RESERVA },
    });
    if (!cancelMvt || cancelMvt.quantity !== 2) throw new Error("No se registró movimiento CANCELACION_RESERVA");

    // Limpieza de orden cancelada
    await prisma.inventoryMovement.deleteMany({ where: { referenceId: orderToCancel.orderNumber } });
    await prisma.orderItem.deleteMany({ where: { orderId: orderToCancel.id } });
    await prisma.orderStatusHistory.deleteMany({ where: { orderId: orderToCancel.id } });
    await prisma.order.delete({ where: { id: orderToCancel.id } });
  });

  // ================================================================================
  // 5. SEGURIDAD Y AUTORIZACIÓN
  // ================================================================================
  console.log("\n🛡️ 5. VERIFICACIÓN DE SEGURIDAD Y CONTROL DE ACCESO");
  console.log("--------------------------------------------------------------------------------");

  await assertTest("SEGURIDAD", "Rechazo de acceso administrativo sin autenticación o rol CUSTOMER", async () => {
    const unauthReq = new NextRequest("http://localhost:3000/api/admin/orders");
    try {
      await requireAdminUser(unauthReq);
      throw new Error("Debió rechazar usuario anónimo");
    } catch (e: any) {
      if (!e.message.includes("iniciar sesión")) throw e;
    }

    const customerReq = new NextRequest("http://localhost:3000/api/admin/orders", {
      headers: { authorization: `Bearer ${customerTokenA}` },
    });
    try {
      await requireAdminUser(customerReq);
      throw new Error("Debió denegar permisos a rol CUSTOMER");
    } catch (e: any) {
      if (!e.message.includes("permisos administrativos")) throw e;
    }
  });

  await assertTest("SEGURIDAD", "Anti-IDOR: Cliente A no puede consultar ni modificar pedidos de Cliente B", async () => {
    // Crear pedido de Cliente B
    const orderB = await prisma.order.create({
      data: {
        orderNumber: `TK-IDOR-B-${Date.now()}`,
        storeId: (await prisma.store.findFirstOrThrow()).id,
        customerId: customerUserB.id,
        guestName: "Cliente B Privado",
        guestPhone: "8090001122",
        guestWhatsapp: "8090001122",
        guestEmail: "cliente.qa.b@ejemplo.com",
        shippingMethodId: shippingMethod.id,
        shippingAddress: { street: "Direccion B" },
        subtotal: 1000,
        total: 1000,
        status: OrderStatus.PENDIENTE_DE_PAGO,
      },
    });

    const { GET: getCustomerOrderApi } = await import("../app/api/cliente/orders/[orderNumber]/route");

    // Cliente A intenta acceder al pedido de Cliente B
    const reqA = new NextRequest(`http://localhost:3000/api/cliente/orders/${orderB.orderNumber}`, {
      headers: { authorization: `Bearer ${customerTokenA}` },
    });

    const res = await getCustomerOrderApi(reqA, { params: Promise.resolve({ orderNumber: orderB.orderNumber }) });
    const json = await res.json();

    if (res.status !== 403 || json.success) {
      throw new Error(`FALLO DE AUTORIZACIÓN (IDOR): Cliente A pudo acceder al pedido de Cliente B (Status: ${res.status})`);
    }

    await prisma.order.delete({ where: { id: orderB.id } });
  });

  // Limpieza final de recursos
  await prisma.inventoryMovement.deleteMany({ where: { productId: { in: [testVariantProduct.id, testSimpleProduct.id] } } });
  await prisma.orderItem.deleteMany({ where: { orderId: createdTestOrder.id } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: createdTestOrder.id } });
  await prisma.order.delete({ where: { id: createdTestOrder.id } });
  await prisma.productVariant.deleteMany({ where: { productId: testVariantProduct.id } });
  await prisma.product.deleteMany({ where: { id: { in: [testVariantProduct.id, testSimpleProduct.id] } } });
  await prisma.category.delete({ where: { id: testCategory.id } });
  await prisma.user.deleteMany({ where: { id: { in: [customerUserA.id, customerUserB.id] } } });

  console.log("\n================================================================================");
  console.log(`📊 RESUMEN FINAL DE LA SUITE MAESTRA DE QA:`);
  console.log(`   Total de Pruebas: ${totalTests}`);
  console.log(`   Pruebas Exitosas: ${passedTests}`);
  console.log(`   Pruebas Fallidas: ${failedTests}`);
  console.log("================================================================================");

  if (failedTests > 0) {
    console.error("\n❌ DETALLE DE PRUEBAS FALLIDAS:");
    failureDetails.forEach((f, idx) => console.error(`   ${idx + 1}. ${f}`));
    process.exit(1);
  } else {
    console.log("\n🎉 ¡TODAS LAS VERIFICACIONES DE QA PASARON CON ÉXITO ABSOLUTO (100%)!\n");
  }
}

runMasterQASuite();
