interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Limpieza periódica de registros expirados cada 5 minutos
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
      if (this.cleanupInterval.unref) {
        this.cleanupInterval.unref();
      }
    }
  }

  /**
   * Comprueba e incrementa el contador de intentos para una clave dada.
   * @param key Identificador (ej. "login:ip:127.0.0.1")
   * @param maxAttempts Máximo de intentos permitidos en la ventana
   * @param windowMs Duración de la ventana en milisegundos
   */
  check(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
  } {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now > record.resetTime) {
      // Nueva ventana de tiempo
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return {
        allowed: true,
        remaining: maxAttempts - 1,
        retryAfterSeconds: 0,
      };
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: maxAttempts - record.count,
      retryAfterSeconds: 0,
    };
  }

  /**
   * Resetea el contador (por ejemplo, tras un login exitoso).
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

export const rateLimiter = new MemoryRateLimiter();
