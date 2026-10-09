import Link from "next/link";
import { getProducts, getCategories, getCategoryBySlug, getPublicStoreSettings } from "@/lib/server-api";
import { formatWhatsAppPhone } from "@/core/whatsapp/whatsapp-helper";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { ProductCard } from "@/components/store/product-card";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Catálogo de Productos",
  description: "Explora la colección completa de ropa, accesorios y artículos seleccionados en TiendaDelki República Dominicana. Filtra por categoría, precio y disponibilidad.",
  alternates: {
    canonical: "/tienda",
  },
  openGraph: {
    title: "Catálogo de Productos | TiendaDelki",
    description: "Colección completa de ropa y accesorios en San Fernando de Montecristi con catálogo en tiempo real.",
    url: "https://tiendadelki.com/tienda",
  },
};

export const dynamic = "force-dynamic";

interface TiendaPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    sort?: string;
    filter?: string;
    minPrice?: string;
    maxPrice?: string;
    inStock?: string;
  }>;
}

export default async function TiendaPage({ searchParams }: TiendaPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const categorySlug = params.category || "";
  const sort = params.sort || "newest";
  const specialFilter = params.filter || "";
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const onlyInStock = params.inStock === "true";

  // Consultar categorías y productos mediante capa desacoplada (Frontend Vercel -> Backend Render)
  const [categories, productsResult, selectedCategoryData, settings] = await Promise.all([
    getCategories(),
    getProducts({
      search,
      categorySlug,
      sort,
      isFeatured: specialFilter === "featured" ? true : undefined,
      isNew: specialFilter === "new" ? true : undefined,
      deals: specialFilter === "offers" ? true : undefined,
      minPrice,
      maxPrice,
      inStock: onlyInStock,
      limit: 60,
    }),
    categorySlug ? getCategoryBySlug(categorySlug) : Promise.resolve(null),
    getPublicStoreSettings(),
  ]);

  const products = productsResult.data;

  // Filtrado de stock si se requirió únicamente en stock
  let filteredProducts = products;
  if (onlyInStock) {
    filteredProducts = products.filter((p: any) => {
      if (p.hasVariants) {
        return p.variants.some((v: any) => v.stock > 0);
      }
      return p.stock > 0;
    });
  }

  function checkOutOfStock(p: any) {
    if (p.hasVariants) {
      return p.variants.length > 0 && p.variants.every((v: any) => v.stock === 0);
    }
    return p.stock === 0;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.25rem)", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Encabezado y Breadcrumbs */}
        <div style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Link href="/" style={{ color: "var(--text-muted)" }}>Inicio</Link>
            <span style={{ margin: "0 0.5rem" }}>/</span>
            <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Tienda</span>
            {selectedCategoryData && (
              <>
                <span style={{ margin: "0 0.5rem" }}>/</span>
                <span style={{ color: "#60a5fa", fontWeight: "700" }}>{selectedCategoryData.name}</span>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "clamp(1.35rem, 4vw, 1.75rem)", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>
                {selectedCategoryData ? selectedCategoryData.name : "Catálogo de Productos"}
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
                {filteredProducts.length} artículo(s) disponibles con entrega inmediata
              </p>
            </div>

            {/* Selector de Ordenación */}
            <form method="GET" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              {search && <input type="hidden" name="search" value={search} />}
              {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
              {specialFilter && <input type="hidden" name="filter" value={specialFilter} />}
              <label htmlFor="sort-select" style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: "500" }}>Ordenar por:</label>
              <select
                id="sort-select"
                name="sort"
                defaultValue={sort}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "#ffffff",
                  color: "var(--text-primary)",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                }}
              >
                <option value="newest">Más recientes</option>
                <option value="price_asc">Precio: Menor a Mayor</option>
                <option value="price_desc">Precio: Mayor a Menor</option>
                <option value="featured">Destacados</option>
              </select>
              <button
                type="submit"
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--color-brand-primary)",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Aplicar
              </button>
            </form>
          </div>
        </div>

        {/* Layout: Sidebar de Filtros + Grid de Productos */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem" }} className="store-catalog-layout">
          {/* Barra Horizontal de Categorías Rápidas */}
          <div
            className="scrollbar-none"
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              marginBottom: "0.5rem",
            }}
          >
            <Link
              href={`/tienda?${new URLSearchParams({ ...(search && { search }), ...(sort && { sort }) }).toString()}`}
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius-full)",
                border: !categorySlug && !specialFilter ? "1px solid #0f172a" : "1px solid var(--border-subtle)",
                backgroundColor: !categorySlug && !specialFilter ? "#0f172a" : "#ffffff",
                color: !categorySlug && !specialFilter ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.825rem",
                fontWeight: !categorySlug && !specialFilter ? "700" : "500",
                whiteSpace: "nowrap",
                textDecoration: "none",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              Todos ({products.length})
            </Link>

            <Link
              href="/tienda?filter=offers"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius-full)",
                border: specialFilter === "offers" ? "1px solid var(--color-brand-danger)" : "1px solid var(--border-subtle)",
                backgroundColor: specialFilter === "offers" ? "#fef2f2" : "#ffffff",
                color: specialFilter === "offers" ? "var(--color-brand-danger)" : "var(--text-secondary)",
                fontSize: "0.825rem",
                fontWeight: specialFilter === "offers" ? "700" : "500",
                whiteSpace: "nowrap",
                textDecoration: "none",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              Ofertas
            </Link>

            <Link
              href="/tienda?filter=new"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius-full)",
                border: specialFilter === "new" ? "1px solid #0f172a" : "1px solid var(--border-subtle)",
                backgroundColor: specialFilter === "new" ? "#0f172a" : "#ffffff",
                color: specialFilter === "new" ? "#ffffff" : "var(--text-secondary)",
                fontSize: "0.825rem",
                fontWeight: specialFilter === "new" ? "700" : "500",
                whiteSpace: "nowrap",
                textDecoration: "none",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              Novedades
            </Link>

            {categories.map((cat) => {
              const isSelected = categorySlug === cat.slug;
              return (
                <Link
                  key={cat.id}
                  href={`/tienda?category=${cat.slug}${sort ? `&sort=${sort}` : ""}`}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "var(--radius-full)",
                    border: isSelected ? "1px solid #0f172a" : "1px solid var(--border-subtle)",
                    backgroundColor: isSelected ? "#0f172a" : "#ffffff",
                    color: isSelected ? "#ffffff" : "var(--text-secondary)",
                    fontSize: "0.825rem",
                    fontWeight: isSelected ? "700" : "500",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  {cat.name} ({cat._count.products})
                </Link>
              );
            })}
          </div>

          {/* Grilla de Resultados */}
          {filteredProducts.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem 1.5rem",
                backgroundColor: "#ffffff",
                borderRadius: "var(--radius-lg)",
                border: "1px solid var(--border-subtle)",
                boxShadow: "var(--shadow-xs)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.85rem", color: "var(--text-muted)" }}>🔍</div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.4rem" }}>
                No encontramos productos con estos criterios
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", maxWidth: "420px", margin: "0 auto 1.5rem auto", lineHeight: 1.5 }}>
                Intenta con otros términos de búsqueda, eliminando los filtros seleccionados o consulta directamente con nuestro equipo por WhatsApp.
              </p>
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link
                  href="/tienda"
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--color-brand-primary)",
                    color: "#ffffff",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  Ver Todo el Catálogo
                </Link>
                {settings?.whatsapp && (
                  <a
                    href={`https://wa.me/${formatWhatsAppPhone(settings.whatsapp)}?text=${encodeURIComponent("Hola, busco un producto específico en TiendaDelki")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "0.6rem 1.25rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--color-brand-whatsapp)",
                      color: "#ffffff",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      textDecoration: "none",
                    }}
                  >
                    Preguntar por WhatsApp
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="store-product-grid">
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  name={p.name}
                  slug={p.slug}
                  basePrice={Number(p.basePrice)}
                  compareAtPrice={p.compareAtPrice ? Number(p.compareAtPrice) : null}
                  categoryName={p.category.name}
                  thumbnailUrl={p.images[0]?.thumbnailUrl || p.images[0]?.url}
                  hasVariants={p.hasVariants}
                  isNew={p.isNew}
                  isFeatured={p.isFeatured}
                  isOutOfStock={checkOutOfStock(p)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <WhatsAppFloatingButton />
      <StoreFooter />
    </div>
  );
}
