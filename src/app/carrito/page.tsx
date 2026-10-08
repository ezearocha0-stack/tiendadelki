"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/store/cart-context";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { formatCurrency } from "@/lib/formatters";
import { useWhatsApp } from "@/hooks/use-whatsapp";

export default function CartPage() {
  const { items, updateQuantity, removeItem, clearCart, validateCartStock, itemCount, subtotal } = useCart();
  const [stockIssues, setStockIssues] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (items.length > 0) {
      setIsValidating(true);
      validateCartStock()
        .then((res) => {
          setStockIssues(res.issues);
        })
        .finally(() => setIsValidating(false));
    } else {
      setStockIssues([]);
    }
  }, []);

  const hasOutOfStockItem = items.some((it) => it.maxStock === 0 || it.quantity <= 0);
  const { openCartWhatsApp, phone } = useWhatsApp();

  function handleWhatsAppCheckout() {
    openCartWhatsApp(items, subtotal);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-app)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2rem 1.25rem", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
          <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Mi Carrito</span>
        </nav>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Carrito de Compras ({itemCount})
          </h1>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--color-brand-danger)",
                fontSize: "0.85rem",
                fontWeight: "600",
                cursor: "pointer",
                padding: "0.25rem 0.5rem",
                textDecoration: "underline",
              }}
            >
              Vaciar carrito
            </button>
          )}
        </div>

        {stockIssues.length > 0 && (
          <div
            style={{
              backgroundColor: "#fffbeb",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: "var(--radius-md)",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
            }}
          >
            <strong>Aviso de disponibilidad:</strong>
            <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.25rem" }}>
              {stockIssues.map((issue, idx) => (
                <li key={idx}>{issue.message}</li>
              ))}
            </ul>
          </div>
        )}

        {items.length === 0 ? (
          /* Empty Cart State */
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "var(--radius-lg)",
              padding: "4rem 2rem",
              textAlign: "center",
              border: "1px solid var(--border-subtle)",
              boxShadow: "var(--shadow-sm)",
              margin: "2rem auto",
              maxWidth: "500px",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                margin: "0 auto 1.25rem",
                borderRadius: "50%",
                backgroundColor: "var(--bg-muted)",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
              Tu carrito está vacío
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", marginBottom: "1.75rem", lineHeight: 1.5 }}>
              Aún no has seleccionado ningún producto. Explora nuestro catálogo con envíos a todo el país.
            </p>
            <Link
              href="/tienda"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.75rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                borderRadius: "var(--radius-md)",
                textDecoration: "none",
                backgroundColor: "var(--color-brand-primary)",
                color: "#ffffff",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary)")}
            >
              Explorar Catálogo
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        ) : (
          /* Cart with Items */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "2rem",
            }}
            className="cart-layout-grid"
          >
            {/* Items Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border-subtle)",
                    padding: "1rem 1.25rem",
                    display: "grid",
                    gridTemplateColumns: "80px 1fr",
                    gap: "1.25rem",
                    alignItems: "center",
                    boxShadow: "var(--shadow-xs)",
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "var(--radius-md)",
                      overflow: "hidden",
                      backgroundColor: "#f8fafc",
                      border: "1px solid var(--border-subtle)",
                      position: "relative",
                      flexShrink: 0,
                    }}
                  >
                    <img
                      src={item.thumbnailUrl || "/logo.png"}
                      alt={item.productTitle}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>

                  {/* Info & Actions */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                      <div>
                        <Link
                          href={`/producto/${item.slug}`}
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            lineHeight: 1.35,
                          }}
                        >
                          {item.productTitle}
                        </Link>
                        {item.variantTitle && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                            {item.variantTitle}
                          </div>
                        )}
                        {item.sku && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            SKU: {item.sku}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        aria-label="Eliminar producto"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "0.35rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "color 0.15s ease",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "var(--color-brand-danger)")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.75rem",
                        marginTop: "0.25rem",
                      }}
                    >
                      {/* Price per unit */}
                      <div style={{ fontSize: "0.925rem", fontWeight: 600, color: "var(--text-secondary)" }}>
                        {formatCurrency(item.price)} c/u
                      </div>

                      {/* Quantity selector */}
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--radius-md)",
                          overflow: "hidden",
                          backgroundColor: "#ffffff",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          style={{
                            width: "32px",
                            height: "32px",
                            background: "transparent",
                            border: "none",
                            cursor: item.quantity <= 1 ? "not-allowed" : "pointer",
                            fontSize: "1rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: item.quantity <= 1 ? 0.4 : 1,
                            color: "var(--text-primary)",
                          }}
                        >
                          -
                        </button>
                        <span
                          style={{
                            minWidth: "36px",
                            textAlign: "center",
                            fontSize: "0.875rem",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                          }}
                        >
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={item.quantity >= item.maxStock}
                          style={{
                            width: "32px",
                            height: "32px",
                            background: "transparent",
                            border: "none",
                            cursor: item.quantity >= item.maxStock ? "not-allowed" : "pointer",
                            fontSize: "1rem",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: item.quantity >= item.maxStock ? 0.4 : 1,
                            color: "var(--text-primary)",
                          }}
                        >
                          +
                        </button>
                      </div>

                      {/* Line Subtotal */}
                      <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>

                    {item.quantity >= item.maxStock && (
                      <div style={{ fontSize: "0.75rem", color: "var(--color-brand-warning)", marginTop: "0.25rem" }}>
                        Máximo stock disponible alcanzado ({item.maxStock} uds.)
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Sticky Order Summary Column */}
            <div>
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                  padding: "1.75rem",
                  boxShadow: "var(--shadow-sm)",
                  position: "sticky",
                  top: "90px",
                }}
              >
                <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 1.25rem" }}>
                  Resumen del Pedido
                </h2>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.925rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Subtotal ({itemCount} productos)</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{formatCurrency(subtotal)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.925rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>Envío</span>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Calculado en Checkout</span>
                  </div>

                  <div style={{ height: "1px", backgroundColor: "var(--border-subtle)", margin: "0.5rem 0" }} />

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.15rem", fontWeight: 700 }}>
                    <span style={{ color: "var(--text-primary)" }}>Total Estimado</span>
                    <span style={{ color: "var(--text-primary)" }}>{formatCurrency(subtotal)}</span>
                  </div>
                </div>

                {/* Primary Checkout CTA */}
                {hasOutOfStockItem ? (
                  <div
                    style={{
                      padding: "0.85rem",
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "var(--radius-md)",
                      color: "#991b1b",
                      fontSize: "0.85rem",
                      textAlign: "center",
                      marginBottom: "0.85rem",
                    }}
                  >
                    Por favor elimina los artículos agotados de tu carrito antes de proceder.
                  </div>
                ) : (
                  <Link
                    href="/checkout"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      width: "100%",
                      padding: "0.85rem 1.25rem",
                      backgroundColor: "var(--color-brand-primary)",
                      color: "#ffffff",
                      borderRadius: "var(--radius-md)",
                      fontWeight: 600,
                      fontSize: "0.95rem",
                      textDecoration: "none",
                      boxShadow: "var(--shadow-xs)",
                      transition: "background-color 0.15s ease",
                      marginBottom: "0.75rem",
                      minHeight: "46px",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary)")}
                  >
                    Proceder al Checkout
                    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                )}

                {/* WhatsApp Alternative CTA */}
                {phone && (
                  <button
                    type="button"
                    onClick={handleWhatsAppCheckout}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      width: "100%",
                      padding: "0.8rem 1.25rem",
                      backgroundColor: "var(--color-brand-whatsapp)",
                      color: "#ffffff",
                      borderRadius: "var(--radius-md)",
                      fontWeight: 600,
                      fontSize: "0.925rem",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "var(--shadow-xs)",
                      transition: "background-color 0.15s ease",
                      marginBottom: "1.25rem",
                      minHeight: "44px",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-whatsapp-hover)")}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-whatsapp)")}
                  >
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                      Comprar por WhatsApp
                    </button>
                  )}

                {/* Trust Points */}
                <div
                  style={{
                    backgroundColor: "var(--bg-muted)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    padding: "1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.55rem",
                    fontSize: "0.8rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--color-brand-success)", fontWeight: "bold" }}>✓</span>
                    <span>Pagos oficiales vía <strong>Popular, Banreservas y BHD</strong></span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--color-brand-success)", fontWeight: "bold" }}>✓</span>
                    <span>Ventas locales y retiro en tienda física</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ color: "var(--color-brand-success)", fontWeight: "bold" }}>✓</span>
                    <span>Recogida en tienda física sin costo</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />

      <style jsx>{`
        @media (min-width: 900px) {
          .cart-layout-grid {
            grid-template-columns: 1fr 380px !important;
          }
        }
      `}</style>
    </div>
  );
}
