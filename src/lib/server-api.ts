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
export async function getOrderByNumber(orderNumber: string): Promise<any | null> {
  if (isDirectDbMode()) {
    const { prisma } = await import("@/lib/db");
    const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");
    return prisma.order.findFirst({
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
  }

  return fetchFromBackend<any>(`/api/orders/${encodeURIComponent(orderNumber)}`);
}
