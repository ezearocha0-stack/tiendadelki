import { NextRequest, NextResponse } from "next/server";
import { verifyJwt, ADMIN_ROLES, CUSTOMER_ROLES } from "@/core/auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const cookieName = process.env.COOKIE_NAME || "td_auth_token";
  const token = req.cookies.get(cookieName)?.value || req.headers.get("authorization")?.replace("Bearer ", "");

  // 0. Manejo estricto de CORS para llamadas entre dominios (Vercel <-> Render)
  const origin = req.headers.get("origin");
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.NEXT_PUBLIC_SITE_URL || "")
    .split(",")
    .map((o) => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);

  // Asegurar que el dominio canónico de producción siempre sea reconocido para CORS
  allowedOrigins.push("https://tiendadelki.vercel.app");

  // Permitir localhost solo en desarrollo o testing
  if (process.env.NODE_ENV !== "production") {
    allowedOrigins.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  const isOriginAllowed = Boolean(origin && allowedOrigins.includes(origin.replace(/\/+$/, "")));

  if (req.method === "OPTIONS") {
    if (!isOriginAllowed || !origin) {
      // Rechazar Preflight de orígenes no autorizados sin emitir cabeceras CORS
      return new NextResponse(null, { status: 403 });
    }
    const preflight = new NextResponse(null, { status: 204 });
    preflight.headers.set("Access-Control-Allow-Origin", origin);
    preflight.headers.set("Access-Control-Allow-Credentials", "true");
    preflight.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    preflight.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
    );
    preflight.headers.set("Access-Control-Max-Age", "86400");
    return preflight;
  }

  // 1. Ruta pública de Login Administrativo
  if (pathname === "/admin/login") {
    if (token) {
      const payload = await verifyJwt(token);
      if (payload && ADMIN_ROLES.includes(payload.role)) {
        // Si ya está autenticado con rol administrativo, redirigir al dashboard
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Rutas Administrativas Protegidas (/admin/* y /api/admin/*)
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");

  if (isAdminPage || isAdminApi) {
    if (!token) {
      if (isAdminApi) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Acceso no autorizado: token de sesión ausente.",
            },
          },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyJwt(token);

    if (!payload) {
      // Token inválido o expirado
      if (isAdminApi) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Sesión inválida o expirada. Favor iniciar sesión nuevamente.",
            },
          },
          { status: 401 }
        );
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("error", "session_expired");
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete(cookieName);
      return res;
    }

    // Autorización estricta: Solo roles de tienda / administración
    if (!ADMIN_ROLES.includes(payload.role)) {
      if (isAdminApi) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN",
              message: "Acceso denegado: se requieren permisos administrativos.",
            },
          },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/?error=forbidden", req.url));
    }

    // Usuario autenticado con rol administrativo válido: propagar cabeceras internas
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-email", payload.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 3. Rutas de Cliente Protegidas (/cliente/* o /api/cliente/*)
  const isCustomerPage = pathname.startsWith("/cliente");
  const isCustomerApi = pathname.startsWith("/api/cliente");

  if (isCustomerPage || isCustomerApi) {
    if (!token) {
      if (isCustomerApi) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Debe iniciar sesión para acceder a su cuenta.",
            },
          },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login?callbackUrl=" + pathname, req.url));
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      if (isCustomerApi) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "UNAUTHORIZED",
              message: "Sesión expirada.",
            },
          },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/login?error=session_expired", req.url));
    }

    // Tanto clientes como admins pueden acceder al área cliente si lo desean
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-user-role", payload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  // 4. Protección de operaciones administrativas en catálogo, inventario, uploads y configuración
  const isCatalogMutation =
    (pathname.startsWith("/api/products") || pathname.startsWith("/api/categories")) &&
    req.method !== "GET";
  const isInventoryApi = pathname.startsWith("/api/inventory");
  const isUploadsMutation = pathname.startsWith("/api/uploads") && req.method !== "GET";
  const isSettingsMutation = pathname.startsWith("/api/settings") && req.method !== "GET";

  if (isCatalogMutation || isInventoryApi || isUploadsMutation || isSettingsMutation) {
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Acceso no autorizado: token de sesión ausente.",
          },
        },
        { status: 401 }
      );
    }

    const payload = await verifyJwt(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Sesión inválida o expirada.",
          },
        },
        { status: 401 }
      );
    }

    if (!ADMIN_ROLES.includes(payload.role)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Acceso denegado: se requieren permisos administrativos.",
          },
        },
        { status: 403 }
      );
    }

    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", payload.sub);
    requestHeaders.set("x-user-role", payload.role);
    requestHeaders.set("x-user-email", payload.email);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/cliente/:path*",
    "/api/cliente/:path*",
    "/api/products/:path*",
    "/api/products",
    "/api/categories/:path*",
    "/api/categories",
    "/api/inventory/:path*",
    "/api/inventory",
    "/api/uploads/:path*",
    "/api/uploads",
    "/api/settings/:path*",
    "/api/settings",
  ],
};
