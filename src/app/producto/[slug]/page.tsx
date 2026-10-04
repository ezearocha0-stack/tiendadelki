import { notFound } from "next/navigation";
import { getProductBySlug, getProducts } from "@/lib/server-api";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { ProductDetailView } from "@/components/store/product-detail-view";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product || product.status !== "PUBLISHED") {
    return { title: "Producto no encontrado - TiendaDelki" };
  }

  const primaryImage = product.images?.[0]?.url || "/logo.png";
  const title = product.seoTitle || `${product.name} | TiendaDelki`;
  const description =
    product.seoDescription ||
    product.shortDescription ||
    product.description?.slice(0, 160) ||
    `Comprar ${product.name} al mejor precio en TiendaDelki República Dominicana.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/producto/${slug}`,
    },
    openGraph: {
      title,
      description,
      images: [{ url: primaryImage, alt: product.name }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [primaryImage],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;

  const product = await getProductBySlug(slug);

  if (!product || product.status !== "PUBLISHED") {
    notFound();
  }

  // Related products from same category
  const relatedResult = await getProducts({
    categoryId: product.categoryId,
    status: "PUBLISHED",
    limit: 5,
  });
  const rawRelated = (relatedResult.data || []).filter((p: any) => p.id !== product.id).slice(0, 4);

  const relatedProducts = rawRelated.map((p: any) => {
    let outOfStock = false;
    if (p.hasVariants) {
      outOfStock = p.variants.length > 0 && p.variants.every((v: any) => v.stock === 0);
    } else {
      outOfStock = p.stock === 0;
    }

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      basePrice: Number(p.basePrice),
      compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
      isNew: p.isNew,
      isFeatured: p.isFeatured,
      categoryName: p.category.name,
      imageUrl: p.images[0]?.url || "/logo.png",
      isOutOfStock: outOfStock,
    };
  });

  // Parse customAttributes safely
  let customAttributes: Array<{ name: string; options: string[] }> = [];
  try {
    if (Array.isArray(product.customAttributes)) {
      customAttributes = product.customAttributes as any;
    } else if (typeof product.customAttributes === "string") {
      customAttributes = JSON.parse(product.customAttributes);
    }
  } catch (e) {
    customAttributes = [];
  }

  // Format product for client view
  const formattedProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    basePrice: Number(product.basePrice),
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    sku: product.sku,
    stock: product.stock,
    hasVariants: product.hasVariants,
    customAttributes,
    category: product.category,
    brand: product.brand,
    images: product.images,
    variants: product.variants.map((v: any) => ({
      id: v.id,
      sku: v.sku,
      title: v.title,
      attributes: (v.attributes as Record<string, string>) || {},
      price: Number(v.price),
      compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : null,
      stock: v.stock,
      minStock: v.minStock,
      isActive: v.isActive,
    })),
  };

  // Structured Data (JSON-LD)
  const isAvailable = product.hasVariants
    ? product.variants.some((v: any) => v.stock > 0)
    : product.stock > 0;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://tiendadelki.com";

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || product.shortDescription || product.name,
    image: product.images.map((img: any) => img.url),
    sku: product.sku || product.id,
    brand: {
      "@type": "Brand",
      name: product.brand?.name || "TiendaDelki",
    },
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url: `${baseUrl}/producto/${product.slug}`,
      priceCurrency: "DOP",
      price: Number(product.basePrice),
      priceValidUntil: "2027-12-31",
      itemCondition: "https://schema.org/NewCondition",
      availability: isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "TiendaDelki",
      },
    },
  };

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
        name: product.category.name,
        item: `${baseUrl}/categorias/${product.category.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: product.name,
        item: `${baseUrl}/producto/${product.slug}`,
      },
    ],
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      <StoreHeader />


      <main style={{ flex: 1 }}>
        <ProductDetailView
          product={formattedProduct}
          relatedProducts={relatedProducts}
        />
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
