"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface CustomerItem {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  isActive: boolean;
  createdAt: string;
  ordersCount: number;
  totalSpent: number;
}

export default function AdminClientesPage() {
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/customers?${params.toString()}`);
      const json = await res.json();

      if (res.ok && json.success) {
        setCustomers(json.data.customers || []);
        setTotalPages(json.data.pagination.totalPages || 1);
        setTotalCount(json.data.pagination.total || 0);
      }
    } catch (e) {
      console.error("Error al cargar clientes:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCustomers();
  }, [page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchCustomers();
  }

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
      {/* Encabezado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "2rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", letterSpacing: "-0.02em" }}>
            👥 Directorio de Clientes
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.2rem" }}>
            Gestión de clientes registrados, frecuencia de compra e historial de pedidos.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span className="badge" style={{ backgroundColor: "rgba(37, 99, 235, 0.15)", color: "#60a5fa" }}>
            Total: {totalCount} clientes
          </span>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Buscar por nombre, email, teléfono o WhatsApp..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: "260px",
              padding: "0.65rem 1rem",
              backgroundColor: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
            }}
          />
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
                setTimeout(fetchCustomers, 10);
              }}
              className="btn btn-secondary"
              style={{ padding: "0.65rem 1rem" }}
            >
              Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Tabla de Clientes */}
      <div className="table-saas-container">
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
            Cargando clientes...
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3.5rem 1rem", color: "var(--text-muted)" }}>
            <p style={{ fontSize: "1.1rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
              No se encontraron clientes registrados
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {search ? "Intenta modificar los términos de búsqueda." : "Los clientes que creen cuenta aparecerán listados aquí."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-saas" style={{ width: "100%", textAlign: "left" }}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto</th>
                  <th>WhatsApp</th>
                  <th>Fecha Registro</th>
                  <th style={{ textAlign: "center" }}>Pedidos</th>
                  <th style={{ textAlign: "right" }}>Total Compras</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const cleanPhone = (c.whatsapp || c.phone || "").replace(/[^0-9]/g, "");
                  const waNumber = cleanPhone.length === 10 ? `1${cleanPhone}` : cleanPhone;

                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{c.name}</div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{c.email}</div>
                      </td>

                      <td>
                        {c.phone ? (
                          <a
                            href={`tel:${c.phone}`}
                            style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "0.85rem" }}
                          >
                            📞 {c.phone}
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                        )}
                      </td>

                      <td>
                        {c.whatsapp ? (
                          <a
                            href={`https://wa.me/${waNumber}?text=Hola%20${encodeURIComponent(c.firstName)},%20te%20escribimos%20de%20TiendaDelki`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              padding: "0.2rem 0.6rem",
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              borderRadius: "var(--radius-full)",
                              fontSize: "0.8rem",
                              fontWeight: "700",
                              textDecoration: "none",
                            }}
                          >
                            <span>💬</span>
                            <span>{c.whatsapp}</span>
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>—</span>
                        )}
                      </td>

                      <td style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                        {new Date(c.createdAt).toLocaleDateString("es-DO", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <span className={c.ordersCount > 0 ? "badge badge-info" : "badge badge-neutral"}>
                          {c.ordersCount}
                        </span>
                      </td>

                      <td style={{ textAlign: "right", fontWeight: "800", color: "var(--text-primary)" }}>
                        {formatCurrency(c.totalSpent)}
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <Link
                          href={`/admin/clientes/${c.id}`}
                          className="btn btn-sm btn-secondary"
                        >
                          Ver Historial →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border-subtle)",
              backgroundColor: "var(--bg-surface-elevated)",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
              Página {page} de {totalPages}
            </span>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                }}
              >
                Anterior
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                style={{
                  padding: "0.4rem 0.8rem",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-primary)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: "0.8rem",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
