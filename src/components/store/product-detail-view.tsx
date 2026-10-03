"use client";

import { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { useCart } from "./cart-context";
import { useFavorites } from "./favorites-context";
import { ProductCard } from "./product-card";
import { useWhatsApp } from "@/hooks/use-whatsapp";

interface Variant {
  id: string;
  sku: string;
  title: string;
  attributes: Record<string, string>;
  price: number | string;
  compareAtPrice: number | string | null;
  stock: number;
  minStock: number;
  isActive: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    shortDescription: string | null;
    basePrice: number | string;
    compareAtPrice: number | string | null;
    sku: string | null;
    stock: number;
    hasVariants: boolean;
    customAttributes: Array<{ name: string; options: string[] }>;
    category: Category;
    brand?: { name: string; slug: string } | null;
    images: ProductImage[];
    variants: Variant[];
  };
  relatedProducts: Array<any>;
}

export function ProductDetailView({ product, relatedProducts }: ProductDetailProps) {
  const { addItem } = useCart();
  const { openProductWhatsApp } = useWhatsApp();

  // Imagen activa en la galería
  const primaryImage = product.images.find((img) => img.isPrimary) || product.images[0];
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>(primaryImage?.url || "");
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  // Estado de Favorito
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(product.id);
  const [favoriteAnimating, setFavoriteAnimating] = useState(false);

  async function handleToggleFavorite() {
    setFavoriteAnimating(true);
    await toggleFavorite({ id: product.id, name: product.name });
    setTimeout(() => setFavoriteAnimating(false), 400);
  }

  // Manejo de variantes
  // Inicializar atributos seleccionados con la primera variante con stock disponible (o la primera activa)
  const initialVariant = product.hasVariants
    ? product.variants.find((v) => v.stock > 0) || product.variants[0]
    : null;

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(
    (initialVariant?.attributes as Record<string, string>) || {}
  );

  // Variante actualmente seleccionada según los atributos
  const currentVariant = product.hasVariants
    ? product.variants.find((v) => {
        const vAttrs = v.attributes as Record<string, string>;
        return Object.keys(selectedAttributes).every((key) => vAttrs[key] === selectedAttributes[key]);
      })
    : null;

  // Stock y precios dinámicos
  const currentStock = product.hasVariants
    ? currentVariant
      ? currentVariant.stock
      : 0
    : product.stock;

  const isOutOfStock = currentStock <= 0;

  const currentPrice = currentVariant
    ? Number(currentVariant.price)
    : Number(product.basePrice);

  const oldPrice = currentVariant?.compareAtPrice
    ? Number(currentVariant.compareAtPrice)
    : product.compareAtPrice
    ? Number(product.compareAtPrice)
    : null;

  const hasDiscount = oldPrice !== null && oldPrice > currentPrice;
  const discountAmount = hasDiscount && oldPrice ? oldPrice - currentPrice : 0;
  const discountPercent = hasDiscount && oldPrice ? Math.round((discountAmount / oldPrice) * 100) : 0;

  const activeSku = currentVariant ? currentVariant.sku : product.sku;

  // Cantidad seleccionada
  const [quantity, setQuantity] = useState(1);

  function handleAttributeSelect(attrName: string, optionValue: string) {
    const updated = { ...selectedAttributes, [attrName]: optionValue };
    setSelectedAttributes(updated);
    setQuantity(1);
  }

  // Zoom de imagen
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  }

  // Agregar al carrito
  function handleAddToCart() {
    if (isOutOfStock) return;

    addItem(
      {
        productId: product.id,
        variantId: currentVariant ? currentVariant.id : null,
        productTitle: product.name,
        variantTitle: currentVariant ? currentVariant.title : null,
        sku: activeSku,
        price: currentPrice,
        compareAtPrice: oldPrice,
        maxStock: currentStock,
        thumbnailUrl: primaryImage?.thumbnailUrl || primaryImage?.url,
        slug: product.slug,
      },
      quantity
    );
  }

  // Mensaje para comprar por WhatsApp
  const productUrl = typeof window !== "undefined" ? window.location.href : `https://tiendadelki.com/producto/${product.slug}`;
  const whatsappMessage = encodeURIComponent(
    `¡Hola TiendaDelki! Quiero comprar este artículo:\n\n` +
      `📦 *Producto:* ${product.name}\n` +
      (currentVariant ? `🔀 *Variante:* ${currentVariant.title}\n` : "") +
      `🏷️ *SKU:* ${activeSku || "N/A"}\n` +
      `💰 *Precio:* ${formatCurrency(currentPrice)}\n` +
      `🔢 *Cantidad:* ${quantity}\n` +
      `🔗 *Enlace:* ${productUrl}\n\n` +
      `¿Tienen disponibilidad para coordinar el envío o recogida en tienda?`
  );

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "1.5rem 1.25rem 4rem 1.25rem" }}>
      {/* Breadcrumbs */}
      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
        <Link href="/" style={{ color: "var(--text-muted)" }}>Inicio</Link>
        <span style={{ margin: "0 0.5rem" }}>/</span>
        <Link href="/tienda" style={{ color: "var(--text-muted)" }}>Tienda</Link>
        <span style={{ margin: "0 0.5rem" }}>/</span>
        <Link href={`/categorias/${product.category.slug}`} style={{ color: "var(--text-muted)" }}>
          {product.category.name}
        </Link>
        <span style={{ margin: "0 0.5rem" }}>/</span>
        <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>{product.name}</span>
      </div>

      {/* Grid Principal: Galería (Izq) + Detalles de Compra (Der) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "3rem",
          alignItems: "start",
          marginBottom: "4rem",
        }}
      >
        {/* ================================================================= */}
        {/* GALERÍA DE FOTOS CON ZOOM */}
        {/* ================================================================= */}
        <div>
          {/* Visor Principal */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              backgroundColor: "var(--bg-surface)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              border: "1px solid var(--border-subtle)",
              cursor: isZoomed ? "zoom-out" : "zoom-in",
            }}
            onMouseEnter={() => setIsZoomed(true)}
            onMouseLeave={() => setIsZoomed(false)}
            onMouseMove={handleMouseMove}
          >
            {selectedImageUrl ? (
              <img
                src={selectedImageUrl}
                alt={`${product.name} - Detalle del producto en TiendaDelki`}
                width={800}
                height={800}
                loading="eager"
                decoding="sync"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                  transform: isZoomed ? "scale(1.8)" : "scale(1)",
                  transition: isZoomed ? "none" : "transform 0.25s ease",
                }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "4rem" }}>
                🛍️
              </div>
            )}

            {/* Badges Flotantes */}
            <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", flexDirection: "column", gap: "6px", pointerEvents: "none", zIndex: 2 }}>
              {isOutOfStock ? (
                <span style={{ padding: "0.25rem 0.6rem", borderRadius: "var(--radius-xs)", backgroundColor: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", fontWeight: "700", fontSize: "0.75rem", textTransform: "uppercase" }}>
                  Agotado
                </span>
              ) : hasDiscount ? (
                <span style={{ padding: "0.25rem 0.6rem", borderRadius: "var(--radius-xs)", backgroundColor: "#dc2626", color: "#ffffff", fontWeight: "700", fontSize: "0.75rem" }}>
                  -{discountPercent}% OFF
                </span>
              ) : null}
            </div>

            {/* Indicador de Zoom */}
            <div
              style={{
                position: "absolute",
                bottom: "12px",
                right: "12px",
                padding: "0.25rem 0.6rem",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                color: "#ffffff",
                fontSize: "0.75rem",
                pointerEvents: "none",
              }}
            >
              Zoom disponible
            </div>
          </div>

          {/* Miniaturas */}
          {product.images.length > 1 && (
            <div style={{ display: "flex", gap: "0.65rem", marginTop: "1rem", overflowX: "auto", paddingBottom: "0.5rem" }} className="scrollbar-none">
              {product.images.map((img) => {
                const isSelected = selectedImageUrl === img.url;
                return (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageUrl(img.url)}
                    style={{
                      width: "68px",
                      height: "68px",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      border: isSelected ? "2px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
                      backgroundColor: "#ffffff",
                      padding: 0,
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "border-color 0.15s ease",
                    }}
                  >
                    <img
                      src={img.thumbnailUrl || img.url}
                      alt={img.altText || `${product.name} - miniatura`}
                      width={68}
                      height={68}
                      loading="lazy"
                      decoding="async"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* INFORMACIÓN Y ACCIONES COMERCIALES */}
        {/* ================================================================= */}
        <div>
          {/* Marca / Categoría */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--color-brand-accent)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {product.category.name}
            </span>
            {product.brand && (
              <>
                <span style={{ color: "var(--border-subtle)" }}>•</span>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: "600" }}>{product.brand.name}</span>
              </>
            )}
          </div>

          {/* Título Principal */}
          <h1 style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)", fontWeight: "900", color: "var(--text-primary)", lineHeight: 1.25, marginBottom: "0.75rem" }}>
            {product.name}
          </h1>

          {/* SKU */}
          {activeSku && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontFamily: "monospace", marginBottom: "1.25rem" }}>
              SKU: {activeSku}
            </div>
          )}

          {/* Precios y Ahorro */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.85rem",
              marginBottom: "1.5rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: "1.85rem", fontWeight: "800", color: hasDiscount ? "var(--color-brand-danger)" : "var(--text-primary)" }}>
              {formatCurrency(currentPrice)}
            </span>

            {hasDiscount && oldPrice && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.05rem", color: "var(--text-muted)", textDecoration: "line-through" }}>
                  {formatCurrency(oldPrice)}
                </span>
                <span style={{ padding: "0.2rem 0.55rem", borderRadius: "var(--radius-xs)", backgroundColor: "#fef2f2", color: "var(--color-brand-danger)", fontSize: "0.8rem", fontWeight: "700", border: "1px solid #fecaca" }}>
                  Ahorras {formatCurrency(discountAmount)} ({discountPercent}%)
                </span>
              </div>
            )}
          </div>

          {/* Descripción Corta */}
          {product.shortDescription && (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              {product.shortDescription}
            </p>
          )}

          {/* =============================================================== */}
          {/* SELECTOR DE VARIANTES MULTIDIMENSIONAL */}
          {/* =============================================================== */}
          {product.hasVariants && product.customAttributes.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", marginBottom: "1.75rem" }}>
              {product.customAttributes.map((attr) => (
                <div key={attr.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>
                      {attr.name}: <span style={{ color: "var(--text-primary)" }}>{selectedAttributes[attr.name]}</span>
                    </span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {attr.options.map((option) => {
                      const isSelected = selectedAttributes[attr.name] === option;

                      // Comprobar si existe alguna variante con esta opción y cuánto stock tiene
                      const testAttributes = { ...selectedAttributes, [attr.name]: option };
                      const matchedVariant = product.variants.find((v) => {
                        const vAttrs = v.attributes as Record<string, string>;
                        return Object.keys(testAttributes).every((k) => vAttrs[k] === testAttributes[k]);
                      });

                      // REGLA CRÍTICA: Nunca mostrar como disponible una variante cuyo stock real sea 0
                      const isOptionOutOfStock = matchedVariant ? matchedVariant.stock === 0 : false;

                      return (
                        <button
                          key={option}
                          onClick={() => handleAttributeSelect(attr.name, option)}
                          disabled={isOptionOutOfStock}
                          style={{
                            padding: "0.55rem 1rem",
                            borderRadius: "var(--radius-md)",
                            border: isSelected
                              ? "2px solid #0f172a"
                              : isOptionOutOfStock
                              ? "1px dashed var(--border-subtle)"
                              : "1px solid var(--border-strong)",
                            backgroundColor: isSelected
                              ? "#0f172a"
                              : isOptionOutOfStock
                              ? "#f8fafc"
                              : "#ffffff",
                            color: isSelected
                              ? "#ffffff"
                              : isOptionOutOfStock
                              ? "var(--text-muted)"
                              : "var(--text-primary)",
                            fontSize: "0.875rem",
                            fontWeight: isSelected ? "700" : "500",
                            cursor: isOptionOutOfStock ? "not-allowed" : "pointer",
                            position: "relative",
                            textDecoration: isOptionOutOfStock ? "line-through" : "none",
                            opacity: isOptionOutOfStock ? 0.5 : 1,
                            transition: "all 0.15s ease",
                          }}
                          title={isOptionOutOfStock ? "Agotado" : undefined}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* DISPONIBILIDAD EN TIEMPO REAL */}
          <div style={{ marginBottom: "1.5rem" }}>
            {isOutOfStock ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(239, 68, 68, 0.12)",
                  color: "#f87171",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                }}
              >
                <span>🛑</span>
                <span>Agotado temporalmente en tienda física y almacén</span>
              </div>
            ) : (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                }}
              >
                <span>✓</span>
                <span>
                  {currentStock <= 3
                    ? `¡Últimas ${currentStock} unidades disponibles en tienda!`
                    : `Disponible en tienda física (${currentStock} existencias)`}
                </span>
              </div>
            )}
          </div>

          {/* =============================================================== */}
          {/* SELECTOR DE CANTIDAD Y BOTONES DE COMPRA */}
          {/* =============================================================== */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-secondary)" }}>Cantidad:</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <button
                  type="button"
                  disabled={isOutOfStock || quantity <= 1}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  style={{
                    width: "40px",
                    height: "38px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-strong)",
                    backgroundColor: "#ffffff",
                    color: "var(--text-primary)",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    cursor: quantity <= 1 ? "not-allowed" : "pointer",
                  }}
                >
                  -
                </button>

                <div
                  style={{
                    width: "48px",
                    height: "38px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#ffffff",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    fontWeight: "700",
                    fontSize: "0.95rem",
                    color: "var(--text-primary)",
                  }}
                >
                  {quantity}
                </div>

                <button
                  type="button"
                  disabled={isOutOfStock || quantity >= currentStock}
                  onClick={() => setQuantity(Math.min(currentStock, quantity + 1))}
                  style={{
                    width: "38px",
                    height: "38px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-strong)",
                    backgroundColor: "#ffffff",
                    color: "var(--text-primary)",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    cursor: quantity >= currentStock ? "not-allowed" : "pointer",
                  }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Botón 1: Agregar al Carrito & Botón Favoritos */}
            <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
              <button
                type="button"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                style={{
                  flex: 1,
                  padding: "0.85rem 1.25rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: isOutOfStock ? "#f1f5f9" : "var(--color-brand-primary)",
                  color: isOutOfStock ? "var(--text-muted)" : "#ffffff",
                  fontWeight: "600",
                  fontSize: "0.95rem",
                  cursor: isOutOfStock ? "not-allowed" : "pointer",
                  boxShadow: "var(--shadow-xs)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  minHeight: "46px",
                  transition: "background-color 0.15s ease",
                }}
                onMouseOver={(e) => {
                  if (!isOutOfStock) e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)";
                }}
                onMouseOut={(e) => {
                  if (!isOutOfStock) e.currentTarget.style.backgroundColor = "var(--color-brand-primary)";
                }}
              >
                <span>{isOutOfStock ? "Producto Agotado" : `Agregar al Carrito • ${formatCurrency(currentPrice * quantity)}`}</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFavorite}
                className={favoriteAnimating ? "heart-pop" : ""}
                title={favorited ? "Quitar de mis favoritos" : "Guardar en favoritos"}
                style={{
                  padding: "0 1.25rem",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: favorited ? "#fef2f2" : "#ffffff",
                  color: favorited ? "var(--color-brand-danger)" : "var(--text-secondary)",
                  border: `1px solid ${favorited ? "#fca5a5" : "var(--border-strong)"}`,
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                  minHeight: "46px",
                }}
              >
                {favorited ? "❤️" : "🤍"}
              </button>
            </div>

            {/* Botón 2: Consultar por WhatsApp */}
            <button
              type="button"
              onClick={() => {
                openProductWhatsApp({
                  name: product.name,
                  variantTitle: currentVariant?.title || null,
                  sku: currentVariant?.sku || product.sku || null,
                  price: currentPrice,
                  productUrl: typeof window !== "undefined" ? window.location.href : undefined,
                });
              }}
              style={{
                width: "100%",
                padding: "0.85rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-brand-whatsapp)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.925rem",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                boxShadow: "var(--shadow-xs)",
                minHeight: "44px",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-whatsapp-hover)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-whatsapp)")}
            >
              <span>Consultar por WhatsApp</span>
            </button>
          </div>

          {/* Puntos de confianza del producto */}
          <div style={{ backgroundColor: "#ffffff", padding: "1.25rem", borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xs)" }}>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.55rem", fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              <li><strong>Entrega Rápida:</strong> Envíos en 24h en Santo Domingo y a todo el país.</li>
              <li><strong>Pago Oficial:</strong> Transferencia o depósito (Popular, Banreservas, BHD).</li>
              <li><strong>Tienda Física:</strong> Recogida disponible en local en Santo Domingo.</li>
              <li><strong>Garantía:</strong> Cambios permitidos dentro de 48 horas en perfecto estado.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* DESCRIPCIÓN DETALLADA Y ESPECIFICACIONES */}
      {/* ================================================================= */}
      {product.description && (
        <section
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-subtle)",
            boxShadow: "var(--shadow-xs)",
            padding: "2rem",
            marginBottom: "4rem",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.85rem" }}>
            Descripción del Producto
          </h2>
          <div
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.925rem",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {product.description}
          </div>
        </section>
      )}

      {/* ================================================================= */}
      {/* PRODUCTOS RELACIONADOS */}
      {/* ================================================================= */}
      {relatedProducts && relatedProducts.length > 0 && (
        <section>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-primary)", marginBottom: "1.5rem" }}>
            También te podría interesar
          </h2>
          <div className="store-product-grid">
            {relatedProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                basePrice={Number(p.basePrice)}
                compareAtPrice={p.compareAtPrice ? Number(p.compareAtPrice) : null}
                categoryName={p.category?.name || p.categoryName}
                thumbnailUrl={p.thumbnailUrl || p.imageUrl || p.images?.[0]?.thumbnailUrl || p.images?.[0]?.url}
                hasVariants={p.hasVariants}
                isNew={p.isNew}
                isFeatured={p.isFeatured}
                isOutOfStock={p.isOutOfStock ?? (p.hasVariants ? p.variants?.every((v: any) => v.stock === 0) : p.stock === 0)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
