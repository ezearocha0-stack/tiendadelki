import { ProductFilterParams } from "@/core/catalog/product-service";

/**
 * URL base del backend para llamadas SSR desde Server Components.
 * En Vercel: toma BACKEND_API_URL o NEXT_PUBLIC_API_URL (Render).
 * En Render / Local: toma NEXT_PUBLIC_SITE_URL o localhost.
 */
export function getBackendBaseUrl(): string {
  const backend =
    process.env.BACKEND_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  return backend.replace(/\/+$/, "");
}

/**
 * Realiza un fetch tipado contra el backend API.
 * Se utiliza en Server Components cuando se ejecuta en Vercel (frontend desacoplado).
 */
export async function fetchFromBackend<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  const baseUrl = getBackendBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      // Desactivar caché estática por defecto para reflejar el estado actual del inventario/catálogo
      cache: options?.cache || "no-store",
    });

    if (!res.ok) {
      console.warn(`[ServerAPI] Error ${res.status} al consultar ${url}`);
      return null;
    }

    const json = await res.json();
    return (json.data !== undefined ? json.data : json) as T;
  } catch (error) {
    console.error(`[ServerAPI] Error de red consultando backend (${url}):`, error);
    return null;
  }
}

// ==============================================================================
// MÉTODOS DE CONSULTA ADAPTATIVOS (Prisma Directo en Render / API HTTP en Vercel)
// ==============================================================================

function isDirectDbMode(): boolean {
  // Solo usar Prisma directamente si DATABASE_URL está configurada Y NO estamos forzando modo frontend remoto
  return Boolean(process.env.DATABASE_URL && !process.env.BACKEND_API_URL);
}

/**
 * Obtiene categorías activas con conteos.
 */
export async function getCategories(take?: number): Promise<any[]> {
  if (isDirectDbMode()) {
    const { CategoryService } = await import("@/core/catalog/category-service");
    const categories = await CategoryService.listCategories(false);
    return take ? categories.slice(0, take) : categories;
  }

  const data = await fetchFromBackend<any[]>("/api/categories");
  if (!data) return [];
  return take ? data.slice(0, take) : data;
}

/**
 * Obtiene una categoría por su slug o ID, incluyendo sus productos publicados.
 */
export async function getCategoryBySlug(slug: string): Promise<any | null> {
  if (isDirectDbMode()) {
    const { CategoryService } = await import("@/core/catalog/category-service");
    try {
      return await CategoryService.getCategoryById(slug);
    } catch {
      return null;
    }
  }

  return fetchFromBackend<any>(`/api/categories/${encodeURIComponent(slug)}`);
}

/**
 * Obtiene productos aplicando filtros de búsqueda, categoría, ofertas, precio y orden.
 */
export async function getProducts(params: ProductFilterParams = {}): Promise<{ data: any[]; pagination: any }> {
  if (isDirectDbMode()) {
    const { ProductService } = await import("@/core/catalog/product-service");
    return ProductService.listProducts(params);
  }

  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.categoryId) query.set("categoryId", params.categoryId);
  if (params.categorySlug) query.set("categorySlug", params.categorySlug);
  if (params.status) query.set("status", params.status);
  if (params.isFeatured !== undefined) query.set("featured", String(params.isFeatured));
  if (params.isNew !== undefined) query.set("isNew", String(params.isNew));
  if (params.deals) query.set("deals", "true");
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.inStock) query.set("inStock", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.page) query.set("page", String(params.page));
  if (params.limit) query.set("limit", String(params.limit));

  const endpoint = `/api/products${query.toString() ? `?${query.toString()}` : ""}`;
  const res = await fetchFromBackend<any>(endpoint);

  if (!res) {
    return { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } };
  }

  return {
    data: Array.isArray(res) ? res : res.data || [],
    pagination: res.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 },
  };
}

/**
 * Obtiene productos destacados para la página de inicio.
 */
export async function getFeaturedProducts(limit = 8): Promise<any[]> {
  const result = await getProducts({
    status: "PUBLISHED",
    isFeatured: true,
    limit,
  });
  return result.data;
}

/**
 * Obtiene novedades para la página de inicio.
 */
export async function getNewProducts(limit = 8): Promise<any[]> {
  const result = await getProducts({
    status: "PUBLISHED",
    isNew: true,
    limit,
  });
  return result.data;
}

/**
 * Obtiene ofertas activas (compareAtPrice > 0).
 */
export async function getDealProducts(limit = 8, categorySlug?: string, sort?: string): Promise<any[]> {
  const result = await getProducts({
    status: "PUBLISHED",
    deals: true,
    categorySlug,
    sort,
    limit,
  });
  return result.data;
}

/**
 * Obtiene un producto por slug o ID para la vista de detalle.
 */
export async function getProductBySlug(identifier: string): Promise<any | null> {
  if (isDirectDbMode()) {
    const { ProductService } = await import("@/core/catalog/product-service");
    return ProductService.getProductByIdOrSlug(identifier);
  }

  return fetchFromBackend<any>(`/api/products/${encodeURIComponent(identifier)}`);
}

/**
 * Obtiene los métodos de envío activos para el checkout.
 */
export async function getShippingMethods(): Promise<any[]> {
  if (isDirectDbMode()) {
    const { prisma } = await import("@/lib/db");
    const methods = await prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return methods.map((m) => ({
      id: m.id,
      name: m.name,
      zoneDescription: m.zoneDescription,
      price: Number(m.price),
      freeShippingThreshold: m.freeShippingThreshold ? Number(m.freeShippingThreshold) : null,
      estimatedDays: m.estimatedDays,
    }));
  }

  const data = await fetchFromBackend<any[]>("/api/shipping-methods");
  return data || [];
}

/**
 * Obtiene las cuentas bancarias activas para el checkout y confirmación.
 */
export async function getBankAccounts(): Promise<any[]> {
  if (isDirectDbMode()) {
    const { prisma } = await import("@/lib/db");
    const accounts = await prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return accounts.map((a) => ({
      id: a.id,
      bankName: a.bankName,
      accountNumber: a.accountNumber,
      accountType: a.accountType,
      holderName: a.holderName,
      holderId: a.holderId,
      instructions: a.instructions,
    }));
  }

  const data = await fetchFromBackend<any[]>("/api/bank-accounts");
  return data || [];
}

/**
 * Obtiene los detalles públicos de un pedido por su número de orden.
 */
function maskName(name: string | null | undefined): string {
  if (!name) return "Cliente";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1][0]}.`;
}

/**
 * Obtiene los detalles de un pedido por su número de orden.
 * Requiere un token válido de confirmación (o administrativo) para entregar datos privados.
 * Si el visitante no presenta token o el token no corresponde al pedido, NO entrega datos privados.
 */
export async function getOrderByNumber(orderNumber: string, token?: string): Promise<any | null> {
  const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");

  if (isDirectDbMode()) {
    const { prisma } = await import("@/lib/db");
    const order = await prisma.order.findFirst({
      where: {
        OR: [{ orderNumber: cleanNumber }, { id: cleanNumber }],
      },
      include: {
        items: true,
        shippingMethod: true,
        statusHistory: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!order) return null;

    // Si NO se proporciona token, retornar estrictamente DTO público (sin dirección, teléfono ni email)
    if (!token) {
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        maskedGuestName: maskName(order.guestName),
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        total: Number(order.total),
        carrierName: order.carrierName,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        shippedAt: order.shippedAt,
        shippingMethodName: order.shippingMethod?.name,
        estimatedDeliveryDays: order.shippingMethod?.estimatedDays,
        itemsCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
        items: order.items.map((it) => ({
          productTitle: it.productTitle,
          variantTitle: it.variantTitle,
          quantity: it.quantity,
          totalPrice: Number(it.totalPrice),
        })),
        history: order.statusHistory.map((h) => ({
          status: h.newStatus,
          timestamp: h.createdAt,
        })),
      };
    }

    // Si SE proporciona token, validar firma y vinculación estricta al pedido
    const { verifyJwt, ADMIN_ROLES } = await import("@/core/auth/jwt");
    const payload = await verifyJwt(token);
    if (!payload) {
      // Token inválido o expirado
      return null;
    }

    const isAdmin = payload.role && ADMIN_ROLES.includes(payload.role);
    const isMatchingConfirmation =
      payload.purpose === "order_confirmation" &&
      (payload.orderNumber === cleanNumber ||
        payload.orderNumber === order.orderNumber ||
        payload.sub === order.id);

    if (!isAdmin && !isMatchingConfirmation) {
      // Token de otro pedido o con propósito incorrecto
      return null;
    }

    // DTO Seguro y Especifico de Confirmacion / Admin (sin spread ciego de ...order)
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      guestName: order.guestName,
      maskedGuestName: maskName(order.guestName),
      guestPhone: order.guestPhone,
      guestWhatsapp: order.guestWhatsapp,
      guestEmail: order.guestEmail,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      discountAmount: Number(order.discountAmount),
      total: Number(order.total),
      shippingAddress: order.shippingAddress,
      shippingMethod: order.shippingMethod,
      shippingMethodName: order.shippingMethod?.name,
      estimatedDeliveryDays: order.shippingMethod?.estimatedDays,
      carrierName: order.carrierName,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      shippedAt: order.shippedAt,
      proofOfPaymentUrl: order.proofOfPaymentUrl,
      proofUploadedAt: order.proofUploadedAt,
      proofRejectionReason: order.proofRejectionReason,
      customerNotes: order.customerNotes,
      adminNotes: isAdmin ? order.adminNotes : undefined,
      itemsCount: order.items.reduce((acc, it) => acc + it.quantity, 0),
      items: order.items.map((it) => ({
        id: it.id,
        productTitle: it.productTitle,
        variantTitle: it.variantTitle,
        title: it.productTitle,
        variant: it.variantTitle,
        sku: it.sku,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        price: Number(it.unitPrice),
        totalPrice: Number(it.totalPrice),
      })),
      ...(isAdmin
        ? {
            statusHistory: order.statusHistory.map((h) => ({
              id: h.id,
              previousStatus: h.previousStatus,
              newStatus: h.newStatus,
              notes: h.notes,
              createdAt: h.createdAt,
              status: h.newStatus,
              timestamp: h.createdAt,
            })),
          }
        : {}),
      history: order.statusHistory.map((h) => ({
        status: h.newStatus,
        timestamp: h.createdAt,
        ...(isAdmin ? { notes: h.notes } : {}),
      })),
    };
  }

  // Modo desacoplado (Vercel SSR llamando al backend en Render):
  // Transmitir el token del cliente ÚNICAMENTE si existe. NUNCA emitir automáticamente
  // un JWT con rol ADMIN para peticiones anónimas sin autorización.
  const authHeaders: Record<string, string> = {};
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
    authHeaders["x-order-token"] = token;
  }

  return fetchFromBackend<any>(`/api/orders/${encodeURIComponent(cleanNumber)}`, {
    headers: authHeaders,
  });
}
