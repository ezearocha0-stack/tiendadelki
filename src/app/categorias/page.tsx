import Link from "next/link";
import { getCategories } from "@/lib/server-api";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Categorías de Productos",
  description: "Explora todas las categorías de TiendaDelki: ropa, calzado, accesorios, hogar y más en San Fernando de Montecristi con catálogo en tiempo real.",
  alternates: {
    canonical: "/categorias",
  },
  openGraph: {
    title: "Categorías de Productos | TiendaDelki",
    description: "Explora todas las categorías: ropa, calzado, accesorios y más.",
    url: "https://tiendadelki.com/categorias",
  },
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1.25rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Breadcrumbs */}
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Categorías</span>
        </div>

        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "900", color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>
            Directorio de Categorías
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "1rem" }}>
            Encuentra prendas y artículos organizados por departamentos y colecciones
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {categories.map((cat) => (
            <div
              key={cat.id}
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-lg)",
                padding: "1.75rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "transform 0.25s ease, border-color 0.25s ease",
              }}
              className="product-card-hover"
            >
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      style={{ width: "64px", height: "64px", borderRadius: "var(--radius-md)", objectFit: "cover" }}
                    />
                  ) : (
                    "📁"
                  )}
                </div>

                <Link href={`/tienda?category=${cat.slug}`} style={{ textDecoration: "none" }}>
                  <h2 style={{ fontSize: "1.35rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                    {cat.name}
                  </h2>
                </Link>

                {cat.description && (
                  <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginBottom: "1rem", lineHeight: 1.5 }}>
                    {cat.description}
                  </p>
                )}

                {/* Subcategorías si existen */}
                {cat.children && cat.children.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1.25rem" }}>
                    {cat.children.map((sub: any) => (
                      <Link
                        key={sub.id}
                        href={`/tienda?category=${sub.slug}`}
                        style={{
                          padding: "0.25rem 0.6rem",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "rgba(255,255,255,0.05)",
                          color: "var(--text-secondary)",
                          fontSize: "0.78rem",
                          textDecoration: "none",
                        }}
                      >
                        {sub.name} ({sub._count.products})
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "600" }}>
                  {cat._count.products} productos activos
                </span>
                <Link
                  href={`/tienda?category=${cat.slug}`}
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    color: "#60a5fa",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <span>Explorar</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>

      <WhatsAppFloatingButton />
      <StoreFooter />
    </div>
  );
}
