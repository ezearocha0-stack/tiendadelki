import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/config/env";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET() {
  const checkTimestamp = new Date().toISOString();
  const startTime = Date.now();

  let dbHealthy = false;
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  // 1. Verificación profunda de PostgreSQL
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbHealthy = true;
  } catch (error: any) {
    dbHealthy = false;
    dbError = error?.message || "Error al conectar con la base de datos PostgreSQL.";
  }

  // 2. Verificación de accesibilidad del almacenamiento
  let storageHealthy = false;
  let storageError: string | null = null;

  try {
    const uploadPath = path.resolve(process.cwd(), env.UPLOAD_DIR);
    const privatePath = path.resolve(process.cwd(), env.PRIVATE_STORAGE_DIR);

    await fs.mkdir(uploadPath, { recursive: true });
    await fs.mkdir(privatePath, { recursive: true });

    // Probar escritura y eliminación de un archivo testigo efímero
    const testFile = path.join(privatePath, `.health_probe_${Date.now()}`);
    await fs.writeFile(testFile, "probe");
    await fs.unlink(testFile);

    storageHealthy = true;
  } catch (error: any) {
    storageHealthy = false;
    storageError = error?.message || "Error al acceder o escribir en los directorios de almacenamiento.";
  }

  // 3. Métricas de recursos del proceso
  const mem = process.memoryUsage();
  const memoryUsage = {
    rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
  };

  const isHealthy = dbHealthy && storageHealthy;
  const totalDurationMs = Date.now() - startTime;

  const payload = {
    status: isHealthy ? "healthy" : "degraded",
    timestamp: checkTimestamp,
    uptimeSeconds: Math.floor(process.uptime()),
    checkDurationMs: totalDurationMs,
    environment: env.NODE_ENV,
    version: "1.0.0",
    checks: {
      database: {
        status: dbHealthy ? "up" : "down",
        latencyMs: dbLatencyMs,
        engine: "PostgreSQL 16",
        ...(dbError && { error: dbError }),
      },
      storage: {
        status: storageHealthy ? "up" : "down",
        provider: env.STORAGE_PROVIDER,
        uploadDir: env.UPLOAD_DIR,
        privateDir: env.PRIVATE_STORAGE_DIR,
        ...(storageError && { error: storageError }),
      },
    },
    system: {
      memory: memoryUsage,
      nodeVersion: process.version,
      platform: process.platform,
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Health-Check": isHealthy ? "PASS" : "FAIL",
    },
  });
}
