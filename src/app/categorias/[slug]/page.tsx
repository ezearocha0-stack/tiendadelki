import { notFound } from "next/navigation";
import { getCategoryBySlug } from "@/lib/server-api";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { ProductCard } from "@/components/store/product-card";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface CategoryDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) return { title: "Categoría no encontrada" };

  return {
    title: `${category.name} - TiendaDelki`,
    description: category.description || `Catálogo y ofertas de ${category.name} en TiendaDelki República Dominicana.`,
    alternates: {
      canonical: `/categorias/${slug}`,
    },
    openGraph: {
      title: `${category.name} - TiendaDelki`,
      description: category.description || `Explora productos de ${category.name} con entrega inmediata.`,
    },
  };
}

export default async function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { slug } = await params;

  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  function checkOutOfStock(p: any) {
    if (p.hasVariants) {
      return Boolean(p.variants && p.variants.length > 0 && p.variants.every((v: any) => v.stock === 0));
    }
    return p.stock === 0;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tiendadelki.com";
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: `${baseUrl}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Categorías",
        item: `${baseUrl}/categorias`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: category.name,
        item: `${baseUrl}/categorias/${category.slug}`,
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />

      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1.25rem", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          <Link href="/" style={{ color: "var(--text-muted)" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <Link href="/categorias" style={{ color: "var(--text-muted)" }}>Categorías</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "#60a5fa", fontWeight: "700" }}>{category.name}</span>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: "900", color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>
            {category.name}
          </h1>
          {category.description && (
            <p style={{ color: "var(--text-secondary)", fontSize: "1rem", maxWidth: "700px" }}>
              {category.description}
            </p>
          )}
        </div>

        {category.products.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 1.5rem",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📦</div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)" }}>
              Aún no hay productos publicados en esta categoría
            </h2>
            <Link
              href="/tienda"
              style={{
                display: "inline-block",
                marginTop: "1rem",
                padding: "0.6rem 1.25rem",
                backgroundColor: "var(--color-brand-accent)",
                color: "#ffffff",
                borderRadius: "var(--radius-full)",
                fontSize: "0.88rem",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Ver otros productos
            </Link>
          </div>
        ) : (
          <div className="store-product-grid">
            {category.products.map((p: any) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                basePrice={Number(p.basePrice)}
                compareAtPrice={p.compareAtPrice ? Number(p.compareAtPrice) : null}
                categoryName={category.name}
                thumbnailUrl={p.images?.[0]?.thumbnailUrl || p.images?.[0]?.url}
                hasVariants={p.hasVariants}
                isNew={p.isNew}
                isFeatured={p.isFeatured}
                isOutOfStock={checkOutOfStock(p)}
              />
            ))}
          </div>
        )}
      </main>

      <WhatsAppFloatingButton />
      <StoreFooter />
    </div>
  );
}
