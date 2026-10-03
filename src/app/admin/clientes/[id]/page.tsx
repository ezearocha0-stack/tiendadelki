"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface CustomerDetail {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  isActive: boolean;
  createdAt: string;
  totalSpent: number;
  totalOrders: number;
  completedOrders: number;
  addresses: Array<{
    id: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    streetAddress: string;
    sectorOrNeighborhood: string;
    city: string;
    provinceOrState: string;
    isDefault: boolean;
  }>;
  orders: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    total: number;
    subtotal: number;
    shippingCost: number;
    status: string;
    carrierName?: string | null;
    trackingNumber?: string | null;
    shippingMethod?: { name: string; price: number } | null;
    items: Array<{
      id: string;
      productTitle: string;
      variantTitle?: string | null;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDIENTE_DE_PAGO: { label: "Pendiente de Pago", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.15)" },
  PAGO_EN_REVISION: { label: "Pago en Revisión", color: "#a78bfa", bg: "rgba(139, 92, 246, 0.15)" },
  PAGADO: { label: "Pagado", color: "#34d399", bg: "rgba(16, 185, 129, 0.15)" },
  PREPARANDO: { label: "En Preparación", color: "#60a5fa", bg: "rgba(59, 130, 246, 0.15)" },
  ENVIADO: { label: "Enviado", color: "#22d3ee", bg: "rgba(6, 182, 212, 0.15)" },
  ENTREGADO: { label: "Entregado", color: "#2dd4bf", bg: "rgba(20, 184, 166, 0.15)" },
  COMPLETADO: { label: "Completado", color: "#10b981", bg: "rgba(5, 150, 105, 0.15)" },
  CANCELADO: { label: "Cancelado", color: "#f87171", bg: "rgba(239, 68, 68, 0.15)" },
};

export default function AdminClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDetail() {
      try {
        const res = await fetch(`/api/admin/customers/${customerId}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          setError(json.error?.message || "No se pudo cargar la información del cliente.");
          return;
        }

        setCustomer(json.data);
      } catch (err) {
        setError("Error de conexión al cargar la ficha del cliente.");
      } finally {
        setLoading(false);
      }
    }
    loadDetail();
  }, [customerId]);

  if (loading) {
    return <div className="container" style={{ paddingTop: "3rem", color: "var(--text-muted)" }}>Cargando ficha del cliente...</div>;
  }

  if (error || !customer) {
    return (
      <div className="container" style={{ paddingTop: "3rem" }}>
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "#f87171", marginBottom: "1rem" }}>{error || "Cliente no encontrado."}</p>
          <Link href="/admin/clientes" style={{ color: "var(--color-brand-accent)", fontWeight: "700" }}>
            ← Volver a Clientes
          </Link>
        </div>
      </div>
    );
  }

  const cleanPhone = (customer.whatsapp || customer.phone || "").replace(/[^0-9]/g, "");
  const waNumber = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Navegación y Encabezado */}
      <div style={{ marginBottom: "1.5rem" }}>
        <Link href="/admin/clientes" style={{ color: "var(--color-brand-accent)", fontWeight: "600", fontSize: "0.85rem" }}>
          ← Volver a Clientes
        </Link>
      </div>

      {/* Tarjeta de Información Principal */}
      <div
        className="card"
        style={{
          padding: "2rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        <div>
          <span className="badge" style={{ backgroundColor: "rgba(37, 99, 235, 0.15)", color: "#60a5fa", marginBottom: "0.5rem" }}>
            Cliente Registrado
          </span>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800", color: "var(--text-primary)" }}>
            {customer.name}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
            {customer.email}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.2rem" }}>
            Miembro desde el {new Date(customer.createdAt).toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {/* Acciones de Contacto */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {customer.phone && (
            <a
              href={`tel:${customer.phone}`}
              style={{
                padding: "0.55rem 1rem",
                backgroundColor: "var(--bg-surface-elevated)",
                color: "var(--text-primary)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              📞 Llamar: {customer.phone}
            </a>
          )}

          {customer.whatsapp && (
            <a
              href={`https://wa.me/${waNumber}?text=Hola%20${encodeURIComponent(customer.firstName)},%20te%20escribimos%20de%20TiendaDelki`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.55rem 1rem",
                backgroundColor: "#25D366",
                color: "#ffffff",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: "700",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span>💬</span>
              <span>Abrir WhatsApp</span>
            </a>
          )}
        </div>
      </div>

      {/* Métricas del Cliente */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Total Gastado</span>
          <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#34d399", marginTop: "0.35rem" }}>
            {formatCurrency(customer.totalSpent)}
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>En pedidos confirmados</span>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Pedidos Realizados</span>
          <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#60a5fa", marginTop: "0.35rem" }}>
            {customer.totalOrders}
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{customer.completedOrders} completados</span>
        </div>

        <div className="card" style={{ padding: "1.25rem" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Ticket Promedio</span>
          <div style={{ fontSize: "1.75rem", fontWeight: "800", color: "#fbbf24", marginTop: "0.35rem" }}>
            {customer.totalOrders > 0
              ? formatCurrency(customer.totalSpent / customer.totalOrders)
              : "RD$ 0.00"}
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Por cada orden</span>
        </div>
      </div>

      {/* Libreta de Direcciones del Cliente */}
      <div className="card" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)" }}>
          📍 Direcciones Guardadas ({customer.addresses.length})
        </h2>

        {customer.addresses.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>El cliente no ha guardado direcciones aún.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {customer.addresses.map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "1rem",
                  backgroundColor: "var(--bg-app)",
                  borderRadius: "var(--radius-md)",
                  border: a.isDefault ? "2px solid var(--color-brand-accent)" : "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: "700", fontSize: "0.85rem" }}>{a.label}</span>
                  {a.isDefault && (
                    <span style={{ fontSize: "0.7rem", color: "#60a5fa", fontWeight: "700" }}>● Predeterminada</span>
                  )}
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "600" }}>{a.recipientName}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{a.streetAddress}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{a.sectorOrNeighborhood}, {a.city}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{a.provinceOrState}</p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>📞 {a.recipientPhone}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial Completo de Pedidos */}
      <div className="card" style={{ padding: "1.75rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-primary)" }}>
          🛍️ Historial de Pedidos ({customer.orders.length})
        </h2>

        {customer.orders.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Este cliente aún no ha generado pedidos.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ backgroundColor: "var(--bg-surface-elevated)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>Pedido</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>Fecha</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>Artículos</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)" }}>Estado</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", textAlign: "right" }}>Total</th>
                  <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map((o) => {
                  const st = STATUS_LABELS[o.status] || { label: o.status, color: "var(--text-primary)", bg: "transparent" };
                  const totalUnits = o.items.reduce((sum, it) => sum + it.quantity, 0);

                  return (
                    <tr key={o.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.85rem 1rem", fontWeight: "700", color: "var(--text-primary)" }}>
                        #{o.orderNumber}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                        {new Date(o.createdAt).toLocaleDateString("es-DO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                        {totalUnits} {totalUnits === 1 ? "artículo" : "artículos"} ({o.items.length} productos)
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.2rem 0.55rem",
                            borderRadius: "var(--radius-full)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            backgroundColor: st.bg,
                            color: st.color,
                          }}
                        >
                          ● {st.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right", fontWeight: "800", color: "#34d399" }}>
                        {formatCurrency(o.total)}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                        <Link
                          href={`/admin/pedidos/${o.id}`}
                          style={{
                            padding: "0.35rem 0.75rem",
                            backgroundColor: "var(--bg-surface-elevated)",
                            color: "#60a5fa",
                            border: "1px solid var(--border-strong)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            textDecoration: "none",
                          }}
                        >
                          Ver Pedido ↗
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
