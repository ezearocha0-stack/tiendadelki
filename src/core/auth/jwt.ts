import { SignJWT, jwtVerify } from "jose";
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

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export const ADMIN_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMIN, Role.STAFF];
export const CUSTOMER_ROLES: Role[] = [Role.CUSTOMER];

/**
 * Genera un token JWT firmado de forma segura.
 * Compatible con Node.js y Edge Runtime (Next.js Middleware).
 */
export async function signJwt(payload: TokenPayload, expiresIn = "24h"): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer(env.NEXT_PUBLIC_SITE_URL)
    .sign(secretKey);
}

/**
 * Valida la firma e integridad del token JWT y comprueba su expiración.
 */
export async function verifyJwt(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: env.NEXT_PUBLIC_SITE_URL,
    });
    return payload as unknown as TokenPayload;
  } catch (error) {
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
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24, // 24 horas en segundos
  },
};
