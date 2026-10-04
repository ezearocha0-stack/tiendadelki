import { SignJWT, jwtVerify, decodeJwt } from "jose";
import { env } from "@/config/env";

export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF" | "CUSTOMER";
export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export interface TokenPayload {
  sub: string;         // User ID
  email: string;
  role: Role;
  name: string;
  [key: string]: unknown;
}

export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF];
export const CUSTOMER_ROLES: Role[] = [Role.CUSTOMER];

/**
 * Obtiene la lista de emisores (issuers) válidos autorizados.
 * Normaliza las URLs removiendo barras inclinadas finales para prevenir
 * fallos por discrepancias entre https://tiendadelki.vercel.app y https://tiendadelki.vercel.app/
 */
export function getValidIssuers(): string[] {
  const issuers = new Set<string>();

  // 1. Emisor configurado en entorno
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (siteUrl) {
    issuers.add(siteUrl);
    issuers.add(`${siteUrl}/`);
  }

  // 2. Emisor canónico de producción (garantía de interoperabilidad Vercel <-> Render)
  issuers.add("https://tiendadelki.vercel.app");
  issuers.add("https://tiendadelki.vercel.app/");

  // 3. Emisores locales para desarrollo y pruebas
  if (process.env.NODE_ENV !== "production") {
    issuers.add("http://localhost:3000");
    issuers.add("http://localhost:3000/");
    issuers.add("http://127.0.0.1:3000");
    issuers.add("http://127.0.0.1:3000/");
  }

  return Array.from(issuers);
}

/**
 * Obtiene el emisor canónico estándar para firmar nuevos tokens.
 */
export function getCanonicalIssuer(): string {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL || env.NEXT_PUBLIC_SITE_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (configured && !configured.includes("localhost") && !configured.includes("127.0.0.1")) {
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    return "https://tiendadelki.vercel.app";
  }

  return configured || "http://localhost:3000";
}

/**
 * Genera un token JWT firmado de forma segura en el Backend.
 * Algoritmo estricto: HS256.
 */
export async function signJwt(payload: TokenPayload, expiresIn = "24h"): Promise<string> {
  const secret = process.env.JWT_SECRET || env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no configurado en el servidor para firmar tokens.");
  }
  const secretKey = new TextEncoder().encode(secret);
  const issuer = getCanonicalIssuer();

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(issuer)
    .sign(secretKey);
}

/**
 * Valida ESTRICTAMENTE la firma e integridad criptográfica del token JWT con HMAC SHA-256.
 * Restricciones de seguridad estrictas:
 * - Algoritmo obligatorio: HS256 (rechaza de forma segura 'none', RSA u otros algoritmos).
 * - Emisor estricto: Valida contra la lista autorizada getValidIssuers().
 * - Valida sub, role y expiración (exp).
 * Si falta JWT_SECRET o el token es inválido/manipulado, retorna null (Fail-Closed seguro).
 */
export async function verifyJwt(token: string): Promise<TokenPayload | null> {
  try {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET;

    if (!secret) {
      // Si falta JWT_SECRET en el entorno, fallar de forma segura inmediatamente
      return null;
    }

    const secretKey = new TextEncoder().encode(secret);
    const validIssuers = getValidIssuers();

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
      issuer: validIssuers,
    });

    // Validación estricta de estructura de claims obligatorios
    if (!payload.sub || typeof payload.sub !== "string" || !payload.role) {
      return null;
    }

    return payload as unknown as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Extrae claims sin verificar la firma criptográfica.
 * ADVERTENCIA CRÍTICA DE SEGURIDAD:
 * Esta función NUNCA debe considerarse prueba de autenticación ni utilizarse
 * para autorizar acceso a endpoints protegidos, operaciones administrativas ni datos sensibles.
 * Solo puede utilizarse para visualización no crítica en interfaces donde el backend
 * valida las solicitudes de forma autoritativa.
 */
export function decodeJwtClaimsUnverified(token: string): TokenPayload | null {
  try {
    const payload = decodeJwt(token) as unknown as TokenPayload & { exp?: number };
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null;
    }
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Opciones de seguridad estándar para la cookie de autenticación.
 */
export const AUTH_COOKIE_OPTIONS = {
  name: env.COOKIE_NAME,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.CROSS_ORIGIN_COOKIES === "true" ? "none" : "lax") as "lax" | "none" | "strict",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 horas en segundos
  },
};
