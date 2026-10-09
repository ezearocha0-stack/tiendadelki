import Link from "next/link";
import { getCategories, getProducts } from "@/lib/server-api";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { ProductCard } from "@/components/store/product-card";
import { EmptyState } from "@/components/ui/empty-state";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ofertas y Descuentos Exclusivos",
  description: "Aprovecha descuentos de temporada en ropa, accesorios y calzado en TiendaDelki República Dominicana. Precios rebajados y stock limitado.",
  alternates: {
    canonical: "/ofertas",
  },
  openGraph: {
    title: "Ofertas y Descuentos Exclusivos | TiendaDelki",
    description: "Descuentos de temporada y artículos seleccionados en San Fernando de Montecristi.",
    url: "https://tiendadelki.com/ofertas",
  },
};

export const dynamic = "force-dynamic";

interface OfertasPageProps {
  searchParams: Promise<{
    category?: string;
    sort?: string;
  }>;
}

export default async function OfertasPage({ searchParams }: OfertasPageProps) {
  const params = await searchParams;
  const categorySlug = params.category || "";
  const sort = params.sort || "discount_desc";

  // Consultar categorías y productos en oferta mediante capa desacoplada
  const [categories, productsResult] = await Promise.all([
    getCategories(),
    getProducts({
      deals: true,
      categorySlug,
      sort,
      limit: 60,
    }),
  ]);

  const rawProducts = productsResult.data;

  // Filtrar en memoria para asegurar que compareAtPrice sea estrictamente mayor a basePrice
  let dealProducts = rawProducts.filter((p) => {
    if (!p.compareAtPrice) return false;
    return Number(p.compareAtPrice) > Number(p.basePrice);
  });

  // Si el orden es por mayor descuento, ordenar por porcentaje
  if (sort === "discount_desc") {
    dealProducts.sort((a, b) => {
      const discA = Math.round(((Number(a.compareAtPrice) - Number(a.basePrice)) / Number(a.compareAtPrice)) * 100);
      const discB = Math.round(((Number(b.compareAtPrice) - Number(b.basePrice)) / Number(b.compareAtPrice)) * 100);
      return discB - discA;
    });
  }

  function checkOutOfStock(p: (typeof rawProducts)[0]) {
    if (p.hasVariants) {
      return p.variants.length > 0 && p.variants.every((v: any) => v.stock === 0);
    }
    return p.stock === 0;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.25rem)", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Banner de Ofertas */}
        <div
          style={{
            background: "linear-gradient(135deg, #451a03 0%, #78350f 50%, #9a3412 100%)",
            border: "1px solid #d97706",
            borderRadius: "var(--radius-lg)",
            padding: "clamp(1.5rem, 5vw, 3rem) clamp(1rem, 4vw, 2rem)",
            marginBottom: "2.5rem",
            textAlign: "center",
            boxShadow: "0 10px 30px rgba(217, 119, 6, 0.25)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", backgroundColor: "rgba(0,0,0,0.3)", padding: "0.35rem 0.85rem", borderRadius: "var(--radius-full)", color: "#fde68a", fontSize: "0.85rem", fontWeight: "800", textTransform: "uppercase", marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
            🔥 Descuentos Exclusivos TiendaDelki
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: "900", color: "#ffffff", marginBottom: "0.75rem", lineHeight: 1.15 }}>
            Grandes Ofertas & Liquidaciones
          </h1>
          <p style={{ color: "#fef3c7", fontSize: "1.05rem", maxWidth: "650px", margin: "0 auto", lineHeight: 1.6 }}>
            Aprovecha precios especiales en artículos seleccionados de moda y calzado. Inventario limitado con entrega inmediata.
          </p>
        </div>

        {/* Barra de Filtros y Ordenamiento */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
          {/* Categorías con Ofertas */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Link
              href="/ofertas"
              style={{
                padding: "0.45rem 1rem",
                borderRadius: "var(--radius-full)",
                border: !categorySlug ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                backgroundColor: !categorySlug ? "rgba(245, 158, 11, 0.15)" : "var(--bg-surface)",
                color: !categorySlug ? "#f59e0b" : "var(--text-secondary)",
                fontSize: "0.85rem",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Todas ({dealProducts.length})
            </Link>

            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/ofertas?category=${cat.slug}&sort=${sort}`}
                style={{
                  padding: "0.45rem 1rem",
                  borderRadius: "var(--radius-full)",
                  border: categorySlug === cat.slug ? "1px solid #f59e0b" : "1px solid var(--border-subtle)",
                  backgroundColor: categorySlug === cat.slug ? "rgba(245, 158, 11, 0.15)" : "var(--bg-surface)",
                  color: categorySlug === cat.slug ? "#f59e0b" : "var(--text-secondary)",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                {cat.name}
              </Link>
            ))}
          </div>

          {/* Selector de orden */}
          <form method="GET" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
            <label htmlFor="sort-ofertas" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Ordenar por:
            </label>
            <select
              id="sort-ofertas"
              name="sort"
              defaultValue={sort}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                fontWeight: "600",
              }}
            >
              <option value="discount_desc">Mayor Descuento (%)</option>
              <option value="price_asc">Precio: Menor a Mayor</option>
              <option value="price_desc">Precio: Mayor a Menor</option>
            </select>
            <button
              type="submit"
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                color: "#f59e0b",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                fontSize: "0.85rem",
                fontWeight: "700",
              }}
            >
              Aplicar
            </button>
          </form>
        </div>

        {/* Lista de Productos en Oferta */}
        {dealProducts.length === 0 ? (
          <EmptyState
            icon="🔥"
            title="No hay ofertas en esta categoría actualmente"
            description="Todos nuestros productos de esta sección se encuentran a precio regular o se han agotado. Revisa las demás colecciones."
            actionLabel="Ver Todo el Catálogo"
            actionHref="/tienda"
            secondaryLabel="Ver Todos los Favoritos"
            secondaryHref="/favoritos"
          />
        ) : (
          <div className="store-product-grid">
            {dealProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                basePrice={Number(p.basePrice)}
                compareAtPrice={Number(p.compareAtPrice)}
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
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
