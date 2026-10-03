"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export interface CartItem {
  id: string; // `${productId}_${variantId || 'simple'}`
  productId: string;
  variantId?: string | null;
  productTitle: string;
  variantTitle?: string | null;
  sku?: string | null;
  price: number;
  compareAtPrice?: number | null;
  quantity: number;
  maxStock: number;
  thumbnailUrl?: string | null;
  slug: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "id" | "quantity">, qty?: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  validateCartStock: () => Promise<{ isValid: boolean; issues: any[] }>;
  itemCount: number;
  subtotal: number;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
  toast: string | null;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "tiendadelki_cart_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        setItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Error al cargar carrito:", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Guardar en localStorage ante cualquier cambio
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Error al guardar carrito:", e);
    }
  }, [items, isLoaded]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function addItem(itemData: Omit<CartItem, "id" | "quantity">, qty = 1) {
    const cartItemId = `${itemData.productId}_${itemData.variantId || "simple"}`;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((i) => i.id === cartItemId);

      if (existingIndex > -1) {
        const existing = prevItems[existingIndex];
        const newQuantity = Math.min(existing.quantity + qty, itemData.maxStock);

        const updated = [...prevItems];
        updated[existingIndex] = {
          ...existing,
          quantity: newQuantity,
          maxStock: itemData.maxStock,
        };
        return updated;
      } else {
        const initialQty = Math.min(qty, itemData.maxStock);
        return [
          ...prevItems,
          {
            ...itemData,
            id: cartItemId,
            quantity: initialQty,
          },
        ];
      }
    });

    showToast(`✓ Agregado al carrito: ${itemData.productTitle}${itemData.variantTitle ? ` (${itemData.variantTitle})` : ""}`);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateQuantity(id: string, quantity: number) {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const clamped = Math.min(quantity, item.maxStock);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  }

  function clearCart() {
    setItems([]);
  }

  async function validateCartStock(): Promise<{ isValid: boolean; issues: any[] }> {
    if (items.length === 0) {
      return { isValid: true, issues: [] };
    }

    try {
      const res = await fetch("/api/cart/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((it) => ({
            productId: it.productId,
            variantId: it.variantId || null,
            quantity: it.quantity,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        return { isValid: false, issues: [{ message: "Error al validar stock", type: "ERROR" }] };
      }

      const { isValid, items: validatedItems, issues } = json.data;

      // Actualizar estado local si hay variaciones de precio o stock
      setItems((prevItems) => {
        return prevItems.map((localItem) => {
          const matched = (validatedItems as any[]).find(
            (vi) =>
              vi.productId === localItem.productId &&
              (vi.variantId || null) === (localItem.variantId || null)
          );

          if (!matched) return localItem;

          const clampedQty = Math.min(localItem.quantity, matched.maxStock);

          return {
            ...localItem,
            price: matched.price,
            maxStock: matched.maxStock,
            quantity: clampedQty,
          };
        });
      });

      if (issues.length > 0) {
        showToast(`⚠️ ${issues[0].message}`);
      }

      return { isValid, issues };
    } catch (err) {
      console.error("Error validando carrito:", err);
      return { isValid: true, issues: [] };
    }
  }

  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        validateCartStock,
        itemCount,
        subtotal,
        isDrawerOpen,
        setIsDrawerOpen,
        toast,
      }}
    >
      {children}
      {/* Toast flotante */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            padding: "0.85rem 1.35rem",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
            zIndex: 9999,
            fontSize: "0.9rem",
            fontWeight: "700",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toast}
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser utilizado dentro de un CartProvider");
  }
  return context;
}
