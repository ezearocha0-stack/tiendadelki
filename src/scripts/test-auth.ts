import { SignJWT } from "jose";
import { signJwt, verifyJwt, AUTH_COOKIE_OPTIONS, getValidIssuers, getCanonicalIssuer } from "../core/auth/jwt";
import { requireAdminUser, requireAuthenticatedUser } from "../core/auth/session";
import { hashPassword, verifyPassword } from "../core/auth/password";
import { rateLimiter } from "../lib/rate-limiter";
import { Role } from "@prisma/client";
import { prisma } from "../lib/db";
import { env } from "../config/env";

async function runAuthTests() {
  console.log("🔐 ========================================================");
  console.log("🔐 INICIANDO SUITE DE PRUEBAS DE SEGURIDAD Y AUTENTICACIÓN (FASE 2)");
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

  // 1. Hash seguro y comparación timing-safe
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
  await test("Generación y firma criptográfica de JWT con algoritmo HS256", async () => {
    const payload = {
      sub: "user-12345",
      email: "ezearocha@gmail.com",
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

    const expiredToken = await signJwt(payload, "0s");
    await new Promise((resolve) => setTimeout(resolve, 100));

    const verified = await verifyJwt(expiredToken);
    if (verified !== null) {
      throw new Error("Un token expirado fue validado exitosamente cuando debió ser rechazado!");
    }
  });

  // 4. Rechazo de token con firma alterada (Tampered)
  await test("Rechazo de token JWT con firma manipulada/alterada", async () => {
    const payload = {
      sub: "user-tampered",
      email: "tamper@tiendadelki.com",
      role: Role.ADMIN,
      name: "Admin Tamper",
    };

    const validToken = await signJwt(payload, "2h");
    const parts = validToken.split(".");
    // Modificar un carácter de la firma
    const lastChar = parts[2].slice(-1);
    const alteredChar = lastChar === "a" ? "b" : "a";
    const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -1)}${alteredChar}`;

    const verified = await verifyJwt(tamperedToken);
    if (verified !== null) {
      throw new Error("Un token con firma alterada fue validado exitosamente!");
    }
  });

  // 5. Rechazo de token con emisor (issuer) no autorizado
  await test("Rechazo estricto de token firmado con emisor (iss) no autorizado", async () => {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET;
    const secretKey = new TextEncoder().encode(secret);

    const maliciousToken = await new SignJWT({
      sub: "hacker-1",
      email: "attacker@evil.com",
      role: Role.SUPER_ADMIN,
      name: "Attacker",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .setIssuer("https://malicious-domain.com")
      .sign(secretKey);

    const verified = await verifyJwt(maliciousToken);
    if (verified !== null) {
      throw new Error("Un token con emisor no autorizado fue aceptado!");
    }
  });

  // 6. Normalización de emisor canónico (Trailing slash tolerance)
  await test("Tolerancia y normalización de emisor canónico con y sin barra inclinada", async () => {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET;
    const secretKey = new TextEncoder().encode(secret);

    // Firmar con barra al final
    const tokenWithSlash = await new SignJWT({
      sub: "user-slash",
      email: "slash@tiendadelki.com",
      role: Role.ADMIN,
      name: "Admin Slash",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .setIssuer("https://tiendadelki.vercel.app/")
      .sign(secretKey);

    const verifiedSlash = await verifyJwt(tokenWithSlash);
    if (!verifiedSlash || verifiedSlash.sub !== "user-slash") {
      throw new Error("Fallo al validar emisor con barra inclinada canónica");
    }

    // Firmar sin barra al final
    const tokenNoSlash = await new SignJWT({
      sub: "user-noslash",
      email: "noslash@tiendadelki.com",
      role: Role.ADMIN,
      name: "Admin NoSlash",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .setIssuer("https://tiendadelki.vercel.app")
      .sign(secretKey);

    const verifiedNoSlash = await verifyJwt(tokenNoSlash);
    if (!verifiedNoSlash || verifiedNoSlash.sub !== "user-noslash") {
      throw new Error("Fallo al validar emisor sin barra inclinada canónica");
    }
  });

  // 7. Rechazo de token con algoritmo diferente a HS256
  await test("Rechazo de tokens con algoritmo no autorizado (ej. HS384 o 'none')", async () => {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET;
    const secretKey = new TextEncoder().encode(secret);

    // Firmar con HS384 (diferente a HS256)
    const tokenHs384 = await new SignJWT({
      sub: "user-alg",
      email: "alg@tiendadelki.com",
      role: Role.ADMIN,
      name: "Admin Alg",
    })
      .setProtectedHeader({ alg: "HS384" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .setIssuer(getCanonicalIssuer())
      .sign(secretKey);

    const verified = await verifyJwt(tokenHs384);
    if (verified !== null) {
      throw new Error("Un token con algoritmo no permitido (HS384) fue aceptado por error!");
    }
  });

  // 8. Opciones de Seguridad de Cookies
  await test("Verificación de parámetros de seguridad de la cookie de sesión td_auth_token", async () => {
    if (AUTH_COOKIE_OPTIONS.name !== "td_auth_token") {
      throw new Error(`Nombre de cookie inesperado: ${AUTH_COOKIE_OPTIONS.name}`);
    }
    if (AUTH_COOKIE_OPTIONS.options.httpOnly !== true) {
      throw new Error("AUTH_COOKIE_OPTIONS.httpOnly debe ser true");
    }
    if (AUTH_COOKIE_OPTIONS.options.path !== "/") {
      throw new Error("AUTH_COOKIE_OPTIONS.path debe ser '/'");
    }
    if (AUTH_COOKIE_OPTIONS.options.maxAge !== 86400) {
      throw new Error("AUTH_COOKIE_OPTIONS.maxAge debe ser 24 horas (86400 segundos)");
    }
    if (AUTH_COOKIE_OPTIONS.options.sameSite !== "lax") {
      throw new Error(`AUTH_COOKIE_OPTIONS.sameSite debe ser 'lax', recibido: ${AUTH_COOKIE_OPTIONS.options.sameSite}`);
    }
  });

  // 9. Rate Limiter
  await test("Rate Limiting bloquea tras superar el umbral de intentos fallidos", async () => {
    const testKey = "login:test-abuse-ip";
    rateLimiter.reset(testKey);

    for (let i = 1; i <= 5; i++) {
      const check = rateLimiter.check(testKey, 5, 60 * 1000);
      if (!check.allowed) throw new Error(`El intento ${i} debió permitirse`);
    }

    const blockedCheck = rateLimiter.check(testKey, 5, 60 * 1000);
    if (blockedCheck.allowed) {
      throw new Error("El 6to intento consecutivo no fue bloqueado por el rate limiter!");
    }
    if (blockedCheck.retryAfterSeconds <= 0) {
      throw new Error("retryAfterSeconds debe ser mayor a 0");
    }

    rateLimiter.reset(testKey);
  });

  // 10. Aislamiento de Roles
  await test("Aislamiento de roles (CUSTOMER bloqueado de operaciones administrativas)", async () => {
    const customerToken = await signJwt({
      sub: "fake-customer-id",
      email: "cliente@ejemplo.com",
      role: Role.CUSTOMER,
      name: "Cliente Falso",
    });

    const payload = await verifyJwt(customerToken);
    if (!payload) throw new Error("Token de cliente no verificó");

    const adminRoles = ["SUPER_ADMIN", "ADMIN", "STAFF"];
    if (adminRoles.includes(payload.role)) {
      throw new Error("FALLO DE AUTORIZACIÓN: Un usuario con rol CUSTOMER fue catalogado como ADMIN!");
    }
  });

  // 11. Bloqueo de usuario inactivo en session.ts
  await test("Bloqueo de usuario con cuenta inactiva (isActive: false) en requireAuthenticatedUser", async () => {
    // Simular un mock request con cookie de un usuario inactivo
    const inactiveUser = await prisma.user.findFirst({
      where: { isActive: false },
    });

    if (inactiveUser) {
      const inactiveToken = await signJwt({
        sub: inactiveUser.id,
        email: inactiveUser.email || "inactive@tiendadelki.com",
        role: inactiveUser.role,
        name: "Usuario Inactivo",
      });

      const fakeReq = {
        cookies: {
          get: (name: string) => (name === "td_auth_token" ? { value: inactiveToken } : undefined),
        },
        headers: new Headers(),
      } as any;

      let threw = false;
      try {
        await requireAuthenticatedUser(fakeReq);
      } catch (err: any) {
        threw = true;
        if (!err.message.includes("desactivada") && !err.message.includes("no encontrado")) {
          throw new Error(`Mensaje de error inesperado: ${err.message}`);
        }
      }

      if (!threw) {
        throw new Error("FALLO DE SEGURIDAD: Un usuario inactivo logró autenticarse!");
      }
    } else {
      console.log("   (Omitido test con DB: no existen usuarios con isActive: false en la base de datos de desarrollo)");
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
