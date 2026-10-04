import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL
    ? new PrismaClient({
        log:
          process.env.NODE_ENV === "development"
            ? ["query", "error", "warn"]
            : ["error"],
      })
    : (new Proxy({}, {
        get(_target, prop) {
          throw new Error(
            `[Prisma] Intento de acceso a '${String(prop)}' en un entorno sin DATABASE_URL (Frontend Vercel). Todas las consultas deben realizarse a través de la API de Render.`
          );
        },
      }) as unknown as PrismaClient));

if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL) {
  globalForPrisma.prisma = prisma;
}
