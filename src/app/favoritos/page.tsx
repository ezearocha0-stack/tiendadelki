"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { ProductCard } from "@/components/store/product-card";
import { useFavorites } from "@/components/store/favorites-context";
import { useCart } from "@/components/store/cart-context";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/components/ui/toast-context";

interface FavoriteProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  compareAtPrice: number | null;
  stock: number;
  hasVariants: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isOutOfStock: boolean;
  categoryName: string;
  thumbnailUrl: string | null;
}

export default function FavoritosPage() {
  const { favoriteIds, removeFavorite, isAuthenticated, loading: favLoading } = useFavorites();
  const { addItem } = useCart();
  const { showToast } = useToast();

  const [products, setProducts] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [addingIds, setAddingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadFavoriteProducts() {
      if (favLoading) return;

      if (favoriteIds.length === 0) {
        if (isMounted) {
          setProducts([]);
          setLoading(false);
        }
        return;
      }

      try {
        setError(false);
        if (isAuthenticated) {
          // Cliente autenticado
          const res = await fetch("/api/cliente/favorites");
          if (!res.ok) throw new Error("Error cargando favoritos");
          const json = await res.json();
          if (isMounted && json.data) {
            setProducts(
              json.data.map((f: any) => ({
                id: f.product.id,
                name: f.product.name,
                slug: f.product.slug,
                basePrice: f.product.basePrice,
                compareAtPrice: f.product.compareAtPrice,
                stock: f.product.stock,
                hasVariants: f.product.hasVariants,
                isNew: f.product.isNew,
                isFeatured: f.product.isFeatured,
                isOutOfStock: f.product.stock === 0,
                categoryName: f.product.category?.name || "General",
                thumbnailUrl: f.product.thumbnailUrl,
              }))
            );
          }
        } else {
          // Invitado con IDs en localStorage
          const res = await fetch("/api/favorites/guest-details", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productIds: favoriteIds }),
          });
          if (!res.ok) throw new Error("Error cargando detalles");
          const json = await res.json();
          if (isMounted && json.data) {
            setProducts(json.data);
          }
        }
      } catch (e) {
        if (isMounted) setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadFavoriteProducts();

    return () => {
      isMounted = false;
    };
  }, [favoriteIds, isAuthenticated, favLoading]);

  function handleAddToCart(p: FavoriteProduct) {
    if (p.hasVariants) {
      window.location.href = `/producto/${p.slug}`;
      return;
    }

    addItem(
      {
        productId: p.id,
        productTitle: p.name,
        price: p.basePrice,
        thumbnailUrl: p.thumbnailUrl,
        maxStock: p.stock,
        slug: p.slug,
      },
      1
    );

    setAddingIds((prev) => ({ ...prev, [p.id]: true }));
    showToast(`¡${p.name} agregado al carrito!`, "success");

    setTimeout(() => {
      setAddingIds((prev) => ({ ...prev, [p.id]: false }));
    }, 1500);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 1.25rem)", maxWidth: "1400px", margin: "0 auto", width: "100%" }}>
        {/* Encabezado */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
            <Link href="/" style={{ color: "var(--text-muted)" }}>
              Inicio
            </Link>
            <span style={{ margin: "0 0.5rem" }}>/</span>
            <span style={{ color: "var(--text-secondary)", fontWeight: "600" }}>Favoritos</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "clamp(1.35rem, 4vw, 2rem)", fontWeight: "900", color: "var(--text-primary)", margin: 0 }}>
                ❤️ Mis Productos Favoritos
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: "0.25rem 0 0 0" }}>
                {favoriteIds.length === 1 ? "1 artículo guardado" : `${favoriteIds.length} artículos guardados`}
              </p>
            </div>

            {!isAuthenticated && favoriteIds.length > 0 && (
              <div
                style={{
                  backgroundColor: "rgba(37, 99, 235, 0.1)",
                  border: "1px solid rgba(37, 99, 235, 0.25)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.6rem 1rem",
                  fontSize: "0.85rem",
                  color: "#93c5fd",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>💡 Guardados en tu navegador actual.</span>
                <Link href="/login?callbackUrl=/favoritos" style={{ color: "#ffffff", fontWeight: "700", textDecoration: "underline" }}>
                  Inicia sesión para sincronizar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Estados de Carga y Error */}
        {loading && <ProductGridSkeleton count={favoriteIds.length > 0 ? Math.min(favoriteIds.length, 8) : 4} />}

        {error && !loading && (
          <ErrorState
            title="Error al cargar favoritos"
            message="No pudimos obtener la información de tus productos favoritos. Por favor intenta de nuevo."
            onRetry={() => window.location.reload()}
          />
        )}

        {/* Estado Vacío */}
        {!loading && !error && favoriteIds.length === 0 && (
          <EmptyState
            icon="❤️"
            title="No tienes productos favoritos aún"
            description="Explora nuestro catálogo y presiona el botón de corazón en cualquier producto para guardarlo aquí y comprarlo después."
            actionLabel="Explorar la Tienda"
            actionHref="/tienda"
            secondaryLabel="Ver Ofertas Especiales"
            secondaryHref="/ofertas"
          />
        )}

        {/* Cuadrícula de Favoritos */}
        {!loading && !error && products.length > 0 && (
          <div className="store-product-grid">
            {products.map((p) => (
              <div key={p.id} style={{ display: "flex", flexDirection: "column" }}>
                <ProductCard
                  id={p.id}
                  name={p.name}
                  slug={p.slug}
                  basePrice={p.basePrice}
                  compareAtPrice={p.compareAtPrice}
                  categoryName={p.categoryName}
                  thumbnailUrl={p.thumbnailUrl}
                  hasVariants={p.hasVariants}
                  isNew={p.isNew}
                  isFeatured={p.isFeatured}
                  isOutOfStock={p.isOutOfStock}
                />

                {/* Acciones rápidas de favoritos */}
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    disabled={p.isOutOfStock}
                    onClick={() => handleAddToCart(p)}
                    style={{
                      flex: 1,
                      padding: "0.6rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: p.isOutOfStock
                        ? "rgba(255, 255, 255, 0.05)"
                        : addingIds[p.id]
                        ? "#10b981"
                        : "var(--color-brand-accent)",
                      color: p.isOutOfStock ? "var(--text-muted)" : "#ffffff",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                      cursor: p.isOutOfStock ? "not-allowed" : "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {p.isOutOfStock
                      ? "Agotado"
                      : addingIds[p.id]
                      ? "✓ En el Carrito"
                      : p.hasVariants
                      ? "Elegir Talla"
                      : "+ Agregar"}
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFavorite(p.id, p.name)}
                    aria-label={`Eliminar ${p.name} de favoritos`}
                    title="Eliminar de favoritos"
                    style={{
                      padding: "0.6rem 0.85rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.25)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "0.85rem",
                      fontWeight: "700",
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
