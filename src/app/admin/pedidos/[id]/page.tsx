"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";

interface OrderDetailProps {
  params: Promise<{ id: string }>;
}

export default function AdminOrderDetailPage({ params }: OrderDetailProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const orderIdentifier = resolvedParams.id;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal states
  const [modalType, setModalType] = useState<
    "CONFIRM_PAYMENT" | "REJECT_PAYMENT" | "SET_SHIPPING" | "CANCEL" | null
  >(null);

  const [modalInput, setModalInput] = useState({
    notes: "",
    rejectionReason: "",
    carrierName: "Metro Pac",
    trackingNumber: "",
    trackingUrl: "",
  });

  useEffect(() => {
    fetchOrderDetail();
  }, [orderIdentifier]);

  async function fetchOrderDetail() {
    setLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderIdentifier}`);
      const json = await res.json();
      if (res.ok && json.success) {
        setOrder(json.data);
      } else {
        setActionError(json.error?.message || "No se pudo cargar el pedido.");
      }
    } catch (e) {
      setActionError("Error de conexión al cargar el pedido.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(
    targetStatus: string,
    extraData: Record<string, any> = {}
  ) {
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          ...extraData,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al actualizar el estado.");
      }

      setOrder(json.data);
      setActionMessage(json.message);
      setModalType(null);
    } catch (err: any) {
      setActionError(err.message || "Ocurrió un error.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
        Cargando información del pedido...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <h2>Pedido no encontrado</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
          {actionError || "El identificador del pedido no existe."}
        </p>
        <Link href="/admin/pedidos" style={{ color: "var(--color-brand-accent)", fontWeight: 600 }}>
          ← Volver al listado de pedidos
        </Link>
      </div>
    );
  }

  const shippingAddr =
    typeof order.shippingAddress === "string"
      ? JSON.parse(order.shippingAddress)
      : order.shippingAddress || {};

  function renderStatusBadge(status: string) {
    const map: Record<string, { label: string; bg: string; color: string; border?: string }> = {
      PENDIENTE_DE_PAGO: { label: "⏳ Pendiente de Pago", bg: "#fef3c7", color: "#b45309" },
      PAGO_EN_REVISION: { label: "⏱ Pago en Revisión", bg: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" },
      PAGADO: { label: "✓ Pagado y Aprobado", bg: "#dcfce7", color: "#15803d" },
      PREPARANDO: { label: "📦 En Preparación", bg: "#f3e8ff", color: "#6b21a8" },
      ENVIADO: { label: "🚚 Enviado / En Camino", bg: "#e0f2fe", color: "#0369a1" },
      ENTREGADO: { label: "🏠 Entregado", bg: "#ecfdf5", color: "#047857" },
      COMPLETADO: { label: "🎉 Completado", bg: "#f1f5f9", color: "#334155" },
      CANCELADO: { label: "✕ Cancelado", bg: "#fee2e2", color: "#b91c1c" },
    };

    const s = map[status] || { label: status, bg: "#eee", color: "#333" };
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          border: s.border || "none",
          padding: "0.35rem 0.85rem",
          borderRadius: "9999px",
          fontSize: "0.85rem",
          fontWeight: 700,
        }}
      >
        {s.label}
      </span>
    );
  }

  return (
    <div style={{ padding: "2rem 1.5rem", maxWidth: "1300px", width: "100%", margin: "0 auto" }}>
      {/* Top Breadcrumb & Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <Link
          href="/admin/pedidos"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            color: "var(--text-secondary)",
            textDecoration: "none",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          ← Volver a Pedidos
        </Link>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={fetchOrderDetail}
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              padding: "0.4rem 0.85rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            🔄 Recargar
          </button>
        </div>
      </div>

      {/* Alerts */}
      {actionMessage && (
        <div
          style={{
            background: "#ecfdf5",
            border: "1px solid #10b981",
            color: "#065f46",
            padding: "0.9rem 1.25rem",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ✓ {actionMessage}
        </div>
      )}

      {actionError && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #f87171",
            color: "#991b1b",
            padding: "0.9rem 1.25rem",
            borderRadius: "var(--radius-md)",
            marginBottom: "1.5rem",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          ⚠️ {actionError}
        </div>
      )}

      {/* Order Header Card with Dynamic Actions */}
      <div
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "1.5rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.35rem" }}>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              Pedido #{order.orderNumber}
            </h1>
            {renderStatusBadge(order.status)}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Registrado el {new Date(order.createdAt).toLocaleString("es-DO")}
          </div>
        </div>

        {/* Action Buttons Depending on Status */}
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {/* 1. Confirmar / Rechazar Pago */}
          {(order.status === "PENDIENTE_DE_PAGO" || order.status === "PAGO_EN_REVISION") && (
            <>
              <button
                type="button"
                onClick={() => setModalType("CONFIRM_PAYMENT")}
                style={{
                  backgroundColor: "#16a34a",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "0.6rem 1.1rem",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                ✓ Confirmar Pago
              </button>

              {order.status === "PAGO_EN_REVISION" && (
                <button
                  type="button"
                  onClick={() => setModalType("REJECT_PAYMENT")}
                  style={{
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    padding: "0.6rem 1.1rem",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    cursor: "pointer",
                  }}
                >
                  ✕ Rechazar Comprobante
                </button>
              )}
            </>
          )}

          {/* 2. Marcar Preparando */}
          {order.status === "PAGADO" && (
            <button
              type="button"
              onClick={() => handleStatusUpdate("PREPARANDO", { notes: "Iniciada preparación en almacén." })}
              disabled={actionLoading}
              style={{
                backgroundColor: "#7c3aed",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.6rem 1.1rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              📦 Marcar en Preparación
            </button>
          )}

          {/* 3. Despachar / Enviar con Tracking */}
          {order.status === "PREPARANDO" && (
            <button
              type="button"
              onClick={() => setModalType("SET_SHIPPING")}
              style={{
                backgroundColor: "#0284c7",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.6rem 1.1rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              🚚 Despachar / Agregar Guía
            </button>
          )}

          {/* 4. Marcar Entregado */}
          {order.status === "ENVIADO" && (
            <>
              <button
                type="button"
                onClick={() => setModalType("SET_SHIPPING")}
                style={{
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.6rem 1rem",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
              >
                ✏️ Editar Guía
              </button>

              <button
                type="button"
                onClick={() => handleStatusUpdate("ENTREGADO", { notes: "Paquete entregado al cliente." })}
                disabled={actionLoading}
                style={{
                  backgroundColor: "#059669",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  padding: "0.6rem 1.1rem",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  cursor: "pointer",
                }}
              >
                🏠 Marcar Entregado
              </button>
            </>
          )}

          {/* 5. Marcar Completado */}
          {order.status === "ENTREGADO" && (
            <button
              type="button"
              onClick={() => handleStatusUpdate("COMPLETADO", { notes: "Pedido finalizado y archivado." })}
              disabled={actionLoading}
              style={{
                backgroundColor: "#334155",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "0.6rem 1.1rem",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              🎉 Marcar Completado
            </button>
          )}

          {/* Cancelar (Si no está completado ni cancelado) */}
          {order.status !== "COMPLETADO" && order.status !== "CANCELADO" && (
            <button
              type="button"
              onClick={() => setModalType("CANCEL")}
              style={{
                backgroundColor: "transparent",
                color: "#dc2626",
                border: "1px solid #f87171",
                borderRadius: "var(--radius-md)",
                padding: "0.6rem 0.9rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
              }}
            >
              Cancelar Pedido
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Details */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2rem",
        }}
        className="order-detail-layout"
      >
        {/* Left Column: Products, Receipt & Audit History */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Products List Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem" }}>
              Productos en el Pedido ({order.items?.length || 0})
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {order.items?.map((item: any) => {
                const imgUrl = item.product?.images?.[0]?.thumbnailUrl || item.product?.images?.[0]?.url || "/logo.png";
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "60px 1fr auto",
                      gap: "1rem",
                      alignItems: "center",
                      paddingBottom: "1rem",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ width: "60px", height: "60px", borderRadius: "6px", overflow: "hidden", background: "#f1f5f9" }}>
                      <img src={imgUrl} alt={item.productTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.productTitle}</div>
                      {item.variantTitle && (
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                          Variante: {item.variantTitle}
                        </div>
                      )}
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        SKU: {item.sku} • Cant: {item.quantity} × {formatCurrency(Number(item.unitPrice))}
                      </div>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>
                      {formatCurrency(Number(item.totalPrice))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Envío ({order.shippingMethod?.name || "Estándar"})</span>
                <span style={{ fontWeight: 600, color: Number(order.shippingCost) === 0 ? "#16a34a" : "inherit" }}>
                  {Number(order.shippingCost) === 0 ? "GRATIS" : formatCurrency(Number(order.shippingCost))}
                </span>
              </div>
              <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0.5rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: "var(--color-brand-accent)" }}>{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          </div>

          {/* Proof of Payment Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem" }}>
              Comprobante de Pago Bancario
            </h2>

            {order.proofOfPaymentUrl ? (
              <div>
                <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>
                  <div style={{ width: "160px", height: "160px", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-subtle)", background: "#f8fafc" }}>
                    {order.proofOfPaymentUrl.endsWith(".pdf") ? (
                      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: "2.5rem" }}>📄</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700 }}>Archivo PDF</span>
                      </div>
                    ) : (
                      <img src={order.proofOfPaymentUrl} alt="Comprobante de pago" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: "220px" }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                      Subido el {order.proofUploadedAt ? new Date(order.proofUploadedAt).toLocaleString("es-DO") : "Fecha no registrada"}
                    </div>

                    <a
                      href={order.proofOfPaymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.4rem 0.85rem",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-app)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--color-brand-accent)",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        marginBottom: "1rem",
                      }}
                    >
                      🔍 Abrir comprobante a pantalla completa
                    </a>

                    {order.status === "PAGO_EN_REVISION" && (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setModalType("CONFIRM_PAYMENT")}
                          style={{
                            backgroundColor: "#16a34a",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.45rem 0.85rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✓ Aprobar Pago
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalType("REJECT_PAYMENT")}
                          style={{
                            backgroundColor: "#ef4444",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--radius-sm)",
                            padding: "0.45rem 0.85rem",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✕ Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {order.proofRejectionReason && (
                  <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.85rem" }}>
                    <strong>Motivo de rechazo registrado:</strong> {order.proofRejectionReason}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "1.5rem", background: "var(--bg-app)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                El cliente aún no ha subido ningún comprobante a la plataforma.
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1.25rem" }}>
              Línea de Tiempo y Auditoría de Estados
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {order.statusHistory?.map((entry: any) => (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    gap: "1rem",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-brand-accent)",
                      marginTop: "0.3rem",
                      flexShrink: 0,
                    }}
                  />

                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                        {entry.newStatus}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {new Date(entry.createdAt).toLocaleString("es-DO")}
                      </div>
                    </div>

                    {entry.notes && (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", marginTop: "0.2rem" }}>
                        {entry.notes}
                      </div>
                    )}

                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                      Responsable: {entry.user ? `${entry.user.firstName} ${entry.user.lastName} (${entry.user.role})` : "Cliente / Sistema"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Customer & Delivery Info */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Customer Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem" }}>
              Datos del Cliente
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Nombre:</span>
                <strong>{order.guestName}</strong>
              </div>

              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Teléfono:</span>
                <span>{order.guestPhone}</span>
              </div>

              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>WhatsApp:</span>
                <a
                  href={`https://wa.me/${order.guestWhatsapp?.replace(/[^0-9]/g, "")}?text=Hola%20${encodeURIComponent(order.guestName)},%20te%20escribimos%20de%20TiendaDelki%20sobre%20tu%20pedido%20%23${order.orderNumber}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#16a34a", fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
                >
                  💬 {order.guestWhatsapp} (Chatear)
                </a>
              </div>

              {order.guestEmail && (
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Correo:</span>
                  <span>{order.guestEmail}</span>
                </div>
              )}
            </div>
          </div>

          {/* Delivery Address Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem" }}>
              Dirección de Entrega
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.9rem" }}>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Dirección:</span>
                <span>{shippingAddr.streetAddress}</span>
              </div>

              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Sector / Barrio:</span>
                <span>{shippingAddr.sectorOrNeighborhood}</span>
              </div>

              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Ciudad y Provincia:</span>
                <span>{shippingAddr.city}, {shippingAddr.provinceOrState}</span>
              </div>

              {shippingAddr.deliveryNotes && (
                <div style={{ marginTop: "0.5rem", padding: "0.65rem", background: "var(--bg-app)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700 }}>
                    PUNTO DE REFERENCIA:
                  </span>
                  <span>{shippingAddr.deliveryNotes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shipping / Tracking Details Card */}
          <div
            style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 1rem" }}>
              Información de Envío y Despacho
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
              <div>
                <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Método:</span>
                <strong>{order.shippingMethod?.name || "Envío Estándar"}</strong>
              </div>

              {order.carrierName && (
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Transportista:</span>
                  <strong>{order.carrierName}</strong>
                </div>
              )}

              {order.trackingNumber && (
                <div>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.8rem" }}>Número de Guía:</span>
                  <strong style={{ letterSpacing: "1px", color: "var(--color-brand-accent)" }}>{order.trackingNumber}</strong>
                </div>
              )}

              {order.trackingUrl && (
                <div>
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--color-brand-accent)", fontWeight: 600, textDecoration: "underline", fontSize: "0.85rem" }}
                  >
                    🔗 Enlace de Seguimiento en Vivo
                  </a>
                </div>
              )}

              {order.shippedAt && (
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                  Despachado: {new Date(order.shippedAt).toLocaleString("es-DO")}
                </div>
              )}

              {order.customerNotes && (
                <div style={{ marginTop: "0.5rem", padding: "0.65rem", background: "var(--bg-app)", borderRadius: "6px" }}>
                  <span style={{ color: "var(--text-secondary)", display: "block", fontSize: "0.75rem", fontWeight: 700 }}>
                    NOTAS DEL CLIENTE:
                  </span>
                  <span>{order.customerNotes}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Modal Confirmar Pago */}
      {modalType === "CONFIRM_PAYMENT" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: "480px", width: "100%", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Confirmar y Aprobar Pago
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              ¿Has verificado que el depósito de <strong>{formatCurrency(Number(order.total))}</strong> está reflejado en la cuenta bancaria de la empresa?
            </p>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Nota interna de aprobación (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej. Verificado en Banco Popular, referencia #12345"
              value={modalInput.notes}
              onChange={(e) => setModalInput({ ...modalInput, notes: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", marginBottom: "1.5rem", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "transparent" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleStatusUpdate("PAGADO", { notes: modalInput.notes })}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", border: "none", background: "#16a34a", color: "#fff", fontWeight: 700 }}
              >
                {actionLoading ? "Confirmando..." : "Aprobar Pago"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal Rechazar Comprobante */}
      {modalType === "REJECT_PAYMENT" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: "480px", width: "100%", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#dc2626" }}>
              Rechazar Comprobante de Pago
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              El pedido regresará al estado <strong>PENDIENTE DE PAGO</strong> para que el cliente envíe un comprobante válido.
            </p>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Motivo del rechazo *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Ej. El monto no coincide con la orden / Foto ilegible / Transferencia no reflejada en cuenta..."
              value={modalInput.rejectionReason}
              onChange={(e) => setModalInput({ ...modalInput, rejectionReason: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", marginBottom: "1.5rem", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "transparent" }}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={actionLoading || !modalInput.rejectionReason.trim()}
                onClick={() => handleStatusUpdate("PENDIENTE_DE_PAGO", { rejectionReason: modalInput.rejectionReason })}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 700 }}
              >
                {actionLoading ? "Rechazando..." : "Confirmar Rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Modal Despachar / Enviar Pedido */}
      {modalType === "SET_SHIPPING" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: "500px", width: "100%", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Despachar Pedido y Registrar Guía
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.25rem" }}>
              Ingresa los datos de envío para que el cliente pueda rastrear su paquete.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Empresa de Transporte / Mensajería *
                </label>
                <select
                  value={modalInput.carrierName}
                  onChange={(e) => setModalInput({ ...modalInput, carrierName: e.target.value })}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "var(--bg-app)" }}
                >
                  <option value="Metro Pac">Metro Pac</option>
                  <option value="Caribe Tours">Caribe Tours</option>
                  <option value="BM Cargo">BM Cargo</option>
                  <option value="Vimenpaq">Vimenpaq</option>
                  <option value="Mensajería Privada Santo Domingo">Mensajería Privada Santo Domingo</option>
                  <option value="Otro">Otro Transportista</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Número de Guía / Tracking *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. MP-8492041"
                  value={modalInput.trackingNumber}
                  onChange={(e) => setModalInput({ ...modalInput, trackingNumber: e.target.value })}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Enlace de Rastreo Web (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://metropac.com.do/tracking?id=..."
                  value={modalInput.trackingUrl}
                  onChange={(e) => setModalInput({ ...modalInput, trackingUrl: e.target.value })}
                  style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", boxSizing: "border-box" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "transparent" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading || !modalInput.carrierName.trim() || !modalInput.trackingNumber.trim()}
                onClick={() =>
                  handleStatusUpdate("ENVIADO", {
                    carrierName: modalInput.carrierName,
                    trackingNumber: modalInput.trackingNumber,
                    trackingUrl: modalInput.trackingUrl || null,
                  })
                }
                style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", border: "none", background: "#0284c7", color: "#fff", fontWeight: 700 }}
              >
                {actionLoading ? "Registrando..." : "Guardar y Marcar Enviado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal Cancelar */}
      {modalType === "CANCEL" && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
        >
          <div style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", maxWidth: "480px", width: "100%", padding: "1.75rem" }}>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#dc2626" }}>
              Confirmar Cancelación del Pedido
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1rem" }}>
              Esta acción marcará el pedido como <strong>CANCELADO</strong>. Esta acción queda registrada en la bitácora.
            </p>

            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Motivo de la cancelación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Solicitado por el cliente / Falta de pago / etc."
              value={modalInput.notes}
              onChange={(e) => setModalInput({ ...modalInput, notes: e.target.value })}
              style={{ width: "100%", padding: "0.65rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", marginBottom: "1.5rem", boxSizing: "border-box" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setModalType(null)}
                style={{ padding: "0.6rem 1rem", borderRadius: "6px", border: "1px solid var(--border-subtle)", background: "transparent" }}
              >
                Volver
              </button>
              <button
                type="button"
                disabled={actionLoading || !modalInput.notes.trim()}
                onClick={() => handleStatusUpdate("CANCELADO", { notes: modalInput.notes })}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", border: "none", background: "#dc2626", color: "#fff", fontWeight: 700 }}
              >
                {actionLoading ? "Cancelando..." : "Confirmar Cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 900px) {
          .order-detail-layout {
            grid-template-columns: 1fr 380px !important;
          }
        }
      `}</style>
    </div>
  );
}
