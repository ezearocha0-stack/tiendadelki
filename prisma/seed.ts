import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando sembrado de datos para TiendaDelki...");

  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "admin@tiendadelki.com";
  const adminRawPassword = process.env.INITIAL_ADMIN_PASSWORD || "TiendaDelki#2026!Adm";
  const adminPasswordHash = await bcrypt.hash(adminRawPassword, 12);
  const staffPasswordHash = await bcrypt.hash("Staff_TiendaDelki_2026!", 12);

  // 1. Tienda Matriz (Marketplace Ready)
  const store = await prisma.store.upsert({
    where: { slug: "tiendadelki-principal" },
    update: {},
    create: {
      name: "TiendaDelki Principal",
      slug: "tiendadelki-principal",
      isDefault: true,
      isActive: true,
    },
  });
  console.log(`✅ Tienda matriz: ${store.name}`);

  // 2. Administrador Inicial Seguro e Idempotente
  const existingAdmin = await prisma.user.findFirst({
    where: {
      role: { in: [Role.SUPER_ADMIN, Role.ADMIN] },
    },
  });

  let superAdmin;
  if (!existingAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminPasswordHash,
        firstName: process.env.INITIAL_ADMIN_FIRST_NAME || "Delki",
        lastName: process.env.INITIAL_ADMIN_LAST_NAME || "Admin",
        phone: process.env.INITIAL_ADMIN_PHONE || "",
        whatsapp: process.env.INITIAL_ADMIN_PHONE || "",
        role: Role.SUPER_ADMIN,
        isActive: true,
      },
    });
    console.log(`✅ Super Admin inicial creado con éxito: ${superAdmin.email}`);
  } else {
    superAdmin = existingAdmin;
    console.log(`ℹ️ Administrador existente detectado (${existingAdmin.email}). Credenciales preservadas sin modificaciones.`);
  }

  // 3. Empleado y Clientes de desarrollo (solo en desarrollo)
  if (process.env.NODE_ENV !== "production") {
    const existingStaff = await prisma.user.findUnique({ where: { email: "cajero@tiendadelki.com" } });
    if (!existingStaff) {
      await prisma.user.create({
        data: {
          email: "cajero@tiendadelki.com",
          passwordHash: staffPasswordHash,
          firstName: "Marcos",
          lastName: "Vendedor",
          phone: "",
          whatsapp: "",
          role: Role.STAFF,
          isActive: true,
        },
      });
      console.log("✅ Usuario staff de prueba creado.");
    }

    const existingCustomer = await prisma.user.findUnique({ where: { email: "cliente@ejemplo.com" } });
    if (!existingCustomer) {
      await prisma.user.create({
        data: {
          email: "cliente@ejemplo.com",
          firstName: "Carlos",
          lastName: "Gómez",
          phone: "",
          whatsapp: "",
          role: Role.CUSTOMER,
          isActive: true,
          addresses: {
            create: {
              label: "Casa",
              recipientName: "Carlos Gómez",
              recipientPhone: "8090000000",
              streetAddress: "Calle Las Palmas #45, Edf. Coral Apto 3B",
              sectorOrNeighborhood: "Bella Vista",
              city: "Santo Domingo",
              provinceOrState: "Distrito Nacional",
              postalCode: "10112",
              deliveryNotes: "Frente al parque, portón blanco",
              isDefault: true,
            },
          },
        },
      });
      console.log("✅ Cliente de prueba creado.");
    }
  }

  // 4. Métodos de Envío Dinámicos
  const shippingMethodsData = [
    {
      name: "Recogida en Tienda Física",
      zoneDescription: "Disponible inmediatamente en nuestra sucursal",
      price: 0.0,
      freeShippingThreshold: null,
      estimatedDays: "Mismo día",
      sortOrder: 1,
    },
    {
      name: "Envío Local (Gran Santo Domingo)",
      zoneDescription: "Distrito Nacional, Santo Domingo Este, Norte y Oeste",
      price: 250.0,
      freeShippingThreshold: 3000.0,
      estimatedDays: "24 a 48 horas",
      sortOrder: 2,
    },
    {
      name: "Envío Nacional (Interior del País)",
      zoneDescription: "Santiago, La Vega, Puerto Plata, San Cristóbal, etc.",
      price: 350.0,
      freeShippingThreshold: 5000.0,
      estimatedDays: "48 a 72 horas vía transporte expreso",
      sortOrder: 3,
    },
  ];

  const shippingCount = await prisma.shippingMethod.count();
  if (shippingCount === 0) {
    for (const method of shippingMethodsData) {
      await prisma.shippingMethod.create({ data: method });
    }
    console.log("✅ Métodos de envío configurados");
  } else {
    console.log("ℹ️ Métodos de envío ya configurados en la base de datos.");
  }

  // 5. Cuentas Bancarias para Depósito/Transferencia
  const bankAccountsData = [
    {
      bankName: "Banco Popular Dominicano",
      accountNumber: "809-123456-7",
      accountType: "Cuenta Corriente Empresarial",
      holderName: "TiendaDelki SRL",
      holderId: "1-32-45678-9",
      instructions: "Favor colocar su número de pedido en el concepto de la transferencia.",
      sortOrder: 1,
    },
    {
      bankName: "Banco BHD",
      accountNumber: "234-567890-1",
      accountType: "Cuenta de Ahorros en Pesos",
      holderName: "TiendaDelki SRL",
      holderId: "1-32-45678-9",
      instructions: "Transferencia directa o vía ACH/Pagos al Instante BCRD.",
      sortOrder: 2,
    },
    {
      bankName: "Banreservas",
      accountNumber: "960-123456-2",
      accountType: "Cuenta Corriente",
      holderName: "TiendaDelki SRL",
      holderId: "1-32-45678-9",
      instructions: "Aceptamos depósitos en sucursal o transferencias interbancarias.",
      sortOrder: 3,
    },
  ];

  const bankCount = await prisma.bankAccount.count();
  if (bankCount === 0) {
    for (const acc of bankAccountsData) {
      await prisma.bankAccount.create({ data: acc });
    }
    console.log("✅ Cuentas bancarias configuradas");
  } else {
    console.log("ℹ️ Cuentas bancarias ya configuradas en la base de datos.");
  }

  // 6. Parámetros del Sistema
  const settingsData = [
    { key: "STORE_NAME", value: "TiendaDelki", description: "Nombre comercial del comercio" },
    { key: "WHATSAPP_STORE_NUMBER", value: "", description: "Teléfono WhatsApp oficial para recepción de pedidos" },
    { key: "CURRENCY_SYMBOL", value: "RD$", description: "Moneda de facturación local" },
    { key: "ORDER_EXPIRATION_HOURS", value: "48", description: "Horas máximas para subir comprobante antes de cancelar pedido" },
  ];

  for (const s of settingsData) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }
  console.log("✅ Parámetros del sistema sembrados");

  // 7. Categorías Jerárquicas
  const catRopa = await prisma.category.upsert({
    where: { slug: "ropa" },
    update: {},
    create: {
      name: "Ropa",
      slug: "ropa",
      description: "Prendas de vestir para damas, caballeros y jóvenes",
      sortOrder: 1,
    },
  });

  const catCamisas = await prisma.category.upsert({
    where: { slug: "camisas" },
    update: {},
    create: {
      name: "Camisas & Polos",
      slug: "camisas",
      parentId: catRopa.id,
      description: "Camisas casuales, formales y polos",
      sortOrder: 1,
    },
  });

  const catPantalones = await prisma.category.upsert({
    where: { slug: "pantalones" },
    update: {},
    create: {
      name: "Pantalones & Jeans",
      slug: "pantalones",
      parentId: catRopa.id,
      sortOrder: 2,
    },
  });

  const catCalzado = await prisma.category.upsert({
    where: { slug: "calzado" },
    update: {},
    create: {
      name: "Calzado",
      slug: "calzado",
      description: "Zapatos formales, casuales y tenis deportivos",
      sortOrder: 2,
    },
  });

  const catHogar = await prisma.category.upsert({
    where: { slug: "hogar-decoracion" },
    update: {},
    create: {
      name: "Hogar & Decoración",
      slug: "hogar-decoracion",
      description: "Artículos y complementos decorativos para el hogar",
      sortOrder: 3,
    },
  });

  console.log("✅ Categorías jerárquicas sembradas");

  // 8. Marcas
  const brandNike = await prisma.brand.upsert({
    where: { slug: "nike" },
    update: {},
    create: { name: "Nike", slug: "nike" },
  });

  const brandZara = await prisma.brand.upsert({
    where: { slug: "zara" },
    update: {},
    create: { name: "Zara", slug: "zara" },
  });

  // 9. Limpieza defensiva de productos de prueba antiguos si existieran
  await prisma.inventoryMovement.deleteMany({
    where: {
      product: {
        slug: { in: ["camisa-nike-dri-fit-sport", "lampara-mesa-nordica-madera"] },
      },
    },
  });
  await prisma.product.deleteMany({
    where: {
      slug: { in: ["camisa-nike-dri-fit-sport", "lampara-mesa-nordica-madera"] },
    },
  });

  console.log("🎉 Sembrado completado exitosamente en PostgreSQL (Catálogo limpio sin productos de prueba)!");
}

main()
  .catch((e) => {
    console.error("❌ Error durante el sembrado:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
