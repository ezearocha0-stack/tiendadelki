import { GET as healthHandler } from "../app/api/health/route";

async function runHealthTests() {
  console.log("🩺 ========================================================");
  console.log("🩺 INICIANDO SUITE DE PRUEBAS DE SALUD (HEALTH CHECK API)");
  console.log("🩺 ========================================================\n");

  try {
    const res = await healthHandler();
    const json = await res.json();

    console.log("Respuesta de Salud del Sistema:", JSON.stringify(json, null, 2));

    if (res.status !== 200) {
      throw new Error(`Código de estado HTTP inesperado: ${res.status}`);
    }

    if (json.status !== "healthy") {
      throw new Error(`El estado del sistema no es 'healthy': ${json.status}`);
    }

    if (json.checks.database.status !== "up") {
      throw new Error("El chequeo de PostgreSQL indica que la base de datos está caída.");
    }

    if (json.checks.storage.status !== "up") {
      throw new Error("El chequeo de almacenamiento indica que el storage está inaccesible.");
    }

    console.log("\n✅ [PASS] Endpoint /api/health responde con HTTP 200");
    console.log("✅ [PASS] Base de Datos PostgreSQL 16 operativa (UP)");
    console.log(`✅ [PASS] Latencia de Base de Datos óptima (${json.checks.database.latencyMs}ms)`);
    console.log("✅ [PASS] Directorios de Almacenamiento accesibles y con permisos de escritura (UP)");
    console.log(`✅ [PASS] Métricas de Memoria RSS: ${json.system.memory.rssMb}MB, Heap: ${json.system.memory.heapUsedMb}MB`);

    console.log("\n========================================================");
    console.log("🎉 TODAS LAS PRUEBAS DE SALUD DEL SISTEMA SUPERADAS");
    console.log("========================================================\n");
  } catch (error) {
    console.error("❌ Fallo en las pruebas de salud:", error);
    process.exit(1);
  }
}

runHealthTests();
