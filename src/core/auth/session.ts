import { NextRequest } from "next/server";
import { verifyJwt, AUTH_COOKIE_OPTIONS, Role, ADMIN_ROLES } from "./jwt";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

export interface SessionUser {
  userId: string;
  role: Role;
  email?: string;
}

/**
 * Obtiene el usuario autenticado desde los headers del middleware o directamente desde la cookie/JWT.
 */
export async function getAuthenticatedUser(req: NextRequest | Request): Promise<SessionUser | null> {
  // 1. Cookie de sesión o header Authorization (fuente criptográfica de verdad)
  let token: string | undefined;
  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    token = (req as NextRequest).cookies.get(AUTH_COOKIE_OPTIONS.name)?.value;
  }

  if (!token) {
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader) {
      const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${AUTH_COOKIE_OPTIONS.name}=([^;]*)`));
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
  }

  if (!token) {
    token = req.headers.get("authorization")?.replace("Bearer ", "");
  }

  // 2. Si se suministra token JWT, validar firma criptográfica, emisor y expiración
  if (token) {
    const payload = await verifyJwt(token);
    if (payload && payload.sub) {
      return {
        userId: payload.sub,
        role: payload.role,
        email: payload.email,
      };
    }
    // Si el token provisto es inválido o corrupto, no autenticar
    return null;
  }

  // 3. Cabeceras propagadas por el middleware solo en entorno de pruebas controladas
  if (process.env.NODE_ENV === "test" || process.env.NODE_ENV === "development") {
    const headerUserId = req.headers.get("x-user-id");
    const headerUserRole = req.headers.get("x-user-role");
    if (headerUserId) {
      return {
        userId: headerUserId,
        role: (headerUserRole || "CUSTOMER") as Role,
        email: req.headers.get("x-user-email") || undefined,
      };
    }
  }

  return null;
}

/**
 * Exige que exista un usuario autenticado. Lanza UnauthorizedError si no hay sesión.
 * En el backend (con acceso a base de datos), verifica activamente que el usuario
 * continúe activo en PostgreSQL (isActive: true).
 */
export async function requireAuthenticatedUser(req: NextRequest | Request): Promise<SessionUser> {
  const user = await getAuthenticatedUser(req);
  if (!user) {
    throw new UnauthorizedError("Debe iniciar sesión para realizar esta acción.");
  }

  // Validación autoritativa en tiempo real contra la base de datos (Backend Render / Local)
  if (process.env.DATABASE_URL) {
    const { prisma } = await import("@/lib/db");
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        email: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedError("Usuario no encontrado o cuenta desactivada.");
    }

    return {
      userId: dbUser.id,
      role: dbUser.role as Role,
      email: dbUser.email || user.email,
    };
  }

  return user;
}

/**
 * Exige que exista un usuario autenticado con rol administrativo (ADMIN, SUPERADMIN, STAFF).
 * Lanza UnauthorizedError si no hay sesión o ForbiddenError si no tiene permisos.
 * En el backend, valida activamente que el usuario no haya sido desactivado ni degradado.
 */
export async function requireAdminUser(req: NextRequest | Request): Promise<SessionUser> {
  const user = await requireAuthenticatedUser(req);
  if (!ADMIN_ROLES.includes(user.role)) {
    throw new ForbiddenError("Acceso denegado: se requieren permisos administrativos.");
  }
  return user;
}
