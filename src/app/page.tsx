import Link from "next/link";
import { getCategories, getFeaturedProducts, getNewProducts, getDealProducts } from "@/lib/server-api";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { ProductCard } from "@/components/store/product-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Consultar datos de catálogo mediante capa desacoplada (compatible con Vercel Frontend -> Render Backend)
  const [categories, featuredProducts, newProducts, dealProducts] = await Promise.all([
    getCategories(6),
    getFeaturedProducts(8),
    getNewProducts(8),
    getDealProducts(8),
  ]);

  function checkOutOfStock(p: any) {
    if (p.hasVariants) {
      return Boolean(p.variants && p.variants.length > 0 && p.variants.every((v: any) => v.stock === 0));
    }
    return p.stock === 0;
  }

  const storeSchema = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "TiendaDelki",
    "description": "Tienda física y online en Santo Domingo, República Dominicana. Catálogo moderno de moda, calzado, accesorios y artículos seleccionados con envíos a todo el país.",
    "url": "https://tiendadelki.com",
    "telephone": "+1-809-555-0100",
    "currenciesAccepted": "DOP, USD",
    "paymentAccepted": "Cash, Bank Transfer, Deposit",
    "priceRange": "$$",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Av. Principal #123, Ensanche Quisqueya",
      "addressLocality": "Santo Domingo",
      "addressRegion": "Distrito Nacional",
      "postalCode": "10101",
      "addressCountry": "DO",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "18.4861",
      "longitude": "-69.9312",
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "09:00",
        "closes": "19:00",
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-app)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeSchema).replace(/</g, "\\u003c") }}
      />

      <StoreHeader />

      <main style={{ flex: 1, backgroundColor: "var(--bg-app)" }}>
        {/* 1. HERO EDITORIAL DE E-COMMERCE PROFESIONAL */}
        <section
          style={{
            background: "radial-gradient(circle at 18% 20%, rgba(79, 70, 229, 0.08) 0%, transparent 45%), radial-gradient(circle at 82% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 42%), #ffffff",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "5rem 1.5rem",
            position: "relative",
          }}
        >
          <div
            style={{
              maxWidth: "1000px",
              margin: "0 auto",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.4rem 1.15rem",
                borderRadius: "var(--radius-full)",
                backgroundColor: "#eef2ff",
                border: "1px solid #c7d2fe",
                color: "var(--color-brand-primary)",
                fontSize: "0.8rem",
                fontWeight: "700",
                marginBottom: "1.75rem",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              <span>Tienda Física en Santo Domingo • Envíos a Todo el País</span>
            </div>

            <h1
              style={{
                fontSize: "clamp(2.1rem, 4.8vw, 3.4rem)",
                fontWeight: "800",
                letterSpacing: "-0.03em",
                lineHeight: 1.15,
                color: "var(--text-primary)",
                maxWidth: "850px",
                margin: "0 auto 1.25rem auto",
              }}
            >
              Moda, Calzado y Artículos Seleccionados para Ti
            </h1>

            <p
              style={{
                fontSize: "clamp(0.95rem, 2vw, 1.125rem)",
                color: "var(--text-secondary)",
                maxWidth: "640px",
                margin: "0 auto 2.5rem auto",
                lineHeight: 1.6,
              }}
            >
              Explora nuestro catálogo con inventario en tiempo real. Compra de forma segura con transferencia bancaria o realiza tu pedido de inmediato vía WhatsApp.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link
                href="/tienda"
                className="btn btn-primary"
                style={{
                  padding: "0.85rem 2.25rem",
                  fontSize: "1rem",
                  minHeight: "48px",
                }}
              >
                Explorar Catálogo
              </Link>

              <a
                href="https://wa.me/18095550100?text=Hola%20TiendaDelki,%20quiero%20ver%20el%20catálogo%20disponible"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
                style={{
                  padding: "0.85rem 2rem",
                  fontSize: "1rem",
                  minHeight: "48px",
                }}
              >
                <span>Pedir por WhatsApp</span>
              </a>
            </div>
          </div>
        </section>

        {/* 2. TRUST PILLARS (TARJETAS FLOTANTES SOBRE FONDO #F4F7FB) */}
        <section
          style={{
            padding: "2.5rem 1.25rem",
            backgroundColor: "var(--bg-app)",
          }}
        >
          <div
            style={{
              maxWidth: "1320px",
              margin: "0 auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}
          >
            <div className="card card-interactive" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.4rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "#eef2ff",
                  color: "var(--color-brand-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #c7d2fe",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"></rect>
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
                  <circle cx="5.5" cy="18.5" r="2.5"></circle>
                  <circle cx="18.5" cy="18.5" r="2.5"></circle>
                </svg>
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>Envíos a Todo el País</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>24h en Santo Domingo e Interior</p>
              </div>
            </div>

            <div className="card card-interactive" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.4rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #bfdbfe",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                  <line x1="2" y1="10" x2="22" y2="10"></line>
                </svg>
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>Transferencia Oficial</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>Popular, Banreservas y BHD</p>
              </div>
            </div>

            <div className="card card-interactive" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.4rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "#ecfdf5",
                  color: "#16a34a",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #a7f3d0",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                  <polyline points="9 22 9 12 15 12 15 22"></polyline>
                </svg>
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>Tienda Física Real</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>Recogida en tienda sin costo</p>
              </div>
            </div>

            <div className="card card-interactive" style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "1.25rem 1.4rem" }}>
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "10px",
                  backgroundColor: "#fdf4ff",
                  color: "#9333ea",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #f0abfc",
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <div>
                <h4 style={{ fontWeight: "700", fontSize: "0.95rem", color: "var(--text-primary)", margin: 0 }}>Stock en Tiempo Real</h4>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>Inventario disponible de inmediato</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. CATEGORÍAS PRINCIPALES */}
        {categories.length > 0 && (
          <section style={{ maxWidth: "1320px", margin: "2rem auto 0 auto", padding: "0 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  Categorías Principales
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                  Explora las diferentes líneas y colecciones disponibles
                </p>
              </div>
              <Link href="/categorias" style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--color-brand-primary)" }}>
                Ver todas ({categories.length}) →
              </Link>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "1.1rem",
              }}
            >
              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="card card-interactive"
                  style={{
                    padding: "1.5rem 1.25rem",
                    textDecoration: "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      width: "60px",
                      height: "60px",
                      borderRadius: "50%",
                      backgroundColor: "var(--bg-app)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                      marginBottom: "0.85rem",
                      overflow: "hidden",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt={cat.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--color-brand-primary)">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                    )}
                  </div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.2rem" }}>
                    {cat.name}
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {cat._count.products} productos
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 4. PRODUCTOS DESTACADOS */}
        {featuredProducts.length > 0 && (
          <section style={{ maxWidth: "1320px", margin: "3.5rem auto 0 auto", padding: "0 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  Productos Destacados
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                  Nuestra selección recomendada de temporada
                </p>
              </div>
              <Link href="/tienda?filter=featured" style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--color-brand-primary)" }}>
                Ver catálogo completo →
              </Link>
            </div>

            <div className="store-product-grid">
              {featuredProducts.map((p) => (
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
          </section>
        )}

        {/* 5. BANNER INTERMEDIO DE WHATSAPP ELEGANTE */}
        <section
          style={{
            maxWidth: "1320px",
            margin: "4rem auto 0 auto",
            padding: "0 1.25rem",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              borderRadius: "var(--radius-xl)",
              padding: "2.5rem 2.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.5rem",
              boxShadow: "var(--shadow-lg)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div style={{ maxWidth: "620px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#4ade80", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Atención Directa & Pedidos Rápidos
              </span>
              <h3 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#ffffff", margin: "0.4rem 0 0.5rem 0", letterSpacing: "-0.02em" }}>
                ¿Prefieres consultar o pedir directamente por WhatsApp?
              </h3>
              <p style={{ color: "#cbd5e1", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
                Nuestro equipo en tienda te responderá de inmediato, compartirá fotos en vivo del producto y te asistirá con tu compra.
              </p>
            </div>

            <a
              href="https://wa.me/18095550100?text=Hola%20TiendaDelki,%20quiero%20hacer%20una%20consulta%20o%20pedido"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-whatsapp"
              style={{
                padding: "0.85rem 2rem",
                fontSize: "1rem",
                minHeight: "48px",
              }}
            >
              <span>Hablar por WhatsApp</span>
            </a>
          </div>
        </section>

        {/* 6. NOVEDADES RECIENTES */}
        {newProducts.length > 0 && (
          <section style={{ maxWidth: "1320px", margin: "3.5rem auto 0 auto", padding: "0 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  Nuevas Colecciones
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                  Artículos recién ingresados a nuestro catálogo
                </p>
              </div>
              <Link href="/tienda?filter=new" style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--color-brand-primary)" }}>
                Ver novedades →
              </Link>
            </div>

            <div className="store-product-grid">
              {newProducts.map((p) => (
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
          </section>
        )}

        {/* 7. OFERTAS Y REBAJAS */}
        {dealProducts.length > 0 && (
          <section style={{ maxWidth: "1320px", margin: "3.5rem auto 4rem auto", padding: "0 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}>
                  Rebajas y Ofertas Especiales
                </h2>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: "0.25rem 0 0" }}>
                  Precios con descuento en artículos seleccionados
                </p>
              </div>
              <Link href="/tienda?filter=offers" style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--color-brand-danger)" }}>
                Ver todas las ofertas →
              </Link>
            </div>

            <div className="store-product-grid">
              {dealProducts.map((p) => (
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
          </section>
        )}
      </main>

      <WhatsAppFloatingButton />
      <StoreFooter />
    </div>
  );
}
