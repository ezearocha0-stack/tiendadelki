"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface OrderDetail {
  id: string;
  orderNumber: string;
  createdAt: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  status: string;
  guestName: string;
  guestPhone: string;
  guestWhatsapp: string;
  guestEmail: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippedAt: string | null;
  proofOfPaymentUrl: string | null;
  proofUploadedAt: string | null;
  shippingAddress: {
    recipientName?: string;
    streetAddress: string;
    sectorOrNeighborhood: string;
    city: string;
    provinceOrState: string;
    deliveryNotes?: string | null;
  };
  shippingMethod: {
    name: string;
    price: number;
    estimatedDays?: string | null;
  };
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountType: string;
    holderName: string;
  } | null;
  items: Array<{
    id: string;
    productTitle: string;
    variantTitle: string | null;
    sku: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  statusHistory: Array<{
    id: string;
    newStatus: string;
    notes: string | null;
    createdAt: string;
  }>;
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; desc: string }> = {
  PENDIENTE_DE_PAGO: {
    label: "Pendiente de Pago",
    bg: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
    desc: "Esperando confirmación de transferencia o depósito bancario.",
  },
  PAGO_EN_REVISION: {
    label: "Pago en Revisión",
    bg: "rgba(139, 92, 246, 0.15)",
    color: "#a78bfa",
    desc: "Comprobante recibido. El equipo de administración está verificando los fondos.",
  },
  PAGADO: {
    label: "Pago Confirmado",
    bg: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    desc: "El pago fue aprobado exitosamente. Tu pedido pasará a empaque.",
  },
  PREPARANDO: {
    label: "En Preparación",
    bg: "rgba(59, 130, 246, 0.15)",
    color: "#60a5fa",
    desc: "Tus productos están siendo empacados y etiquetados en almacén.",
  },
  ENVIADO: {
    label: "Enviado con Transportista",
    bg: "rgba(6, 182, 212, 0.15)",
    color: "#22d3ee",
    desc: "Tu paquete fue despachado y está en ruta hacia tu dirección.",
  },
  ENTREGADO: {
    label: "Entregado",
    bg: "rgba(20, 184, 166, 0.15)",
    color: "#2dd4bf",
    desc: "El paquete fue entregado en la dirección indicada.",
  },
  COMPLETADO: {
    label: "Completado",
    bg: "rgba(5, 150, 105, 0.15)",
    color: "#10b981",
    desc: "Pedido cerrado satisfactoriamente.",
  },
  CANCELADO: {
    label: "Cancelado",
    bg: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    desc: "El pedido fue cancelado.",
  },
};

export default function ClienteOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const resolvedParams = use(params);
  const orderNumber = resolvedParams.orderNumber;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        const res = await fetch(`/api/cliente/orders/${encodeURIComponent(orderNumber)}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          setErrorMessage(
            json.error?.message || "No fue posible cargar el detalle del pedido."
          );
          return;
        }

        setOrder(json.data);
      } catch (err) {
        setErrorMessage("Error de conexión al cargar el pedido.");
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderNumber]);

  if (loading) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando detalle del pedido...</div>;
  }

  if (errorMessage) {
    return (
      <div className="card" style={{ padding: "3rem 2rem", textAlign: "center", maxWidth: "600px", margin: "0 auto" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
        <h2 style={{ fontSize: "1.35rem", fontWeight: "700", color: "#f87171", marginBottom: "0.5rem" }}>
          Acceso no autorizado
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
          {errorMessage}
        </p>
        <Link
          href="/cliente/pedidos"
          style={{
            padding: "0.65rem 1.25rem",
            backgroundColor: "var(--color-brand-accent)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
            fontWeight: "700",
            textDecoration: "none",
          }}
        >
          ← Volver a Mis Pedidos
        </Link>
      </div>
    );
  }

  if (!order) return null;

  const st = STATUS_CONFIG[order.status] || {
    label: order.status,
    bg: "var(--bg-surface-elevated)",
    color: "var(--text-primary)",
    desc: "",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      {/* Barra superior de navegación interna */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <Link href="/cliente/pedidos" style={{ color: "var(--color-brand-accent)", fontWeight: "600", fontSize: "0.9rem" }}>
          ← Volver a todos mis pedidos
        </Link>

        <Link
          href={`/rastreo?order=${encodeURIComponent(order.orderNumber)}`}
          style={{
            padding: "0.45rem 0.95rem",
            backgroundColor: "rgba(37, 99, 235, 0.12)",
            color: "#60a5fa",
            border: "1px solid rgba(37, 99, 235, 0.3)",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            fontWeight: "700",
            textDecoration: "none",
          }}
        >
          🚚 Ver Tracking en Vivo
        </Link>
      </div>

      {/* Encabezado del Pedido con Estado */}
      <div
        className="card"
        style={{
          padding: "1.75rem",
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderLeft: `5px solid ${st.color}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pedido Registrado
            </span>
            <h2 style={{ fontSize: "1.65rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.2rem" }}>
              #{order.orderNumber}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
              Fecha: {new Date(order.createdAt).toLocaleString("es-DO", { dateStyle: "long", timeStyle: "short" })}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <span
              style={{
                display: "inline-block",
                padding: "0.35rem 0.85rem",
                borderRadius: "var(--radius-full)",
                fontSize: "0.85rem",
                fontWeight: "700",
                backgroundColor: st.bg,
                color: st.color,
                border: `1px solid ${st.color}40`,
              }}
            >
              ● {st.label}
            </span>
            <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#34d399", marginTop: "0.5rem" }}>
              {formatCurrency(order.total)}
            </div>
          </div>
        </div>

        {st.desc && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "0.75rem 1rem",
              backgroundColor: "var(--bg-app)",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            ℹ️ {st.desc}
          </div>
        )}
      </div>

      {/* Información de Envíos y Tracking */}
      {(order.carrierName || order.trackingNumber) && (
        <div
          className="card"
          style={{
            padding: "1.5rem",
            backgroundColor: "rgba(6, 182, 212, 0.05)",
            border: "1px solid rgba(6, 182, 212, 0.3)",
          }}
        >
          <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#22d3ee", marginBottom: "0.75rem" }}>
            🚚 Datos de Envío y Despacho
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Transportista</span>
              <span style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                {order.carrierName || "Por confirmar"}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Número de Guía / Tracking</span>
              <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#38bdf8", fontFamily: "monospace" }}>
                {order.trackingNumber || "N/A"}
              </span>
            </div>
            {order.trackingUrl && (
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "0.85rem",
                    color: "#38bdf8",
                    textDecoration: "underline",
                    fontWeight: "600",
                  }}
                >
                  Abrir seguimiento oficial ↗
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cuadrícula: Artículos y Resumen Financiero */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {/* Lista de Artículos */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "1rem" }}>
            Artículos Comprados ({order.items.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {order.items.map((it) => (
              <div
                key={it.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "var(--text-primary)" }}>
                    {it.productTitle}
                  </h4>
                  {it.variantTitle && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Variante: {it.variantTitle}
                    </span>
                  )}
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    SKU: {it.sku} • {it.quantity} x {formatCurrency(it.unitPrice)}
                  </div>
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--text-primary)" }}>
                  {formatCurrency(it.totalPrice)}
                </div>
              </div>
            ))}
          </div>

          {/* Desglose de Totales */}
          <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>Subtotal:</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <span>Envío ({order.shippingMethod.name}):</span>
              <span>{order.shippingCost === 0 ? "GRATIS" : formatCurrency(order.shippingCost)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "1.1rem",
                fontWeight: "800",
                color: "#34d399",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--border-strong)",
                marginTop: "0.5rem",
              }}
            >
              <span>Total:</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>

        {/* Dirección de Entrega y Pago */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Dirección */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "0.75rem" }}>
              📍 Dirección de Entrega
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "600" }}>
              {order.shippingAddress.recipientName || order.guestName}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
              {order.shippingAddress.streetAddress}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {order.shippingAddress.sectorOrNeighborhood}, {order.shippingAddress.city}
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {order.shippingAddress.provinceOrState}
            </p>
            {order.shippingAddress.deliveryNotes && (
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem", fontStyle: "italic" }}>
                Nota: &quot;{order.shippingAddress.deliveryNotes}&quot;
              </p>
            )}
          </div>

          {/* Información de Pago y Comprobante */}
          <div className="card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", marginBottom: "0.75rem" }}>
              💳 Información de Pago
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Método: <strong>Depósito o Transferencia Bancaria</strong>
            </p>
            {order.bankAccount && (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                Banco: {order.bankAccount.bankName} • Cta: {order.bankAccount.accountNumber}
              </p>
            )}

            {order.proofOfPaymentUrl ? (
              <div style={{ marginTop: "1rem" }}>
                <span style={{ fontSize: "0.8rem", color: "#34d399", fontWeight: "700", display: "block", marginBottom: "0.35rem" }}>
                  ✓ Comprobante subido al sistema
                </span>
                <a
                  href={order.proofOfPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-brand-accent)",
                    textDecoration: "underline",
                  }}
                >
                  Ver comprobante adjunto ↗
                </a>
              </div>
            ) : (
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#fbbf24" }}>
                ⚠️ Aún no has adjuntado comprobante de pago. Puedes coordinar el pago por WhatsApp.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
