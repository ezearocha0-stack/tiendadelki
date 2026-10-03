type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  context?: string;
  metadata?: Record<string, unknown>;
  error?: Error | unknown;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "jwt_secret",
  "cookie",
  "creditcard",
  "cvv",
  "apikey",
]);

/**
 * Sanitiza recursivamente objetos y metadata para evitar registrar secretos en los logs de producción.
 */
function redactSensitiveData(obj: unknown, depth = 0): unknown {
  if (depth > 5) return "[Max Depth Reached]";
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, "");
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = redactSensitiveData(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class Logger {
  private isProduction = process.env.NODE_ENV === "production";

  private format(level: LogLevel, payload: LogPayload): string {
    const timestamp = new Date().toISOString();
    const context = payload.context || "App";
    const cleanMeta = payload.metadata ? (redactSensitiveData(payload.metadata) as Record<string, unknown>) : undefined;

    // En Producción: Formato JSON estructurado de una sola línea (NDJSON)
    if (this.isProduction) {
      const errorObj = payload.error
        ? {
            name: payload.error instanceof Error ? payload.error.name : "Error",
            message: payload.error instanceof Error ? payload.error.message : String(payload.error),
            stack: payload.error instanceof Error ? payload.error.stack : undefined,
          }
        : undefined;

      return JSON.stringify({
        timestamp,
        level,
        context,
        message: payload.message,
        ...(cleanMeta && { metadata: cleanMeta }),
        ...(errorObj && { error: errorObj }),
      });
    }

    // En Desarrollo / Test: Formato amigable legible por humanos
    const metaStr = cleanMeta ? `\nMetadata: ${JSON.stringify(cleanMeta, null, 2)}` : "";
    const errorStr = payload.error
      ? `\nError: ${payload.error instanceof Error ? payload.error.stack : JSON.stringify(payload.error)}`
      : "";

    return `${timestamp} [${level.toUpperCase()}] [${context}] ${payload.message}${metaStr}${errorStr}`;
  }

  info(message: string, context?: string, metadata?: Record<string, unknown>): void {
    console.log(this.format("info", { message, context, metadata }));
  }

  warn(message: string, context?: string, metadata?: Record<string, unknown>): void {
    console.warn(this.format("warn", { message, context, metadata }));
  }

  error(message: string, error?: Error | unknown, context?: string, metadata?: Record<string, unknown>): void {
    console.error(this.format("error", { message, context, metadata, error }));
  }

  debug(message: string, context?: string, metadata?: Record<string, unknown>): void {
    if (!this.isProduction) {
      console.debug(this.format("debug", { message, context, metadata }));
    }
  }
}

export const logger = new Logger();
