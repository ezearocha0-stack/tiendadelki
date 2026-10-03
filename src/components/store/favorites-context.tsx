"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useToast } from "@/components/ui/toast-context";

interface FavoriteProductSummary {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  compareAtPrice?: number | null;
  thumbnailUrl?: string | null;
  categoryName?: string;
  isOutOfStock?: boolean;
}

interface FavoritesContextValue {
  favoriteIds: string[];
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (product: { id: string; name?: string }) => Promise<void>;
  addFavorite: (product: { id: string; name?: string }) => Promise<void>;
  removeFavorite: (productId: string, productName?: string) => Promise<void>;
  favoritesCount: number;
  loading: boolean;
  isAuthenticated: boolean;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

const GUEST_FAVORITES_KEY = "tiendadelki_favorites_guest_v1";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { showToast } = useToast();

  // 1. Inicialización y detección de sesión
  useEffect(() => {
    let isMounted = true;

    async function initFavorites() {
      try {
        // Cargar favoritos locales de invitado
        const localData = localStorage.getItem(GUEST_FAVORITES_KEY);
        let guestIds: string[] = [];
        if (localData) {
          try {
            guestIds = JSON.parse(localData);
            if (!Array.isArray(guestIds)) guestIds = [];
          } catch (e) {
            guestIds = [];
          }
        }

        // Verificar si el usuario está autenticado
        const authRes = await fetch("/api/auth/me");
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.user) {
            setIsAuthenticated(true);

            // Si hay favoritos guardados como invitado, sincronizarlos a su cuenta
            if (guestIds.length > 0) {
              try {
                await fetch("/api/cliente/favorites/sync", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ productIds: guestIds }),
                });
                localStorage.removeItem(GUEST_FAVORITES_KEY);
              } catch (e) {
                console.error("Error sincronizando favoritos:", e);
              }
            }

            // Obtener lista completa del servidor
            const favRes = await fetch("/api/cliente/favorites");
            if (favRes.ok) {
              const favData = await favRes.json();
              if (isMounted && favData.data) {
                setFavoriteIds(favData.data.map((f: any) => f.productId));
              }
            }
            if (isMounted) setLoading(false);
            return;
          }
        }

        // Modo invitado
        setIsAuthenticated(false);
        if (isMounted) {
          setFavoriteIds(guestIds);
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) setLoading(false);
      }
    }

    initFavorites();

    return () => {
      isMounted = false;
    };
  }, []);

  const isFavorite = useCallback(
    (productId: string) => {
      return favoriteIds.includes(productId);
    },
    [favoriteIds]
  );

  const addFavorite = useCallback(
    async (product: { id: string; name?: string }) => {
      const { id, name = "Producto" } = product;
      if (favoriteIds.includes(id)) return;

      const nextIds = [...favoriteIds, id];
      setFavoriteIds(nextIds);

      if (isAuthenticated) {
        try {
          await fetch("/api/cliente/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: id }),
          });
        } catch (e) {
          console.error("Error al persistir favorito:", e);
        }
      } else {
        localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(nextIds));
      }

      showToast(`¡${name} agregado a tus favoritos! ❤️`, "success");
    },
    [favoriteIds, isAuthenticated, showToast]
  );

  const removeFavorite = useCallback(
    async (productId: string, productName?: string) => {
      if (!favoriteIds.includes(productId)) return;

      const nextIds = favoriteIds.filter((id) => id !== productId);
      setFavoriteIds(nextIds);

      if (isAuthenticated) {
        try {
          await fetch(`/api/cliente/favorites?productId=${encodeURIComponent(productId)}`, {
            method: "DELETE",
          });
        } catch (e) {
          console.error("Error al eliminar favorito:", e);
        }
      } else {
        localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(nextIds));
      }

      showToast(
        productName ? `${productName} removido de favoritos` : "Producto removido de favoritos",
        "info"
      );
    },
    [favoriteIds, isAuthenticated, showToast]
  );

  const toggleFavorite = useCallback(
    async (product: { id: string; name?: string }) => {
      if (isFavorite(product.id)) {
        await removeFavorite(product.id, product.name);
      } else {
        await addFavorite(product);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        isFavorite,
        toggleFavorite,
        addFavorite,
        removeFavorite,
        favoritesCount: favoriteIds.length,
        loading,
        isAuthenticated,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites debe usarse dentro de un FavoritesProvider");
  }
  return context;
}
