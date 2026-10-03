"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { useCart } from "@/components/store/cart-context";
import { useFavorites } from "@/components/store/favorites-context";
import { useToast } from "@/components/ui/toast-context";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductGridSkeleton } from "@/components/ui/skeletons";

interface FavoriteItem {
  id: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    compareAtPrice: number | null;
    stock: number;
    hasVariants: boolean;
    category?: { id: string; name: string; slug: string };
    thumbnailUrl: string | null;
  };
}

export default function ClienteFavoritosPage() {
  const { addItem } = useCart();
  const { favoriteIds, removeFavorite, loading: favContextLoading } = useFavorites();
  const { showToast } = useToast();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    async function loadFavorites() {
      try {
        const res = await fetch("/api/cliente/favorites");
        if (res.ok) {
          const json = await res.json();
          setFavorites(json.data || []);
        }
      } catch (e) {
        console.error("Error al cargar favoritos:", e);
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, [favoriteIds]);

  async function handleRemove(productId: string, productName?: string) {
    try {
      await removeFavorite(productId, productName);
      setFavorites((prev) => prev.filter((f) => f.productId !== productId));
    } catch (e) {
      showToast("Error al remover de favoritos.", "error");
    }
  }

  function handleAddToCart(f: FavoriteItem) {
    if (f.product.hasVariants) {
      window.location.href = `/producto/${f.product.slug}`;
      return;
    }

    addItem(
      {
        productId: f.product.id,
        productTitle: f.product.name,
        price: f.product.basePrice,
        thumbnailUrl: f.product.thumbnailUrl,
        maxStock: f.product.stock,
        slug: f.product.slug,
      },
      1
    );

    setAddedIds((prev) => ({ ...prev, [f.productId]: true }));
    showToast(`¡${f.product.name} agregado al carrito!`, "success");
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [f.productId]: false }));
    }, 2000);
  }

  if (loading || favContextLoading) {
    return <ProductGridSkeleton count={4} />;
  }

  if (favorites.length === 0) {
    return (
      <EmptyState
        icon="❤️"
        title="No tienes productos favoritos aún"
        description="Explora la tienda y pulsa el corazón en cualquier artículo para guardarlo aquí y comprarlo luego."
        actionLabel="Ver Catálogo"
        actionHref="/tienda"
        secondaryLabel="Ver Ofertas"
        secondaryHref="/ofertas"
      />
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)" }}>
          ❤️ Mis Productos Favoritos ({favorites.length})
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Artículos que has guardado para comprar más adelante
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: "1.25rem",
        }}
      >
        {favorites.map((f) => {
          const isAdded = Boolean(addedIds[f.productId]);
          const isOutOfStock = f.product.stock <= 0;

          return (
            <div
              key={f.id}
              className="card"
              style={{
                padding: "1rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div>
                {/* Imagen del Producto */}
                <Link href={`/producto/${f.product.slug}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "200px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--bg-app)",
                      overflow: "hidden",
                      marginBottom: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {f.product.thumbnailUrl ? (
                      <img
                        src={f.product.thumbnailUrl}
                        alt={f.product.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ fontSize: "2.5rem" }}>🏷️</span>
                    )}
                  </div>
                </Link>

                {/* Info */}
                {f.product.category && (
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {f.product.category.name}
                  </span>
                )}

                <h3 style={{ fontSize: "0.95rem", fontWeight: "700", marginTop: "0.2rem", color: "var(--text-primary)" }}>
                  <Link href={`/producto/${f.product.slug}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {f.product.name}
                  </Link>
                </h3>

                <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.1rem", fontWeight: "800", color: "#34d399" }}>
                    {formatCurrency(f.product.basePrice)}
                  </span>
                  {f.product.compareAtPrice && f.product.compareAtPrice > f.product.basePrice && (
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", textDecoration: "line-through" }}>
                      {formatCurrency(f.product.compareAtPrice)}
                    </span>
                  )}
                </div>

                {isOutOfStock && (
                  <span style={{ fontSize: "0.75rem", color: "#f87171", fontWeight: "700", marginTop: "0.25rem", display: "block" }}>
                    ● Agotado temporalmente
                  </span>
                )}
              </div>

              {/* Botones de Acción */}
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => handleAddToCart(f)}
                  disabled={isOutOfStock}
                  style={{
                    width: "100%",
                    padding: "0.6rem",
                    backgroundColor: isAdded ? "#10b981" : isOutOfStock ? "var(--bg-app)" : "var(--color-brand-accent)",
                    color: isOutOfStock ? "var(--text-muted)" : "#ffffff",
                    borderRadius: "var(--radius-md)",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                    cursor: isOutOfStock ? "not-allowed" : "pointer",
                  }}
                >
                  {isAdded ? "✓ ¡Agregado!" : f.product.hasVariants ? "Seleccionar Variante" : "🛒 Agregar al Carrito"}
                </button>

                <button
                  type="button"
                  onClick={() => handleRemove(f.productId, f.product.name)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    textAlign: "center",
                    padding: "0.25rem",
                  }}
                >
                  Quitar de favoritos ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
