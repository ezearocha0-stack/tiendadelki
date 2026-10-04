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
 * Genera un token JWT firmado de forma segura en el Backend.
 */
export async function signJwt(payload: TokenPayload, expiresIn = "24h"): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET no configurado en el servidor para firmar tokens.");
  }
  const secretKey = new TextEncoder().encode(secret);

  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(env.NEXT_PUBLIC_SITE_URL)
    .sign(secretKey);
}

/**
 * Valida ESTRICTAMENTE la firma e integridad criptográfica del token JWT con HMAC SHA-256.
 * Si falta JWT_SECRET en el entorno, o el token está manipulado, expirado o con firma incorrecta,
 * la función falla de forma segura retornando null (Fail-Closed).
 * NUNCA otorga acceso basándose en decodificación sin firma.
 */
export async function verifyJwt(token: string): Promise<TokenPayload | null> {
  try {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      // Si falta JWT_SECRET en el entorno, fallar de forma segura inmediatamente
      return null;
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: env.NEXT_PUBLIC_SITE_URL || undefined,
    });
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

