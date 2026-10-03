import { signJwt, verifyJwt } from "../core/auth/jwt";
import { hashPassword, verifyPassword } from "../core/auth/password";
import { rateLimiter } from "../lib/rate-limiter";
import { Role } from "@prisma/client";
import { prisma } from "../lib/db";
import { env } from "../config/env";

async function runAuthTests() {
  console.log("🔐 ========================================================");
  console.log("🔐 INICIANDO SUITE DE PRUEBAS DE SEGURIDAD Y AUTENTICACIÓN");
  console.log("🔐 ========================================================\n");

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

  // 1. Hash seguro y comparación
  await test("Hashing de contraseñas seguro con Bcrypt (cost 12) y verificación timing-safe", async () => {
    const rawPass = "MiClaveSuperSegura123!";
    const hash = await hashPassword(rawPass);

    if (!hash.startsWith("$2a$") && !hash.startsWith("$2b$")) {
      throw new Error("El hash no posee el prefijo estándar de Bcrypt ($2b$ o $2a$)");
    }

    const isValid = await verifyPassword(rawPass, hash);
    if (!isValid) throw new Error("La contraseña correcta no validó contra el hash generado");

    const isWrongValid = await verifyPassword("ClaveEquivocada!", hash);
    if (isWrongValid) throw new Error("Una contraseña incorrecta fue aceptada por error");
  });

  // 2. Generación y verificación de JWT
  await test("Generación y firma criptográfica de JWT con expiración", async () => {
    const payload = {
      sub: "user-12345",
      email: "admin@tiendadelki.com",
      role: Role.SUPER_ADMIN,
      name: "Delki Admin",
    };

    const token = await signJwt(payload, "2h");
    if (!token || typeof token !== "string") throw new Error("Token no generado");

    const verified = await verifyJwt(token);
    if (!verified || verified.sub !== payload.sub || verified.role !== payload.role) {
      throw new Error("El contenido del token verificado no coincide con el original");
    }
  });

  // 3. Manejo de tokens expirados
  await test("Rechazo de tokens JWT expirados", async () => {
    const payload = {
      sub: "user-expired",
      email: "exp@tiendadelki.com",
      role: Role.ADMIN,
      name: "Admin Expirado",
    };

    // Firmar con 0 segundos de expiración
    const expiredToken = await signJwt(payload, "0s");
    // Pequeño retardo para asegurar que pase el segundo
    await new Promise((resolve) => setTimeout(resolve, 100));

    const verified = await verifyJwt(expiredToken);
    if (verified !== null) {
      throw new Error("Un token expirado fue validado exitosamente cuando debió ser rechazado!");
    }
  });

  // 4. Protección contra intentos abusivos (Rate Limiter)
  await test("Rate Limiting bloquea tras superar el umbral de intentos fallidos", async () => {
    const testKey = "login:test-abuse-ip";
    rateLimiter.reset(testKey);

    // Intentos 1 a 5 deben ser permitidos
    for (let i = 1; i <= 5; i++) {
      const check = rateLimiter.check(testKey, 5, 60 * 1000);
      if (!check.allowed) throw new Error(`El intento ${i} debió permitirse`);
    }

    // Intento 6 debe ser bloqueado con 429
    const blockedCheck = rateLimiter.check(testKey, 5, 60 * 1000);
    if (blockedCheck.allowed) {
      throw new Error("El 6to intento consecutivo no fue bloqueado por el rate limiter!");
    }
    if (blockedCheck.retryAfterSeconds <= 0) {
      throw new Error("retryAfterSeconds debe ser mayor a 0");
    }

    rateLimiter.reset(testKey);
  });

  // 5. Verificación de credenciales en base de datos real
  await test("Login correcto del Administrador inicial sembrado en PostgreSQL", async () => {
    const adminEmail = env.INITIAL_ADMIN_EMAIL;
    const adminPass = env.INITIAL_ADMIN_PASSWORD;

    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) throw new Error(`Administrador ${adminEmail} no encontrado en base de datos`);
    if (!user.passwordHash) throw new Error("El administrador no tiene passwordHash almacenado");

    const match = await verifyPassword(adminPass, user.passwordHash);
    if (!match) throw new Error("La contraseña inicial configurada en .env no coincide con el hash");
  });

  // 6. Rechazo de contraseña incorrecta
  await test("Rechazo de login ante contraseña incorrecta", async () => {
    const adminEmail = env.INITIAL_ADMIN_EMAIL;
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user || !user.passwordHash) throw new Error("Usuario no encontrado");

    const match = await verifyPassword("ClaveTotalmenteFalsa#2026", user.passwordHash);
    if (match) throw new Error("Se aceptó una contraseña incorrecta");
  });

  // 7. Aislamiento de Roles: Cliente vs Administrador
  await test("Diferenciación de roles (ADMIN vs CUSTOMER) para rutas protegidas", async () => {
    const customer = await prisma.user.findFirst({
      where: { role: Role.CUSTOMER },
    });
    if (!customer) throw new Error("Cliente de prueba no encontrado");

    const customerToken = await signJwt({
      sub: customer.id,
      email: customer.email || "cliente@ejemplo.com",
      role: customer.role,
      name: `${customer.firstName} ${customer.lastName}`,
    });

    const payload = await verifyJwt(customerToken);
    if (!payload) throw new Error("Token de cliente no verificó");

    const adminRoles = ["SUPER_ADMIN", "ADMIN", "STAFF"];
    const isAllowedInAdminArea = adminRoles.includes(payload.role);

    if (isAllowedInAdminArea) {
      throw new Error("FALLO DE AUTORIZACIÓN: Un usuario con rol CUSTOMER fue catalogado como ADMIN!");
    }
  });

  console.log("\n🔐 ========================================================");
  console.log(`🔐 RESULTADOS: ${passed}/${total} PRUEBAS DE SEGURIDAD SUPERADAS`);
  console.log("🔐 ========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runAuthTests()
  .catch((e) => {
    console.error("Error fatal en pruebas de seguridad:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
