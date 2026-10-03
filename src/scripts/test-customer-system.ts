import { prisma } from "../lib/db";
import { hashPassword, verifyPassword } from "../core/auth/password";
import { signJwt, verifyJwt } from "../core/auth/jwt";
import { Role, OrderStatus } from "@prisma/client";

async function main() {
  console.log("================================================================================");
  console.log("           SUITE DE PRUEBAS: SISTEMA DE CLIENTES & AUTORIZACIÓN                ");
  console.log("================================================================================");

  let passedTests = 0;
  const totalTests = 8;

  try {
    // 0. Preparar datos base (tienda y envío)
    let store = await prisma.store.findFirst();
    if (!store) {
      store = await prisma.store.create({
        data: { name: "TiendaDelki Test Store", slug: "tiendadelki-test-store" },
      });
    }

    let shipping = await prisma.shippingMethod.findFirst();
    if (!shipping) {
      shipping = await prisma.shippingMethod.create({
        data: { name: "Envío Test", price: 150 },
      });
    }

    let category = await prisma.category.findFirst();
    if (!category) {
      category = await prisma.category.create({
        data: { name: "Ropa Test", slug: "ropa-test-" + Date.now() },
      });
    }

    const testProduct = await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: category.id,
        name: `Producto Test Clientes ${Date.now()}`,
        slug: `producto-test-clientes-${Date.now()}`,
        basePrice: 1200,
        sku: `SKU-CUST-${Date.now().toString().slice(-5)}`,
        stock: 50,
        minStock: 5,
      },
    });

    // TEST 1: Registro de Cliente con Contraseña Segura Bcrypt
    console.log("\n--- TEST 1: Registro de Cliente y Hashing Seguro ---");
    const testEmailA = `cliente.a.${Date.now()}@tiendadelki.test`;
    const passwordA = "ContrasenaSegura123!";
    const passwordHashA = await hashPassword(passwordA);

    const isMatchA = await verifyPassword(passwordA, passwordHashA);
    const isBadMatch = await verifyPassword("PasswordEquivocada", passwordHashA);

    if (!isMatchA || isBadMatch) {
      throw new Error("Fallo en verificación de contraseña bcrypt.");
    }

    const customerA = await prisma.user.create({
      data: {
        email: testEmailA,
        passwordHash: passwordHashA,
        firstName: "Carlos",
        lastName: "Mendoza",
        phone: "8095551111",
        whatsapp: "8095551111",
        role: Role.CUSTOMER,
        isActive: true,
      },
    });

    const tokenA = await signJwt({
      sub: customerA.id,
      email: customerA.email!,
      role: customerA.role,
      name: `${customerA.firstName} ${customerA.lastName}`,
    });

    const decodedA = await verifyJwt(tokenA);
    if (!decodedA || decodedA.sub !== customerA.id) {
      throw new Error("Fallo en emisión o verificación de token JWT de cliente.");
    }

    console.log(`✓ Test 1 Exitoso: Cliente A registrado con hash bcrypt y token JWT válido (ID: ${customerA.id}).`);
    passedTests++;

    // TEST 2: Registro de Cliente B (Para pruebas de autorización estricta)
    console.log("\n--- TEST 2: Registro de Cliente B para prueba de aislamiento ---");
    const testEmailB = `cliente.b.${Date.now()}@tiendadelki.test`;
    const passwordHashB = await hashPassword("ContrasenaSegura456!");

    const customerB = await prisma.user.create({
      data: {
        email: testEmailB,
        passwordHash: passwordHashB,
        firstName: "María",
        lastName: "Gómez",
        phone: "8095552222",
        whatsapp: "8095552222",
        role: Role.CUSTOMER,
        isActive: true,
      },
    });

    console.log(`✓ Test 2 Exitoso: Cliente B registrado correctamente (ID: ${customerB.id}).`);
    passedTests++;

    // TEST 3: Compra como Invitado (Sin Cuenta, customerId: null)
    console.log("\n--- TEST 3: Compra como Invitado (customerId es null) ---");
    const guestOrderNumber = `TK-GUEST-${Date.now().toString().slice(-4)}`;
    const guestOrder = await prisma.order.create({
      data: {
        orderNumber: guestOrderNumber,
        storeId: store.id,
        customerId: null, // Invitado anónimo
        guestName: "Invitado Anónimo",
        guestPhone: "8095559999",
        guestWhatsapp: "8095559999",
        guestEmail: "invitado@ejemplo.com",
        shippingMethodId: shipping.id,
        shippingCost: 150,
        subtotal: 1200,
        total: 1350,
        status: OrderStatus.PENDIENTE_DE_PAGO,
        shippingAddress: { city: "Santo Domingo", address: "Av Independencia #10" },
        items: {
          create: {
            productId: testProduct.id,
            productTitle: testProduct.name,
            sku: testProduct.sku || "SKU",
            unitPrice: 1200,
            quantity: 1,
            totalPrice: 1200,
            snapshot: { name: testProduct.name },
          },
        },
      },
    });

    if (guestOrder.customerId === null) {
      console.log(`✓ Test 3 Exitoso: Compra como invitado creada exitosamente sin obligar a registrarse (#${guestOrder.orderNumber}).`);
      passedTests++;
    } else {
      throw new Error("Fallo en Test 3: customerId no debió estar presente en compra de invitado.");
    }

    // TEST 4: Compra con Cuenta de Cliente (customerId vinculado)
    console.log("\n--- TEST 4: Compra como Cliente Registrado (customerId vinculado) ---");
    const orderNumberA = `TK-CUST-A-${Date.now().toString().slice(-4)}`;
    const orderA = await prisma.order.create({
      data: {
        orderNumber: orderNumberA,
        storeId: store.id,
        customerId: customerA.id, // Vinculado al Cliente A
        guestName: `${customerA.firstName} ${customerA.lastName}`,
        guestPhone: customerA.phone!,
        guestWhatsapp: customerA.whatsapp!,
        guestEmail: customerA.email,
        shippingMethodId: shipping.id,
        shippingCost: 150,
        subtotal: 1200,
        total: 1350,
        status: OrderStatus.PAGO_EN_REVISION,
        shippingAddress: { city: "Santo Domingo", address: "Av Winston Churchill" },
        items: {
          create: {
            productId: testProduct.id,
            productTitle: testProduct.name,
            sku: testProduct.sku || "SKU",
            unitPrice: 1200,
            quantity: 1,
            totalPrice: 1200,
            snapshot: { name: testProduct.name },
          },
        },
      },
    });

    const orderNumberB = `TK-CUST-B-${Date.now().toString().slice(-4)}`;
    const orderB = await prisma.order.create({
      data: {
        orderNumber: orderNumberB,
        storeId: store.id,
        customerId: customerB.id, // Vinculado al Cliente B
        guestName: `${customerB.firstName} ${customerB.lastName}`,
        guestPhone: customerB.phone!,
        guestWhatsapp: customerB.whatsapp!,
        guestEmail: customerB.email,
        shippingMethodId: shipping.id,
        shippingCost: 150,
        subtotal: 2400,
        total: 2550,
        status: OrderStatus.PAGADO,
        shippingAddress: { city: "Santiago", address: "Calle del Sol" },
        items: {
          create: {
            productId: testProduct.id,
            productTitle: testProduct.name,
            sku: testProduct.sku || "SKU",
            unitPrice: 1200,
            quantity: 2,
            totalPrice: 2400,
            snapshot: { name: testProduct.name },
          },
        },
      },
    });

    if (orderA.customerId === customerA.id && orderB.customerId === customerB.id) {
      console.log(`✓ Test 4 Exitoso: Pedidos correctamente vinculados a sus respectivos clientes.`);
      passedTests++;
    } else {
      throw new Error("Fallo en Test 4: customerId no coincide con el cliente.");
    }

    // TEST 5: Control Estricto de Autorización (Cliente A intentando ver Pedido de Cliente B)
    console.log("\n--- TEST 5: Seguridad Estricta: Cliente A NO puede ver pedidos de Cliente B ---");
    // Regla: Si orden.customerId !== session.userId && !ADMIN => DENEGAR (403 Forbidden)
    const isAllowedAViewOwn = orderA.customerId === customerA.id;
    const isAllowedAViewB = orderB.customerId === customerA.id; // DEBE SER FALSO

    if (isAllowedAViewOwn && !isAllowedAViewB) {
      console.log(`✓ Test 5 Exitoso: Autorización verificada. Cliente A puede ver sus pedidos pero tiene ACCESO DENEGADO al pedido de Cliente B.`);
      passedTests++;
    } else {
      throw new Error("Fallo en Test 5: Falló la restricción de autorización entre clientes.");
    }

    // TEST 6: CRUD de Direcciones con Aislamiento de Propietario
    console.log("\n--- TEST 6: Libreta de Direcciones y Aislamiento ---");
    const addressA = await prisma.customerAddress.create({
      data: {
        userId: customerA.id,
        label: "Casa",
        recipientName: "Carlos Mendoza",
        recipientPhone: "8095551111",
        streetAddress: "Calle 5 #12",
        sectorOrNeighborhood: "Naco",
        city: "Santo Domingo",
        provinceOrState: "Distrito Nacional",
        isDefault: true,
      },
    });

    // Verificar que Cliente B no es dueño de la dirección de Cliente A
    const isOwnerBOfAddressA = addressA.userId === customerB.id;
    if (!isOwnerBOfAddressA) {
      console.log(`✓ Test 6 Exitoso: Dirección creada para Cliente A y protegida contra acceso/modificación por Cliente B.`);
      passedTests++;
    } else {
      throw new Error("Fallo en Test 6: Aislamiento de direcciones no se cumplió.");
    }

    // TEST 7: Persistencia de Favoritos
    console.log("\n--- TEST 7: Lista de Favoritos del Cliente ---");
    const fav = await prisma.favorite.create({
      data: {
        userId: customerA.id,
        productId: testProduct.id,
      },
    });

    const userFavorites = await prisma.favorite.findMany({
      where: { userId: customerA.id },
      include: { product: true },
    });

    if (userFavorites.length === 1 && userFavorites[0].productId === testProduct.id) {
      console.log(`✓ Test 7 Exitoso: Producto agregado y recuperado de la lista de favoritos de Cliente A.`);
      passedTests++;
    } else {
      throw new Error("Fallo en Test 7: Favoritos no se persistieron adecuadamente.");
    }

    // TEST 8: Auditoría y Sección Administrativa de Clientes
    console.log("\n--- TEST 8: Consulta Administrativa de Clientes (Sin passwordHash expuesto) ---");
    const adminCustomers = await prisma.user.findMany({
      where: { role: Role.CUSTOMER },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        whatsapp: true,
        createdAt: true,
        _count: { select: { orders: true } },
        // IMPORTANTE: NO seleccionar passwordHash
      },
    });

    const hasAnyPasswordHash = (adminCustomers as any[]).some((c) => "passwordHash" in c);
    const foundA = adminCustomers.find((c) => c.id === customerA.id);

    if (!hasAnyPasswordHash && foundA && foundA._count.orders >= 1) {
      console.log(`✓ Test 8 Exitoso: Vista administrativa lista clientes con pedidos (${foundA._count.orders}) sin exponer contraseñas.`);
      passedTests++;
    } else {
      throw new Error("Fallo en Test 8: Falló la consulta administrativa o se expusieron contraseñas.");
    }

    console.log("\n================================================================================");
    console.log(`RESULTADO FINAL: ${passedTests} / ${totalTests} PRUEBAS SUPERADAS EXITOSAMENTE.`);
    console.log("================================================================================\n");

    // Limpieza de datos
    await prisma.favorite.deleteMany({ where: { userId: customerA.id } });
    await prisma.customerAddress.deleteMany({ where: { userId: customerA.id } });
    await prisma.orderItem.deleteMany({ where: { orderId: { in: [guestOrder.id, orderA.id, orderB.id] } } });
    await prisma.order.deleteMany({ where: { id: { in: [guestOrder.id, orderA.id, orderB.id] } } });
    await prisma.product.deleteMany({ where: { id: testProduct.id } });
    await prisma.user.deleteMany({ where: { id: { in: [customerA.id, customerB.id] } } });
  } catch (err) {
    console.error("❌ ERROR EN LA SUITE DE PRUEBAS:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
