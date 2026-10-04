import { prisma } from "../lib/db";
import { Role, OrderStatus } from "@prisma/client";
import { signJwt, verifyJwt, AUTH_COOKIE_OPTIONS } from "../core/auth/jwt";
import { requireAdminUser } from "../core/auth/session";
import { GET as getDashboardStats } from "../app/api/admin/dashboard-stats/route";
import { GET as getAdminOrders } from "../app/api/admin/orders/route";
import { GET as getAdminShippingMethods } from "../app/api/admin/shipping-methods/route";
import { GET as getCustomerOrder } from "../app/api/cliente/orders/[orderNumber]/route";
import { GET as getOrderProof } from "../app/api/orders/[orderNumber]/proof/route";
import { GET as getPublicUpload } from "../app/uploads/[...path]/route";
import { middleware } from "../middleware";
import { storageService } from "../core/storage/storage-service";
import { NextRequest } from "next/server";
import { SignJWT } from "jose";

async function runFinalSecurityAudit() {
  console.log("🔒 ========================================================");
  console.log("🔒 TIENDADELKI - AUDITORÍA FINAL DE SEGURIDAD PRE-PRODUCCIÓN");
  console.log("🔒 ========================================================\n");

  let userAId = "";
  let userBId = "";
  let adminId = "";
  let orderBId = "";
  let orderBNumber = "";
  let testShippingMethodId = "";
  let realJwtSecret = process.env.JWT_SECRET || "";

  try {
    // 0. Setup datos de prueba temporales
    const store = await prisma.store.findFirstOrThrow({ where: { isDefault: true } });
    const shippingMethod = await prisma.shippingMethod.findFirstOrThrow({ where: { isActive: true } });
    testShippingMethodId = shippingMethod.id;

    // Cliente A
    const userA = await prisma.user.create({
      data: {
        email: `clienteA.${Date.now()}@delki.do`,
        passwordHash: "dummyHash123",
        firstName: "Cliente",
        lastName: "A",
        role: Role.CUSTOMER,
        isActive: true,
      },
    });
    userAId = userA.id;

    // Cliente B
    const userB = await prisma.user.create({
      data: {
        email: `clienteB.${Date.now()}@delki.do`,
        passwordHash: "dummyHash456",
        firstName: "Cliente",
        lastName: "B",
        role: Role.CUSTOMER,
        isActive: true,
      },
    });
    userBId = userB.id;

    // Admin
    const adminUser = await prisma.user.create({
      data: {
        email: `admin.test.${Date.now()}@delki.do`,
        passwordHash: "dummyHash789",
        firstName: "Admin",
        lastName: "Test",
        role: Role.ADMIN,
        isActive: true,
      },
    });
    adminId = adminUser.id;

    // Pedido perteneciente a Cliente B
    orderBNumber = `TEST-SEC-${Date.now().toString().slice(-6)}`;
    const orderB = await prisma.order.create({
      data: {
        orderNumber: orderBNumber,
        storeId: store.id,
        customerId: userB.id,
        guestName: "Cliente B Test",
        guestPhone: "8095550199",
        guestWhatsapp: "8095550199",
        guestEmail: userB.email,
        shippingAddress: {
          street: "Av. Winston Churchill 100",
          city: "Santo Domingo",
          province: "Distrito Nacional",
        },
        shippingMethodId: testShippingMethodId,
        shippingCost: 200,
        subtotal: 1000,
        total: 1200,
        status: OrderStatus.PAGO_EN_REVISION,
        proofOfPaymentUrl: `/api/orders/${orderBNumber}/proof`,
        adminNotes: "RECEIPT_FILE:receipts/test-private-proof.png",
      },
    });
    orderBId = orderB.id;

    // Generar tokens válidos legítimos
    const tokenA = await signJwt({
      sub: userA.id,
      email: userA.email!,
      role: Role.CUSTOMER,
      name: "Cliente A",
    });

    const adminToken = await signJwt({
      sub: adminUser.id,
      email: adminUser.email!,
      role: Role.ADMIN,
      name: "Admin User",
    });

    // ------------------------------------------------------------------------
    // PRUEBA 1: Un JWT con firma inválida es rechazado
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 1] Verificando rechazo de JWT con firma inválida...");
    const fakeSecret = new TextEncoder().encode("clave-falsa-totalmente-incorrecta-32bytes-minimo!");
    const invalidSignatureToken = await new SignJWT({
      sub: userA.id,
      email: userA.email!,
      role: Role.SUPER_ADMIN,
      name: "Fake Admin",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(fakeSecret);

    const verifiedInvalid = await verifyJwt(invalidSignatureToken);
    if (verifiedInvalid !== null) {
      throw new Error("FALLO DE SEGURIDAD: verifyJwt aceptó un token firmado con una clave incorrecta.");
    }

    // Probar contra endpoint administrativo
    const reqInvalid = new NextRequest("http://localhost:3000/api/admin/dashboard-stats", {
      headers: {
        cookie: `${AUTH_COOKIE_OPTIONS.name}=${invalidSignatureToken}`,
      },
    });
    let invalidRejected = false;
    try {
      const res = await getDashboardStats(reqInvalid);
      if (res.status === 401 || res.status === 403) invalidRejected = true;
    } catch (e: any) {
      if (e.statusCode === 401 || e.statusCode === 403) invalidRejected = true;
    }
    if (!invalidRejected) {
      throw new Error("FALLO DE SEGURIDAD: Endpoint administrativo aceptó JWT con firma falsa.");
    }
    console.log("  ✅ PASS: Token con firma criptográfica inválida rechazado con éxito (status 401/null).");

    // ------------------------------------------------------------------------
    // PRUEBA 2: Un JWT manipulado no obtiene privilegios administrativos
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 2] Verificando rechazo de JWT manipulado (escalada de privilegios)...");
    // Tomar tokenA legítimo y manipular el payload codificado en base64 para cambiar CUSTOMER a SUPER_ADMIN
    const parts = tokenA.split(".");
    const decodedPayloadStr = Buffer.from(parts[1], "base64url").toString("utf-8");
    const tamperedPayloadObj = JSON.parse(decodedPayloadStr);
    tamperedPayloadObj.role = "SUPER_ADMIN";
    const tamperedPayloadBase64 = Buffer.from(JSON.stringify(tamperedPayloadObj)).toString("base64url");
    const tamperedToken = `${parts[0]}.${tamperedPayloadBase64}.${parts[2]}`; // payload alterado, firma original

    const verifiedTampered = await verifyJwt(tamperedToken);
    if (verifiedTampered !== null) {
      throw new Error("FALLO DE SEGURIDAD: verifyJwt aceptó un JWT con payload manipulado.");
    }

    const reqTampered = new NextRequest("http://localhost:3000/api/admin/orders", {
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
      },
    });
    let tamperedRejected = false;
    try {
      const res = await getAdminOrders(reqTampered);
      if (res.status === 401 || res.status === 403) tamperedRejected = true;
    } catch (e: any) {
      if (e.statusCode === 401 || e.statusCode === 403) tamperedRejected = true;
    }
    if (!tamperedRejected) {
      throw new Error("FALLO DE SEGURIDAD: Endpoint administrativo permitió acceso con token manipulado.");
    }
    console.log("  ✅ PASS: Intento de escalada de privilegios con payload manipulado bloqueado.");

    // ------------------------------------------------------------------------
    // PRUEBA 3: Sin JWT_SECRET, las operaciones protegidas fallan de forma segura
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 3] Verificando comportamiento seguro si falta JWT_SECRET (Fail-Closed)...");
    const savedSecret = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;

    const verifyWithoutSecret = await verifyJwt(adminToken);
    process.env.JWT_SECRET = savedSecret; // Restaurar inmediatamente

    if (verifyWithoutSecret !== null) {
      throw new Error("FALLO DE SEGURIDAD: verifyJwt devolvió claims válidos en ausencia de JWT_SECRET.");
    }
    console.log("  ✅ PASS: verifyJwt falla de forma segura (Fail-Closed) retornando null si falta JWT_SECRET.");

    // ------------------------------------------------------------------------
    // PRUEBA 4: Endpoints administrativos rechazan solicitudes sin autorización
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 4] Verificando rechazo estricto en endpoints administrativos...");
    // A) Solicitud anónima sin token
    const reqAnon = new NextRequest("http://localhost:3000/api/admin/shipping-methods");
    let anonBlocked = false;
    try {
      const res = await getAdminShippingMethods(reqAnon);
      if (res.status === 401) anonBlocked = true;
    } catch (e: any) {
      if (e.statusCode === 401) anonBlocked = true;
    }
    if (!anonBlocked) {
      throw new Error("FALLO DE SEGURIDAD: /api/admin/shipping-methods permitió acceso anónimo.");
    }

    // B) Solicitud con token de rol CUSTOMER
    const reqCustomerOnAdmin = new NextRequest("http://localhost:3000/api/admin/dashboard-stats", {
      headers: {
        cookie: `${AUTH_COOKIE_OPTIONS.name}=${tokenA}`,
      },
    });
    let customerBlocked = false;
    try {
      const res = await getDashboardStats(reqCustomerOnAdmin);
      if (res.status === 403) customerBlocked = true;
    } catch (e: any) {
      if (e.statusCode === 403) customerBlocked = true;
    }
    if (!customerBlocked) {
      throw new Error("FALLO DE SEGURIDAD: Cliente regular pudo invocar /api/admin/dashboard-stats.");
    }
    console.log("  ✅ PASS: Solicitudes anónimas (401) y clientes regulares (403) rechazadas en endpoints admin.");

    // ------------------------------------------------------------------------
    // PRUEBA 5: Los usuarios no pueden acceder a pedidos ni comprobantes ajenos
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 5] Verificando aislamiento de datos entre clientes (IDOR)...");
    // Cliente A intentando acceder al pedido de Cliente B
    const reqAOnB = new NextRequest(`http://localhost:3000/api/cliente/orders/${orderBNumber}`, {
      headers: {
        cookie: `${AUTH_COOKIE_OPTIONS.name}=${tokenA}`,
      },
    });
    let idorOrderBlocked = false;
    try {
      const res = await getCustomerOrder(reqAOnB, { params: Promise.resolve({ orderNumber: orderBNumber }) });
      if (res.status === 403) idorOrderBlocked = true;
    } catch (e: any) {
      if (e.statusCode === 403) idorOrderBlocked = true;
    }
    if (!idorOrderBlocked) {
      throw new Error("FALLO DE SEGURIDAD (IDOR): Cliente A pudo leer el pedido de Cliente B.");
    }

    // Cliente A intentando descargar comprobante privado de Cliente B
    const reqAOnProofB = new NextRequest(`http://localhost:3000/api/orders/${orderBNumber}/proof`, {
      headers: {
        cookie: `${AUTH_COOKIE_OPTIONS.name}=${tokenA}`,
      },
    });
    let idorProofBlocked = false;
    try {
      const res = await getOrderProof(reqAOnProofB, { params: Promise.resolve({ orderNumber: orderBNumber }) });
      if (res.status === 403) idorProofBlocked = true;
    } catch (e: any) {
      if (e.statusCode === 403) idorProofBlocked = true;
    }
    if (!idorProofBlocked) {
      throw new Error("FALLO DE SEGURIDAD (IDOR): Cliente A pudo descargar el comprobante privado de Cliente B.");
    }
    console.log("  ✅ PASS: Controles IDOR estrictos: Cliente A recibe 403 al intentar acceder a pedido o comprobante de Cliente B.");

    // ------------------------------------------------------------------------
    // PRUEBA 6: Archivos privados y protección contra Path Traversal
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 6] Verificando protección de archivos privados y Path Traversal...");
    // A) Acceso anónimo a comprobante privado
    const reqAnonProof = new NextRequest(`http://localhost:3000/api/orders/${orderBNumber}/proof`);
    let anonProofBlocked = false;
    try {
      const res = await getOrderProof(reqAnonProof, { params: Promise.resolve({ orderNumber: orderBNumber }) });
      if (res.status === 403 || res.status === 401) anonProofBlocked = true;
    } catch (e: any) {
      if (e.statusCode === 403 || e.statusCode === 401) anonProofBlocked = true;
    }
    if (!anonProofBlocked) {
      throw new Error("FALLO DE SEGURIDAD: Comprobante privado accesible anónimamente.");
    }

    // B) Path traversal en /uploads/[...path] intentando escapar a almacenamiento privado
    const reqTraversal = new NextRequest("http://localhost:3000/uploads/..%2F..%2Fstorage%2Fprivate");
    const traversalRes = await getPublicUpload(reqTraversal, {
      params: Promise.resolve({ path: ["..", "..", "storage", "private", "receipts"] }),
    });
    if (traversalRes.status !== 403 && traversalRes.status !== 404) {
      throw new Error(`FALLO DE SEGURIDAD: Path traversal devolvió status inesperado: ${traversalRes.status}`);
    }

    // C) Path traversal en LocalStorageService.readPrivateFile
    let storageTraversalBlocked = false;
    try {
      await storageService.readPrivateFile("../../../package.json");
    } catch (e: any) {
      if (e.message.includes("path traversal") || e.message.includes("denegado")) {
        storageTraversalBlocked = true;
      }
    }
    if (!storageTraversalBlocked) {
      throw new Error("FALLO DE SEGURIDAD: LocalStorageService.readPrivateFile no bloqueó path traversal.");
    }
    console.log("  ✅ PASS: Archivos privados protegidos y tentativas de Path Traversal bloqueadas con 403.");

    // ------------------------------------------------------------------------
    // PRUEBA 7: Rechazo de orígenes CORS no autorizados
    // ------------------------------------------------------------------------
    console.log("▶ [PRUEBA 7] Verificando controles CORS y rechazo de orígenes no autorizados...");
    // A) Origen maligno en Vercel (evil.vercel.app)
    const reqEvilVercel = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "OPTIONS",
      headers: {
        Origin: "https://evil-attacker.vercel.app",
        "Access-Control-Request-Method": "POST",
      },
    });
    const evilVercelRes = await middleware(reqEvilVercel);
    if (evilVercelRes.status !== 403 || evilVercelRes.headers.get("access-control-allow-origin")) {
      throw new Error(`FALLO DE SEGURIDAD CORS: Subdominio .vercel.app no autorizado fue aceptado: ${evilVercelRes.status}`);
    }

    // B) Origen no autorizado arbitrario (attacker.com)
    const reqEvil = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "OPTIONS",
      headers: {
        Origin: "https://attacker.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    const evilRes = await middleware(reqEvil);
    if (evilRes.status !== 403 || evilRes.headers.get("access-control-allow-origin")) {
      throw new Error(`FALLO DE SEGURIDAD CORS: Origen no autorizado attacker.com fue aceptado: ${evilRes.status}`);
    }

    // C) Origen autorizado (localhost en pruebas / desarrollo)
    const reqAllowed = new NextRequest("http://localhost:3000/api/auth/me", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    const allowedRes = await middleware(reqAllowed);
    if (
      allowedRes.status !== 204 ||
      allowedRes.headers.get("access-control-allow-origin") !== "http://localhost:3000" ||
      allowedRes.headers.get("access-control-allow-credentials") !== "true"
    ) {
      throw new Error(`FALLO CORS: Origen autorizado no recibió cabeceras correctas: status ${allowedRes.status}`);
    }
    console.log("  ✅ PASS: CORS rechaza con 403 orígenes no autorizados y no expone cabeceras ni credenciales.");

    // ------------------------------------------------------------------------
    // RESUMEN
    // ------------------------------------------------------------------------
    console.log("\n========================================================");
    console.log("🎉 AUDITORÍA DE SEGURIDAD SUPERADA EXITOSAMENTE (7/7)");
    console.log("========================================================\n");
  } finally {
    // Limpieza de datos temporales
    if (orderBId) {
      await prisma.order.deleteMany({ where: { id: orderBId } });
    }
    if (userAId || userBId || adminId) {
      await prisma.user.deleteMany({
        where: {
          id: { in: [userAId, userBId, adminId].filter(Boolean) },
        },
      });
    }
  }
}

runFinalSecurityAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ ERROR EN AUDITORÍA DE SEGURIDAD:", err);
    process.exit(1);
  });
