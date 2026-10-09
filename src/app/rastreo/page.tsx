"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { formatCurrency } from "@/lib/formatters";
import { useWhatsApp } from "@/hooks/use-whatsapp";

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; step: number; icon: string }
> = {
  PENDIENTE_DE_PAGO: {
    label: "PENDIENTE DE PAGO",
    bg: "#fef3c7",
    color: "#b45309",
    step: 1,
    icon: "⏳",
  },
  PAGO_EN_REVISION: {
    label: "PAGO EN REVISIÓN",
    bg: "#dbeafe",
    color: "#1e40af",
    step: 1,
    icon: "⏱️",
  },
  PAGADO: {
    label: "PAGO CONFIRMADO",
    bg: "#dcfce7",
    color: "#15803d",
    step: 2,
    icon: "✅",
  },
  PREPARANDO: {
    label: "EN PREPARACIÓN",
    bg: "#ede9fe",
    color: "#6d28d9",
    step: 3,
    icon: "📦",
  },
  ENVIADO: {
    label: "EN CAMINO / DESPACHADO",
    bg: "#e0f2fe",
    color: "#0369a1",
    step: 4,
    icon: "🚚",
  },
  ENTREGADO: {
    label: "ENTREGADO",
    bg: "#d1fae5",
    color: "#047857",
    step: 5,
    icon: "🎉",
  },
  COMPLETADO: {
    label: "ORDEN COMPLETADA",
    bg: "#f1f5f9",
    color: "#334155",
    step: 5,
    icon: "⭐",
  },
  CANCELADO: {
    label: "CANCELADO",
    bg: "#fee2e2",
    color: "#b91c1c",
    step: 0,
    icon: "🛑",
  },
};

const ORDER_STEPS = [
  { step: 1, label: "Recibido" },
  { step: 2, label: "Pagado" },
  { step: 3, label: "Preparando" },
  { step: 4, label: "En Camino" },
  { step: 5, label: "Entregado" },
];

export default function TrackingPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const { openDirectWhatsApp, phone } = useWhatsApp();

  async function searchOrder(codeToSearch: string) {
    const clean = codeToSearch.trim().toUpperCase().replace(/^#/, "");
    if (!clean) return;

    setLoading(true);
    setError(null);
    setOrder(null);

    try {
      const res = await fetch(`/api/orders/${clean}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "No encontramos ningún pedido con ese número.");
      }

      setOrder(json.data);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("tiendadelki_last_order", clean);
        } catch {
          // ignore
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al buscar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    await searchOrder(query);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Revisar si viene código por parámetro en la URL (?guia=, ?order=, ?pedido=, ?id=, ?q=)
    const params = new URLSearchParams(window.location.search);
    const paramCode =
      params.get("guia") ||
      params.get("order") ||
      params.get("pedido") ||
      params.get("id") ||
      params.get("q");

    // 2. Si no hay parámetro en la URL, verificar el último pedido registrado en este dispositivo
    const savedOrder = (() => {
      try {
        return localStorage.getItem("tiendadelki_last_order");
      } catch {
        return null;
      }
    })();

    const targetOrder = paramCode || savedOrder;

    if (targetOrder) {
      const clean = targetOrder.trim().toUpperCase().replace(/^#/, "");
      setQuery(clean);
      searchOrder(clean);
    }
  }, []);

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  }

  const isLocalOrder =
    order?.carrierName?.toLowerCase().includes("local") ||
    order?.carrierName?.toLowerCase().includes("retiro") ||
    order?.carrierName?.toLowerCase().includes("recogida") ||
    order?.carrierName?.toLowerCase().includes("tienda") ||
    order?.shippingMethod?.name?.toLowerCase().includes("recogida") ||
    order?.shippingMethod?.name?.toLowerCase().includes("retiro") ||
    order?.shippingMethod?.name?.toLowerCase().includes("tienda");

  const baseStatus = order ? STATUS_CONFIG[order.status] : null;
  const statusMeta = baseStatus
    ? order?.status === "ENVIADO" && isLocalOrder
      ? {
          label: "LISTO PARA RETIRAR EN TIENDA",
          bg: "#dcfce7",
          color: "#15803d",
          step: 4,
          icon: "🏪",
        }
      : baseStatus
    : null;

  const currentSteps = [
    { step: 1, label: "Recibido" },
    { step: 2, label: "Pagado" },
    { step: 3, label: "Preparando" },
    { step: 4, label: isLocalOrder ? "Listo p/ Retiro" : "En Camino" },
    { step: 5, label: "Entregado" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "clamp(1.5rem, 4vw, 3rem) clamp(0.75rem, 2vw, 1rem)", maxWidth: "860px", width: "100%", margin: "0 auto" }}>
        {/* Header Title */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "rgba(37, 99, 235, 0.08)",
              color: "var(--color-primary, #2563eb)",
              padding: "0.4rem 1rem",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.85rem",
              marginBottom: "0.85rem",
            }}
          >
            📦 ESTADO DEL PEDIDO
          </div>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, margin: "0 0 0.75rem", color: "var(--color-text-main)" }}>
            Seguimiento de tu Pedido
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "clamp(0.9rem, 2.5vw, 1.05rem)", margin: 0, maxWidth: "600px", marginInline: "auto" }}>
            Ingresa tu número de orden para consultar el estado en tiempo real y la disponibilidad para retiro de tu compra.
          </p>
        </div>

        {/* Search Input Box */}
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            padding: "clamp(1rem, 3vw, 1.75rem)",
            boxShadow: "var(--shadow-md)",
            marginBottom: "2rem",
          }}
        >
          <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input
              type="text"
              required
              placeholder="Ej. TK-2609-1234 o #TK-2609-1234"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                flex: 1,
                minWidth: "240px",
                padding: "0.9rem 1.25rem",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
                fontSize: "1.05rem",
                background: "var(--color-bg)",
                color: "inherit",
                boxSizing: "border-box",
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: "var(--color-primary, #2563eb)",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                padding: "0.9rem 2rem",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {loading ? "Consultando..." : "🔍 Rastrear"}
            </button>
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOrder(null);
                  setError(null);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid var(--color-border)",
                  borderRadius: "10px",
                  padding: "0.9rem 1.25rem",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                }}
                title="Limpiar para consultar otro pedido"
              >
                ✕ Limpiar
              </button>
            )}
          </form>

          {order && (
            <div
              style={{
                marginTop: "0.85rem",
                fontSize: "0.85rem",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontWeight: 500,
              }}
            >
              <span>✓ Pedido detectado automáticamente: <strong>#{order.orderNumber}</strong></span>
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: "1.25rem",
                background: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #f87171",
                padding: "0.85rem 1.25rem",
                borderRadius: "8px",
                fontSize: "0.9rem",
              }}
            >
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ORDER DETAILS & TRACKING RESULT */}
        {order && statusMeta && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Status & Stepper Card */}
            <div
              style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                padding: "clamp(1.25rem, 3vw, 2rem)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block" }}>
                    Número de Pedido:
                  </span>
                  <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-primary, #2563eb)" }}>
                    #{order.orderNumber}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                    Cliente: <strong>{order.guestName}</strong> • Fecha:{" "}
                    {new Date(order.createdAt).toLocaleDateString("es-DO", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    background: statusMeta.bg,
                    color: statusMeta.color,
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    padding: "0.4rem 1rem",
                    borderRadius: "9999px",
                  }}
                >
                  {statusMeta.icon} {statusMeta.label}
                </span>
              </div>

              {/* Visual Progression Stepper */}
              {order.status !== "CANCELADO" && (
                <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--color-border)", overflowX: "auto", paddingBottom: "0.5rem" }} className="scrollbar-none">
                  <div style={{ display: "flex", justifyContent: "space-between", position: "relative", minWidth: "320px", maxWidth: "550px", margin: "0 auto" }}>
                    <div style={{ position: "absolute", top: "14px", left: "20px", right: "20px", height: "3px", background: "#e2e8f0", zIndex: 0 }} />
                    <div
                      style={{
                        position: "absolute",
                        top: "14px",
                        left: "20px",
                        width: `${Math.min(100, Math.max(0, ((statusMeta.step - 1) / (currentSteps.length - 1)) * 100))}%`,
                        height: "3px",
                        background: "var(--color-primary, #2563eb)",
                        zIndex: 0,
                        transition: "width 0.3s ease",
                      }}
                    />

                    {currentSteps.map((s) => {
                      const isCompleted = statusMeta.step >= s.step;
                      const isCurrent = statusMeta.step === s.step;
                      return (
                        <div key={s.step} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.35rem" }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: isCompleted ? "var(--color-primary, #2563eb)" : "#ffffff",
                              border: isCompleted ? "2px solid var(--color-primary, #2563eb)" : "2px solid #cbd5e1",
                              color: isCompleted ? "#ffffff" : "#64748b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              boxShadow: isCurrent ? "0 0 0 4px rgba(37,99,235,0.2)" : "none",
                            }}
                          >
                            {isCompleted ? "✓" : s.step}
                          </div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              fontWeight: isCurrent ? 700 : 500,
                              color: isCurrent ? "var(--color-primary, #2563eb)" : "var(--color-text-muted)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* LOCAL IN-STORE PICKUP CARD */}
            {isLocalOrder && (order.status === "ENVIADO" || order.status === "PREPARANDO" || order.status === "ENTREGADO") && (
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                  border: "2px solid #16a34a",
                  borderRadius: "16px",
                  padding: "clamp(1rem, 3vw, 1.75rem)",
                  boxShadow: "0 4px 14px rgba(22, 163, 74, 0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.6rem" }}>🏪</span>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#166534" }}>
                    {order.status === "ENTREGADO" || order.status === "COMPLETADO"
                      ? "Pedido Retirado con Éxito"
                      : order.status === "ENVIADO"
                      ? "¡Tu Pedido está Listo para Retirar en Tienda!"
                      : "Preparando para Retiro en Tienda"}
                  </h3>
                </div>

                <p style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", color: "#14532d", lineHeight: 1.6 }}>
                  {order.status === "ENTREGADO" || order.status === "COMPLETADO"
                    ? "Confirmamos que tu compra fue retirada satisfactoriamente en nuestro local. ¡Gracias por preferir TiendaDelki!"
                    : order.status === "ENVIADO"
                    ? "Tus productos ya están empacados en mostrador. Puedes pasar a recogerlos por nuestra tienda física en San Fernando de Montecristi con tu número de orden."
                    : "Estamos organizando y empacando tus artículos para que puedas retirarlos en nuestro local a la brevedad."}
                </p>

                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    border: "1px solid #bbf7d0",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                      Modalidad de Entrega
                    </span>
                    <strong style={{ fontSize: "1.05rem", color: "#111827" }}>Retiro Presencial en Tienda</strong>
                  </div>

                  <div>
                    <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                      Lugar de Retiro
                    </span>
                    <strong style={{ fontSize: "1.05rem", color: "#111827" }}>San Fernando de Montecristi</strong>
                  </div>

                  {order.shippedAt && (
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                        Disponible desde
                      </span>
                      <span style={{ fontSize: "0.95rem", color: "#374151" }}>
                        {new Date(order.shippedAt).toLocaleDateString("es-DO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {phone && (
                  <button
                    type="button"
                    onClick={() =>
                      openDirectWhatsApp(
                        `Hola TiendaDelki, deseo consultar sobre el retiro de mi pedido #${order.orderNumber}.`
                      )
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "#ffffff",
                      color: "#166534",
                      border: "1px solid #86efac",
                      padding: "0.65rem 1.2rem",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    💬 Notificar o consultar retiro por WhatsApp
                  </button>
                )}
              </div>
            )}

            {/* EXTERNAL CARRIER TRACKING CARD (When not local pickup, not cancelled, and has carrier) */}
            {!isLocalOrder && order.status !== "CANCELADO" && (order.carrierName || order.trackingNumber) && (
              <div
                style={{
                  background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                  border: "2px solid #16a34a",
                  borderRadius: "16px",
                  padding: "1.75rem",
                  boxShadow: "0 4px 14px rgba(22, 163, 74, 0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>🚚</span>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#166534" }}>
                    Información Oficial de Despacho y Transporte
                  </h3>
                </div>

                <p style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", color: "#14532d" }}>
                  Tu paquete se encuentra bajo custodia de la empresa transportista. Utiliza el siguiente número de guía para darle seguimiento a la entrega:
                </p>

                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    border: "1px solid #bbf7d0",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1.25rem",
                  }}
                >
                  {order.carrierName && (
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                        Empresa Transportista
                      </span>
                      <strong style={{ fontSize: "1.1rem", color: "#111827" }}>{order.carrierName}</strong>
                    </div>
                  )}

                  {order.trackingNumber && (
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                        Número de Guía
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontWeight: 800,
                            fontSize: "1.15rem",
                            color: "#166534",
                            background: "#f0fdf4",
                            padding: "0.2rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px dashed #86efac",
                          }}
                        >
                          {order.trackingNumber}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(order.trackingNumber)}
                          style={{
                            background: copiedTracking ? "#16a34a" : "#f3f4f6",
                            color: copiedTracking ? "#ffffff" : "#374151",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            padding: "0.25rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          {copiedTracking ? "✓ Copiado" : "Copiar"}
                        </button>
                      </div>
                    </div>
                  )}

                  {order.shippedAt && (
                    <div>
                      <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                        Fecha de Despacho
                      </span>
                      <span style={{ fontSize: "0.95rem", color: "#374151" }}>
                        {new Date(order.shippedAt).toLocaleDateString("es-DO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                  {order.trackingUrl && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "#16a34a",
                        color: "#ffffff",
                        padding: "0.65rem 1.25rem",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                      }}
                    >
                      🔍 Rastrear Envío en Línea ↗
                    </a>
                  )}

                  {phone && (
                    <button
                      type="button"
                      onClick={() =>
                        openDirectWhatsApp(
                          `Hola TiendaDelki, consulto sobre mi pedido #${order.orderNumber}. Transportista: ${order.carrierName || "N/A"}, Guía: ${order.trackingNumber || "N/A"}.`
                        )
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        background: "#ffffff",
                        color: "#166534",
                        border: "1px solid #86efac",
                        padding: "0.65rem 1.2rem",
                        borderRadius: "8px",
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      💬 Consultar sobre el envío por WhatsApp
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* CANCELLED ORDER CARD */}
            {order.status === "CANCELADO" && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "2px solid #ef4444",
                  borderRadius: "16px",
                  padding: "1.75rem",
                  boxShadow: "0 4px 14px rgba(239, 68, 68, 0.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
                  <span style={{ fontSize: "1.6rem" }}>🛑</span>
                  <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#991b1b" }}>
                    Pedido Cancelado
                  </h3>
                </div>

                <p style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", color: "#7f1d1d", lineHeight: 1.6 }}>
                  Este pedido figura como cancelado. Si realizaste un pago previo o acordaste una devolución / reembolso de tus artículos, nuestro equipo te atenderá de inmediato por WhatsApp para coordinar los detalles.
                </p>

                {phone && (
                  <button
                    type="button"
                    onClick={() =>
                      openDirectWhatsApp(
                        `Hola TiendaDelki, deseo consultar sobre el estado de mi pedido cancelado #${order.orderNumber}.`
                      )
                    }
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "#25D366",
                      color: "#ffffff",
                      border: "none",
                      padding: "0.65rem 1.2rem",
                      borderRadius: "8px",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    💬 Contactar Atención por WhatsApp
                  </button>
                )}
              </div>
            )}

            {/* Items Summary Card */}
            <div
              style={{
                background: "var(--color-surface)",
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem" }}>
                Artículos del Pedido ({order.itemsCount})
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {order.items.map((it: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      paddingBottom: "0.6rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: "0.925rem",
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600 }}>{it.title}</span>
                      {it.variant && (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginLeft: "0.4rem" }}>
                          ({it.variant})
                        </span>
                      )}
                      <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", display: "block" }}>
                        Cantidad: {it.quantity}
                      </span>
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(it.price * it.quantity)}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontSize: "1.15rem", fontWeight: 800 }}>
                <span>Total de la Orden:</span>
                <span style={{ color: "var(--color-primary, #2563eb)" }}>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </div>
        )}
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
