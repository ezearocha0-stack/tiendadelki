import { env } from "../config/env";

const BASE_URL = "http://localhost:3000";

async function runHttpAuthTests() {
  console.log("🌐 ========================================================");
  console.log("🌐 INICIANDO PRUEBAS HTTP END-TO-END DE AUTENTICACIÓN");
  console.log("🌐 ========================================================\n");

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

  // 1. Acceso sin autenticación a API protegida
  await test("GET /api/admin/dashboard-stats sin autenticación retorna 401", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard-stats`);
    if (res.status !== 401) {
      throw new Error(`Se esperaba status 401, recibido ${res.status}`);
    }
    const data = await res.json();
    if (data.error?.code !== "UNAUTHORIZED") {
      throw new Error(`Código de error inesperado: ${data.error?.code}`);
    }
  });

  // 2. Acceso sin autenticación a página protegida (Redirección a login)
  await test("GET /admin/dashboard sin autenticación redirige al login", async () => {
    const res = await fetch(`${BASE_URL}/admin/dashboard`, {
      redirect: "manual",
    });
    // Debe retornar un 307 o 302 hacia /admin/login
    if (res.status !== 307 && res.status !== 302 && res.status !== 308) {
      throw new Error(`Se esperaba redirección (307/302), recibido ${res.status}`);
    }
    const location = res.headers.get("location");
    if (!location || !location.includes("/admin/login")) {
      throw new Error(`Ubicación de redirección inesperada: ${location}`);
    }
  });

  // 3. Login con contraseña incorrecta
  await test("POST /api/auth/login con contraseña incorrecta retorna 401", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.INITIAL_ADMIN_EMAIL,
        password: "PasswordIncorrecto123!",
      }),
    });

    if (res.status !== 401) {
      throw new Error(`Se esperaba status 401, recibido ${res.status}`);
    }
    const data = await res.json();
    if (data.error?.message !== "Credenciales inválidas.") {
      throw new Error(`Mensaje inesperado: ${data.error?.message}`);
    }
  });

  // 4. Login con payload inválido
  await test("POST /api/auth/login con email inválido retorna 422 (VALIDATION_ERROR)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "no-es-un-email",
        password: "123",
      }),
    });

    if (res.status !== 422) {
      throw new Error(`Se esperaba status 422, recibido ${res.status}`);
    }
    const data = await res.json();
    if (data.error?.code !== "VALIDATION_ERROR") {
      throw new Error(`Código inesperado: ${data.error?.code}`);
    }
  });

  // 5. Login correcto y recepción de Cookie HttpOnly
  let authCookie = "";
  await test("POST /api/auth/login con credenciales correctas retorna 200 y Set-Cookie HttpOnly", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: env.INITIAL_ADMIN_EMAIL,
        password: env.INITIAL_ADMIN_PASSWORD,
      }),
    });

    if (res.status !== 200) {
      const err = await res.text();
      throw new Error(`Login falló con status ${res.status}: ${err}`);
    }

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie || !setCookie.includes("td_auth_token")) {
      throw new Error("No se recibió la cookie td_auth_token");
    }
    if (!setCookie.toLowerCase().includes("httponly")) {
      throw new Error("La cookie NO tiene la directiva de seguridad HttpOnly");
    }

    // Extraer valor de la cookie
    authCookie = setCookie.split(";")[0];
  });

  // 6. Acceso a /api/auth/me con sesión válida
  await test("GET /api/auth/me con cookie de sesión válida retorna datos del usuario", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: authCookie },
    });

    if (res.status !== 200) {
      throw new Error(`Se esperaba status 200, recibido ${res.status}`);
    }

    const data = await res.json();
    if (data.data?.email !== env.INITIAL_ADMIN_EMAIL) {
      throw new Error(`Email inesperado: ${data.data?.email}`);
    }
    if (data.data?.role !== "SUPER_ADMIN") {
      throw new Error(`Rol inesperado: ${data.data?.role}`);
    }
  });

  // 7. Acceso a ruta administrativa protegida con sesión válida
  await test("GET /api/admin/dashboard-stats con cookie válida retorna métricas de negocio", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, {
      headers: { Cookie: authCookie },
    });

    if (res.status !== 200) {
      throw new Error(`Se esperaba status 200, recibido ${res.status}`);
    }

    const data = await res.json();
    if (!data.data?.metrics || typeof data.data.metrics.totalProducts !== "number") {
      throw new Error("Métricas no retornadas correctamente");
    }
  });

  // 8. Acceso con token inválido o corrupto
  await test("GET /api/admin/dashboard-stats con token corrupto retorna 401", async () => {
    const res = await fetch(`${BASE_URL}/api/admin/dashboard-stats`, {
      headers: { Cookie: "td_auth_token=token_invalido_totalmente_corrupto" },
    });

    if (res.status !== 401) {
      throw new Error(`Se esperaba status 401, recibido ${res.status}`);
    }
  });

  // 9. Logout
  await test("POST /api/auth/logout invalida la cookie de sesión", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: authCookie },
    });

    if (res.status !== 200) {
      throw new Error(`Logout falló con status ${res.status}`);
    }

    const setCookie = res.headers.get("set-cookie");
    if (!setCookie) {
      throw new Error("Logout no devolvió encabezado de expiración de cookie");
    }
  });

  // 10. Cabeceras de seguridad globales
  await test("Verificación de Headers de Seguridad (X-Frame-Options, X-Content-Type-Options, etc.)", async () => {
    const res = await fetch(`${BASE_URL}/`);
    const xFrame = res.headers.get("x-frame-options");
    const xContentType = res.headers.get("x-content-type-options");
    const referrerPolicy = res.headers.get("referrer-policy");

    if (xFrame !== "DENY") throw new Error(`x-frame-options inesperado: ${xFrame}`);
    if (xContentType !== "nosniff") throw new Error(`x-content-type-options inesperado: ${xContentType}`);
    if (!referrerPolicy) throw new Error("referrer-policy ausente");
  });

  console.log("\n🌐 ========================================================");
  console.log(`🌐 RESULTADOS: ${passed}/${total} PRUEBAS HTTP SUPERADAS`);
  console.log("🌐 ========================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
}

runHttpAuthTests().catch((e) => {
  console.error("Error fatal en pruebas HTTP:", e);
  process.exit(1);
});
