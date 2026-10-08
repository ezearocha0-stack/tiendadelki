"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface OrderItem {
  id: string;
  orderNumber: string;
  guestName: string;
  guestPhone: string;
  guestWhatsapp: string;
  guestEmail: string | null;
  status: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  proofOfPaymentUrl: string | null;
  proofUploadedAt: string | null;
  carrierName: string | null;
  trackingNumber: string | null;
  createdAt: string;
  shippingAddress: any;
  shippingMethod?: {
    name: string;
    price: number;
  } | null;
  items?: any[];
}

interface Metrics {
  totalOrders: number;
  pendingPayment: number;
  underReview: number;
  paid: number;
  preparing: number;
  shipped: number;
  delivered: number;
  completed: number;
  canceled: number;
}

export default function AdminPedidosPage() {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalOrders: 0,
    pendingPayment: 0,
    underReview: 0,
    paid: 0,
    preparing: 0,
    shipped: 0,
    delivered: 0,
    completed: 0,
    canceled: 0,
  });

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [proofFilter, setProofFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStatus = urlParams.get("status");
      if (urlStatus) {
        setStatusFilter(urlStatus);
      }
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, proofFilter, page]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (proofFilter === "WITH_PROOF") params.set("hasProof", "true");
      if (proofFilter === "NO_PROOF") params.set("hasProof", "false");
      if (search.trim()) params.set("search", search.trim());
      params.set("page", page.toString());
      params.set("limit", "25");

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setOrders(json.data.orders);
        setMetrics(json.data.metrics);
        setTotalPages(json.data.pagination.totalPages || 1);
      }
    } catch (e) {
      console.error("Error fetching orders:", e);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "PENDIENTE_DE_PAGO":
        return <span className="badge badge-warning">⏳ Pendiente Pago</span>;
      case "PAGO_EN_REVISION":
        return <span className="badge badge-review">⏱ Pago en Revisión</span>;
      case "PAGADO":
        return <span className="badge badge-success">✓ Pagado</span>;
      case "PREPARANDO":
        return (
          <span
            style={{
              backgroundColor: "#f3e8ff",
              color: "#6b21a8",
              border: "1px solid #e9d5ff",
              padding: "0.25rem 0.65rem",
              borderRadius: "9999px",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            📦 En Preparación
          </span>
        );
      case "ENVIADO":
        return <span className="badge badge-info">🚚 En Camino</span>;
      case "ENTREGADO":
        return <span className="badge badge-success">🏠 Entregado</span>;
      case "COMPLETADO":
        return <span className="badge badge-neutral">🎉 Completado</span>;
      case "CANCELADO":
        return <span className="badge badge-danger">✕ Cancelado</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  }

  return (
    <div style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, letterSpacing: "-0.025em", margin: "0 0 0.25rem", color: "var(--text-primary)" }}>
            Gestión de Pedidos Online
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", margin: 0 }}>
            Control y seguimiento de compras en línea, validación de transferencias y despacho logístico.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="btn btn-secondary"
          style={{
            padding: "0.5rem 1rem",
            fontSize: "0.85rem",
          }}
        >
          🔄 Actualizar Lista
        </button>
      </div>

      {/* KPI Cards Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          onClick={() => { setStatusFilter("ALL"); setPage(1); }}
          className="card card-interactive"
          style={{
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            border: statusFilter === "ALL" ? "2px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
            backgroundColor: statusFilter === "ALL" ? "#ffffff" : "var(--bg-surface)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Total Pedidos
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, marginTop: "0.3rem", color: "var(--text-primary)" }}>
            {metrics.totalOrders}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("PAGO_EN_REVISION"); setPage(1); }}
          className="card card-interactive"
          style={{
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            backgroundColor: metrics.underReview > 0 ? "#fdf4ff" : "var(--bg-surface)",
            border: metrics.underReview > 0 ? "2px solid #8b5cf6" : statusFilter === "PAGO_EN_REVISION" ? "2px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#7c3aed", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <span>⏱</span>
            <span>Pago en Revisión</span>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#6d28d9", marginTop: "0.3rem" }}>
            {metrics.underReview}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("PENDIENTE_DE_PAGO"); setPage(1); }}
          className="card card-interactive"
          style={{
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            border: statusFilter === "PENDIENTE_DE_PAGO" ? "2px solid #d97706" : "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#b45309", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            ⏳ Pendientes Pago
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#92400e", marginTop: "0.3rem" }}>
            {metrics.pendingPayment}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("PREPARANDO"); setPage(1); }}
          className="card card-interactive"
          style={{
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            border: statusFilter === "PREPARANDO" ? "2px solid #9333ea" : "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#6b21a8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            📦 En Preparación
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#581c87", marginTop: "0.3rem" }}>
            {metrics.preparing}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("ENVIADO"); setPage(1); }}
          className="card card-interactive"
          style={{
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            border: statusFilter === "ENVIADO" ? "2px solid #0284c7" : "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#0369a1", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🚚 En Camino
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#075985", marginTop: "0.3rem" }}>
            {metrics.shipped}
          </div>
        </div>

        <div
          onClick={() => { setStatusFilter("COMPLETADO"); setPage(1); }}
          className="card card-interactive"
          style={{
            padding: "1.1rem 1.25rem",
            cursor: "pointer",
            border: statusFilter === "COMPLETADO" ? "2px solid #10b981" : "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "#047857", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            🎉 Completados
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#065f46", marginTop: "0.3rem" }}>
            {metrics.completed}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div
        className="card"
        style={{
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <input
              type="text"
              placeholder="Buscar por # de pedido (#TK-...), cliente, teléfono o email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-surface)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.65rem 1.4rem" }}
          >
            Buscar
          </button>

          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setPage(1);
                fetchOrders();
              }}
              className="btn btn-secondary"
              style={{ padding: "0.65rem 1rem" }}
            >
              Limpiar Filtro
            </button>
          )}
        </form>

        {/* Status Pill Tabs */}
        <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem" }}>
          {[
            { id: "ALL", label: "Todos" },
            { id: "PAGO_EN_REVISION", label: "⏱ Pago en Revisión" },
            { id: "PENDIENTE_DE_PAGO", label: "⏳ Pendientes" },
            { id: "PAGADO", label: "✓ Pagados" },
            { id: "PREPARANDO", label: "📦 En Preparación" },
            { id: "ENVIADO", label: "🚚 En Camino" },
            { id: "ENTREGADO", label: "🏠 Entregados" },
            { id: "COMPLETADO", label: "🎉 Completados" },
            { id: "CANCELADO", label: "✕ Cancelados" },
          ].map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                style={{
                  padding: "0.4rem 0.85rem",
                  borderRadius: "9999px",
                  fontSize: "0.8rem",
                  fontWeight: active ? 700 : 500,
                  cursor: "pointer",
                  border: active ? "1px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
                  backgroundColor: active ? "var(--color-brand-primary)" : "var(--bg-surface)",
                  color: active ? "#ffffff" : "var(--text-secondary)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="table-saas-container">
        {loading ? (
          <div style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-secondary)" }}>
            <div
              style={{
                display: "inline-block",
                width: "36px",
                height: "36px",
                border: "3px solid rgba(79, 70, 229, 0.2)",
                borderTopColor: "var(--color-brand-primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: "0.75rem",
              }}
            />
            <p style={{ fontWeight: 600 }}>Cargando pedidos de la base de datos...</p>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🛍️</div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.4rem", color: "var(--text-primary)" }}>
              No se encontraron pedidos
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: 0 }}>
              No hay pedidos que coincidan con los filtros aplicados.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Estado</th>
                  <th>Envío</th>
                  <th style={{ textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const addr = ord.shippingAddress as any;
                  return (
                    <tr key={ord.id}>
                      {/* Número */}
                      <td>
                        <Link
                          href={`/admin/pedidos/${ord.orderNumber}`}
                          style={{
                            fontWeight: 700,
                            color: "var(--color-brand-primary)",
                            textDecoration: "none",
                            display: "block",
                            fontFamily: "var(--font-family-mono)",
                          }}
                        >
                          #{ord.orderNumber}
                        </Link>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {ord.items?.length || 0} producto(s)
                        </span>
                      </td>

                      {/* Cliente */}
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>{ord.guestName}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "0.4rem", alignItems: "center", marginTop: "0.1rem" }}>
                          <span>{ord.guestPhone}</span>
                          <a
                            href={`https://wa.me/${ord.guestWhatsapp?.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--color-brand-whatsapp)", textDecoration: "none", fontWeight: 700 }}
                            title="Contactar por WhatsApp"
                          >
                            [WA]
                          </a>
                        </div>
                      </td>

                      {/* Fecha */}
                      <td style={{ color: "var(--text-secondary)", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                        {new Date(ord.createdAt).toLocaleDateString("es-DO", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Total */}
                      <td style={{ fontWeight: 800, color: "var(--text-primary)", whiteSpace: "nowrap" }}>
                        {formatCurrency(Number(ord.total))}
                      </td>

                      {/* Pago / Comprobante */}
                      <td>
                        {ord.proofOfPaymentUrl ? (
                          <a
                            href={ord.proofOfPaymentUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              backgroundColor: "#eff6ff",
                              color: "#1d4ed8",
                              padding: "0.2rem 0.55rem",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              textDecoration: "none",
                              border: "1px solid #bfdbfe",
                            }}
                          >
                            📎 Comprobante
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                            Sin comprobante
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td>
                        {getStatusBadge(ord.status)}
                      </td>

                      {/* Envío */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "var(--text-primary)" }}>
                          {ord.shippingMethod?.name || "Envío Estándar"}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {addr?.city || "San Fernando de Montecristi"}, {addr?.provinceOrState || ""}
                        </div>
                      </td>

                      {/* Acción */}
                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/pedidos/${ord.orderNumber}`}
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            display: "inline-flex",
                          }}
                        >
                          Gestionar →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-subtle)",
              fontSize: "0.875rem",
            }}
          >
            <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>
              Página {page} de {totalPages}
            </span>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn btn-secondary"
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.825rem",
                  opacity: page <= 1 ? 0.5 : 1,
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn btn-secondary"
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.825rem",
                  opacity: page >= totalPages ? 0.5 : 1,
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
