"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface OrderItemSummary {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  status: string;
  shippingMethod: {
    name: string;
    estimatedDays?: string;
  };
  items: Array<{
    id: string;
    productTitle: string;
    variantTitle?: string | null;
    quantity: number;
    unitPrice: number;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  PENDIENTE_DE_PAGO: { label: "Pendiente de Pago", bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24" },
  PAGO_EN_REVISION: { label: "Pago en Revisión", bg: "rgba(139, 92, 246, 0.15)", color: "#a78bfa" },
  PAGADO: { label: "Pagado", bg: "rgba(16, 185, 129, 0.15)", color: "#34d399" },
  PREPARANDO: { label: "En Preparación", bg: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" },
  ENVIADO: { label: "Enviado", bg: "rgba(6, 182, 212, 0.15)", color: "#22d3ee" },
  ENTREGADO: { label: "Entregado", bg: "rgba(20, 184, 166, 0.15)", color: "#2dd4bf" },
  COMPLETADO: { label: "Completado", bg: "rgba(5, 150, 105, 0.15)", color: "#10b981" },
  CANCELADO: { label: "Cancelado", bg: "rgba(239, 68, 68, 0.15)", color: "#f87171" },
};

export default function ClientePedidosPage() {
  const [orders, setOrders] = useState<OrderItemSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/cliente/orders");
        if (res.ok) {
          const json = await res.json();
          setOrders(json.data || []);
        }
      } catch (e) {
        console.error("Error cargando pedidos:", e);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  if (loading) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando tus pedidos...</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛍️</div>
        <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Aún no tienes pedidos registrados
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "2rem", maxWidth: "480px", margin: "0 auto 2rem" }}>
          Cuando realices una compra con tu cuenta, podrás rastrear tus paquetes y consultar tus comprobantes aquí.
        </p>
        <Link
          href="/tienda"
          style={{
            display: "inline-block",
            padding: "0.85rem 1.75rem",
            backgroundColor: "var(--color-brand-accent)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
            fontWeight: "700",
            textDecoration: "none",
          }}
        >
          Explorar Tienda
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {orders.map((order) => {
        const st = STATUS_LABELS[order.status] || {
          label: order.status,
          bg: "var(--bg-surface-elevated)",
          color: "var(--text-primary)",
        };

        const totalItems = order.items.reduce((sum, it) => sum + it.quantity, 0);

        return (
          <div
            key={order.id}
            className="card"
            style={{
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {/* Fila Superior: Número de pedido, fecha y estado */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: "800", color: "var(--text-primary)" }}>
                    #{order.orderNumber}
                  </h3>
                  <span
                    style={{
                      padding: "0.2rem 0.65rem",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      backgroundColor: st.bg,
                      color: st.color,
                      border: `1px solid ${st.color}40`,
                    }}
                  >
                    ● {st.label}
                  </span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  Realizado el {new Date(order.createdAt).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#34d399" }}>
                  {formatCurrency(order.total)}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  {totalItems} {totalItems === 1 ? "artículo" : "artículos"} • {order.shippingMethod.name}
                </div>
              </div>
            </div>

            {/* Resumen de Artículos */}
            <div
              style={{
                padding: "0.85rem",
                backgroundColor: "var(--bg-app)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {order.items.slice(0, 3).map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                  <span>
                    {item.quantity}x {item.productTitle} {item.variantTitle ? `(${item.variantTitle})` : ""}
                  </span>
                  <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>
                    {formatCurrency(item.unitPrice * item.quantity)}
                  </span>
                </div>
              ))}
              {order.items.length > 3 && (
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                  + {order.items.length - 3} artículos adicionales...
                </div>
              )}
            </div>

            {/* Acciones */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.25rem" }}>
              <Link
                href={`/rastreo?order=${encodeURIComponent(order.orderNumber)}`}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                🚚 Rastrear Envío
              </Link>

              <Link
                href={`/cliente/pedidos/${encodeURIComponent(order.orderNumber)}`}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "rgba(37, 99, 235, 0.15)",
                  color: "#60a5fa",
                  border: "1px solid rgba(37, 99, 235, 0.3)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  textDecoration: "none",
                }}
              >
                Ver Detalle Completo →
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
