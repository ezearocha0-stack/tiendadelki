import { z } from "zod";

const DEFAULT_DEV_JWT = "tiendadelki-jwt-secret-key-change-in-production-min-32-chars-long";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(3000),
    NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
    NEXT_PUBLIC_API_URL: z.string().url().optional(),
    DATABASE_URL: z.string().optional(),
    DIRECT_URL: z.string().optional(),
    JWT_SECRET: z
      .string()
      .min(16, "JWT_SECRET debe tener al menos 16 caracteres")
      .default(DEFAULT_DEV_JWT),
    INITIAL_ADMIN_EMAIL: z.string().email().default("ezearocha@gmail.com"),
    INITIAL_ADMIN_PASSWORD: z.string().min(8).default("TiendaDelki#2026!Adm"),
    COOKIE_NAME: z.string().default("td_auth_token"),
    STORAGE_PROVIDER: z.enum(["local", "s3", "r2"]).default("local"),
    UPLOAD_DIR: z.string().default("./public/uploads"),
    PRIVATE_STORAGE_DIR: z.string().default("./storage/private"),
    NEXT_PUBLIC_WHATSAPP_PHONE: z.string().default(""),
    CROSS_ORIGIN_COOKIES: z.enum(["true", "false"]).default("false"),

    // Parámetros de Object Storage S3 / Cloudflare R2 (para hosting sin filesystem persistente)
    S3_ENDPOINT: z.string().url().optional(),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_PUBLIC_URL: z.string().url().optional(),

    // Parámetros de despliegue distribuido (Vercel Proxy / Render Backend)
    BACKEND_API_URL: z.string().url().optional(),
    ALLOWED_ORIGINS: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // Validaciones críticas en producción
    if (data.NODE_ENV === "production") {
      const isFrontendVercel = Boolean(data.BACKEND_API_URL || data.NEXT_PUBLIC_API_URL);

      if (isFrontendVercel) {
        // En Vercel (Frontend en Producción): JWT_SECRET es obligatorio para verificar la sesión en el Edge
        if (
          !data.JWT_SECRET ||
          data.JWT_SECRET.length < 32 ||
          data.JWT_SECRET === DEFAULT_DEV_JWT ||
          data.JWT_SECRET.includes("change-in-production")
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["JWT_SECRET"],
            message:
              "En Vercel (producción), JWT_SECRET es obligatorio, debe tener al menos 32 caracteres y debe ser idéntico al configurado en Render.",
          });
        }
      } else {
        // En Render / Backend / Monolito: DATABASE_URL y JWT_SECRET son obligatorios y estrictos
        if (!data.DATABASE_URL) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["DATABASE_URL"],
            message: "En el backend de producción, DATABASE_URL es requerida.",
          });
        }

        if (
          !data.JWT_SECRET ||
          data.JWT_SECRET.length < 32 ||
          data.JWT_SECRET === DEFAULT_DEV_JWT ||
          data.JWT_SECRET.includes("change-in-production")
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["JWT_SECRET"],
            message:
              "En el backend de producción, JWT_SECRET es obligatorio, debe tener al menos 32 caracteres y no puede ser el valor por defecto.",
          });
        }
      }

      // 2. Comprobar HTTPS en NEXT_PUBLIC_SITE_URL
      if (!data.NEXT_PUBLIC_SITE_URL.startsWith("https://") && !data.NEXT_PUBLIC_SITE_URL.includes("localhost")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["NEXT_PUBLIC_SITE_URL"],
          message: "En producción, NEXT_PUBLIC_SITE_URL debe utilizar el protocolo HTTPS.",
        });
      }

      // 3. Validar credenciales completas si se utiliza almacenamiento en la nube (S3 / R2)
      if (data.STORAGE_PROVIDER === "s3" || data.STORAGE_PROVIDER === "r2") {
        if (!data.S3_BUCKET) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["S3_BUCKET"],
            message: "S3_BUCKET es requerido cuando STORAGE_PROVIDER es s3 o r2.",
          });
        }
        if (!data.S3_ACCESS_KEY_ID) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["S3_ACCESS_KEY_ID"],
            message: "S3_ACCESS_KEY_ID es requerido cuando STORAGE_PROVIDER es s3 o r2.",
          });
        }
        if (!data.S3_SECRET_ACCESS_KEY) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["S3_SECRET_ACCESS_KEY"],
            message: "S3_SECRET_ACCESS_KEY es requerido cuando STORAGE_PROVIDER es s3 o r2.",
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env;

try {
  parsedEnv = envSchema.parse({
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL,
    INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD,
    COOKIE_NAME: process.env.COOKIE_NAME,
    STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
    UPLOAD_DIR: process.env.UPLOAD_DIR,
    PRIVATE_STORAGE_DIR: process.env.PRIVATE_STORAGE_DIR,
    NEXT_PUBLIC_WHATSAPP_PHONE: process.env.NEXT_PUBLIC_WHATSAPP_PHONE,
    CROSS_ORIGIN_COOKIES: process.env.CROSS_ORIGIN_COOKIES,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_REGION: process.env.S3_REGION,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL,
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  });
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error("❌ [CRITICAL] Error fatal de configuración en variables de entorno:");
    error.errors.forEach((err) => {
      console.error(`  - ${err.path.join(".")}: ${err.message}`);
    });

    // En producción en tiempo de ejecución, detener de inmediato la ejecución para evitar operar con secretos inseguros
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
      throw new Error(
        "Fallo crítico en validación de variables de entorno para PRODUCCIÓN. Verifique los errores anteriores."
      );
    }
  }

  // En desarrollo o pruebas locales, aplicar fallback seguro
  parsedEnv = {
    NODE_ENV: (process.env.NODE_ENV as "development" | "test" | "production") || "development",
    PORT: Number(process.env.PORT) || 3000,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/tiendadelki_dev?schema=public",
    DIRECT_URL:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL ||
      "postgresql://postgres:postgres@localhost:5432/tiendadelki_dev?schema=public",
    JWT_SECRET: process.env.JWT_SECRET || DEFAULT_DEV_JWT,
    INITIAL_ADMIN_EMAIL: process.env.INITIAL_ADMIN_EMAIL || "ezearocha@gmail.com",
    INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD || "TiendaDelki#2026!Adm",
    COOKIE_NAME: process.env.COOKIE_NAME || "td_auth_token",
    STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER as "local" | "s3" | "r2") || "local",
    UPLOAD_DIR: process.env.UPLOAD_DIR || "./public/uploads",
    PRIVATE_STORAGE_DIR: process.env.PRIVATE_STORAGE_DIR || "./storage/private",
    NEXT_PUBLIC_WHATSAPP_PHONE: process.env.NEXT_PUBLIC_WHATSAPP_PHONE || "",
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    CROSS_ORIGIN_COOKIES: (process.env.CROSS_ORIGIN_COOKIES as "true" | "false") || "false",
    S3_REGION: "auto",
    BACKEND_API_URL: process.env.BACKEND_API_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  };
}

export const env = parsedEnv;
