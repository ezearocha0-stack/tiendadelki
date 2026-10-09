"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { useFavorites } from "@/components/store/favorites-context";

export interface ProductCardProps {
  id: string;
  name: string;
  slug: string;
  basePrice: number | string;
  compareAtPrice?: number | string | null;
  categoryName?: string;
  thumbnailUrl?: string | null;
  hasVariants?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isOutOfStock?: boolean;
}

export function ProductCard({
  id,
  name,
  slug,
  basePrice,
  compareAtPrice,
  categoryName,
  thumbnailUrl,
  hasVariants,
  isNew,
  isFeatured,
  isOutOfStock,
}: ProductCardProps) {
  const currentPrice = typeof basePrice === "number" ? basePrice : parseFloat(basePrice as string);
  const oldPrice = compareAtPrice
    ? typeof compareAtPrice === "number"
      ? compareAtPrice
      : parseFloat(compareAtPrice as string)
    : null;
  const hasDiscount = oldPrice !== null && oldPrice > currentPrice;
  const discountPercent = hasDiscount ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 0;

  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(id);
  const [animating, setAnimating] = useState(false);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAnimating(true);
    await toggleFavorite({ id, name });
    setTimeout(() => setAnimating(false), 300);
  };

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        boxShadow: "var(--shadow-xs)",
      }}
      className="product-card-hover"
    >
      {/* Botón de Favorito Flotante */}
      <button
        type="button"
        onClick={handleFavoriteClick}
        aria-label={favorited ? "Quitar de favoritos" : "Guardar en favoritos"}
        className={animating ? "heart-pop" : ""}
        style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 4,
          width: "34px",
          height: "34px",
          borderRadius: "50%",
          backgroundColor: favorited ? "#ffffff" : "rgba(255, 255, 255, 0.85)",
          border: "1px solid var(--border-subtle)",
          backdropFilter: "blur(4px)",
          color: favorited ? "#ef4444" : "#64748b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.15s ease",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill={favorited ? "#ef4444" : "none"}
          stroke={favorited ? "#ef4444" : "currentColor"}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
        </svg>
      </button>

      {/* Enlace contenedor de imagen */}
      <Link
        href={`/producto/${slug}`}
        style={{
          position: "relative",
          display: "block",
          aspectRatio: "1 / 1",
          overflow: "hidden",
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`${name} - TiendaDelki`}
            width={400}
            height={400}
            loading="lazy"
            decoding="async"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transition: "transform 0.3s ease",
              filter: isOutOfStock ? "grayscale(90%) opacity(0.7)" : "none",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#94a3b8",
              backgroundColor: "#f1f5f9",
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span style={{ fontSize: "0.75rem", marginTop: "0.4rem", fontWeight: "500" }}>Sin imagen</span>
          </div>
        )}

        {/* Badges superiores izquierdos (Sutiles y profesionales) */}
        <div
          style={{
            position: "absolute",
            top: "8px",
            left: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            zIndex: 2,
          }}
        >
          {isOutOfStock && (
            <span
              style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "var(--radius-xs)",
                backgroundColor: "#f1f5f9",
                color: "#475569",
                border: "1px solid #cbd5e1",
                fontSize: "0.7rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Agotado
            </span>
          )}
          {!isOutOfStock && hasDiscount && (
            <span
              style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "var(--radius-xs)",
                backgroundColor: "#dc2626",
                color: "#ffffff",
                fontSize: "0.7rem",
                fontWeight: "700",
                letterSpacing: "0.02em",
              }}
            >
              -{discountPercent}%
            </span>
          )}
          {!isOutOfStock && isNew && !hasDiscount && (
            <span
              style={{
                padding: "0.2rem 0.5rem",
                borderRadius: "var(--radius-xs)",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "0.7rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Nuevo
            </span>
          )}
        </div>
      </Link>

      {/* Contenido de la tarjeta */}
      <div
        style={{
          padding: "0.875rem 1rem 1rem 1rem",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
        }}
      >
        <div>
          {categoryName && (
            <div
              style={{
                fontSize: "0.725rem",
                color: "var(--text-muted)",
                fontWeight: "600",
                textTransform: "uppercase",
                marginBottom: "0.25rem",
                letterSpacing: "0.04em",
              }}
            >
              {categoryName}
            </div>
          )}

          <Link href={`/producto/${slug}`} style={{ textDecoration: "none" }}>
            <h3
              style={{
                fontSize: "0.925rem",
                fontWeight: "600",
                color: "var(--text-primary)",
                lineHeight: 1.35,
                marginBottom: "0.4rem",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                minHeight: "2.5em",
              }}
            >
              {name}
            </h3>
          </Link>
        </div>

        <div>
          {/* Precios con cálculo visual claro */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "1.05rem",
                fontWeight: "700",
                color: hasDiscount ? "var(--color-brand-danger)" : "var(--text-primary)",
              }}
            >
              {formatCurrency(currentPrice)}
            </span>
            {hasDiscount && oldPrice && (
              <span
                style={{
                  fontSize: "0.825rem",
                  color: "var(--text-muted)",
                  textDecoration: "line-through",
                }}
              >
                {formatCurrency(oldPrice)}
              </span>
            )}
          </div>

          {/* Botón de acción */}
          <Link
            href={`/producto/${slug}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              minHeight: "42px",
              padding: "0.55rem 0.75rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: isOutOfStock ? "#f8fafc" : "#ffffff",
              color: isOutOfStock ? "var(--text-muted)" : "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              fontSize: "0.85rem",
              fontWeight: "600",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => {
              if (!isOutOfStock) {
                e.currentTarget.style.backgroundColor = "var(--color-brand-primary)";
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.borderColor = "var(--color-brand-primary)";
              }
            }}
            onMouseOut={(e) => {
              if (!isOutOfStock) {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.color = "var(--text-primary)";
                e.currentTarget.style.borderColor = "var(--border-strong)";
              }
            }}
          >
            {isOutOfStock ? "Agotado" : hasVariants ? "Ver Opciones" : "Ver Producto"}
          </Link>
        </div>
      </div>
    </div>
  );
}
