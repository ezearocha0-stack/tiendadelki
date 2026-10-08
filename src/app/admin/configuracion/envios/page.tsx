"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/formatters";

interface ShippingMethod {
  id: string;
  name: string;
  zoneDescription: string | null;
  price: number;
  freeShippingThreshold: number | null;
  estimatedDays: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  ordersCount: number;
}

export default function AdminShippingMethodsPage() {
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    name: "",
    zoneDescription: "",
    price: 0,
    freeShippingThreshold: "",
    estimatedDays: "",
    sortOrder: 0,
    isActive: true,
  });

  // Delete State
  const [deletingMethod, setDeletingMethod] = useState<ShippingMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchMethods();
  }, []);

  async function fetchMethods() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shipping-methods");
      const json = await res.json();
      if (res.ok && json.success) {
        setMethods(json.data);
      }
    } catch (e) {
      console.error("Error al cargar métodos de envío:", e);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function openCreateModal() {
    setEditingMethod(null);
    setFormData({
      name: "",
      zoneDescription: "",
      price: 0,
      freeShippingThreshold: "",
      estimatedDays: "",
      sortOrder: methods.length + 1,
      isActive: true,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  function openEditModal(method: ShippingMethod) {
    setEditingMethod(method);
    setFormData({
      name: method.name,
      zoneDescription: method.zoneDescription || "",
      price: method.price,
      freeShippingThreshold: method.freeShippingThreshold ? String(method.freeShippingThreshold) : "",
      estimatedDays: method.estimatedDays || "",
      sortOrder: method.sortOrder,
      isActive: method.isActive,
    });
    setFormError(null);
    setIsModalOpen(true);
  }

  async function handleSaveForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError("El nombre del método de envío es obligatorio.");
      return;
    }

    if (formData.price < 0) {
      setFormError("El precio no puede ser negativo.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        zoneDescription: formData.zoneDescription.trim() || null,
        price: Number(formData.price),
        freeShippingThreshold: formData.freeShippingThreshold.trim()
          ? Number(formData.freeShippingThreshold)
          : null,
        estimatedDays: formData.estimatedDays.trim() || null,
        sortOrder: Number(formData.sortOrder) || 0,
        isActive: formData.isActive,
      };

      const url = editingMethod
        ? `/api/admin/shipping-methods/${editingMethod.id}`
        : "/api/admin/shipping-methods";
      const method = editingMethod ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al guardar el método de envío.");
      }

      setIsModalOpen(false);
      showToast(editingMethod ? "Método de envío actualizado." : "Método de envío creado con éxito.");
      fetchMethods();
    } catch (err: any) {
      setFormError(err.message || "Ocurrió un error.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleActive(method: ShippingMethod) {
    try {
      const res = await fetch(`/api/admin/shipping-methods/${method.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !method.isActive }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(
          !method.isActive
            ? `Método "${method.name}" activado para checkout.`
            : `Método "${method.name}" desactivado.`
        );
        fetchMethods();
      }
    } catch (e) {
      console.error("Error al alternar estado:", e);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingMethod) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/admin/shipping-methods/${deletingMethod.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "No se pudo eliminar el método de envío.");
      }

      setDeletingMethod(null);
      showToast(json.message || "Método eliminado exitosamente.");
      fetchMethods();
    } catch (err: any) {
      setDeleteError(err.message || "Error al eliminar.");
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredMethods = methods.filter((m) => {
    if (filterTab === "ACTIVE") return m.isActive;
    if (filterTab === "INACTIVE") return !m.isActive;
    return true;
  });

  const activeCount = methods.filter((m) => m.isActive).length;
  const inactiveCount = methods.filter((m) => !m.isActive).length;

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Toast */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#10b981",
            color: "#ffffff",
            padding: "0.85rem 1.5rem",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "0.95rem",
            boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          ✓ {toastMessage}
        </div>
      )}

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <span style={{ fontSize: "1.75rem" }}>🚚</span>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
              Configuración de Envíos
            </h1>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Gestiona los métodos de entrega, zonas de cobertura, tarifas en RD$ y tiempos estimados para el checkout.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="btn btn-primary"
          style={{ padding: "0.65rem 1.35rem", fontSize: "0.9rem" }}
        >
          <span>＋</span>
          <span>Nuevo Método de Envío</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            Total Métodos Registrados
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", marginTop: "0.25rem" }}>
            {methods.length}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "#16a34a", fontWeight: 600 }}>
            Métodos Activos en Checkout
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#16a34a", marginTop: "0.25rem" }}>
            {activeCount}
          </div>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-lg)",
            padding: "1.25rem",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            Métodos Inactivos / Pausados
          </span>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            {inactiveCount}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setFilterTab("ALL")}
          style={{
            padding: "0.45rem 1rem",
            borderRadius: "9999px",
            border: filterTab === "ALL" ? "1px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
            background: filterTab === "ALL" ? "var(--color-brand-primary)" : "var(--bg-surface)",
            color: filterTab === "ALL" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: filterTab === "ALL" ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Todos ({methods.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("ACTIVE")}
          style={{
            padding: "0.45rem 1rem",
            borderRadius: "9999px",
            border: filterTab === "ACTIVE" ? "1px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
            background: filterTab === "ACTIVE" ? "var(--color-brand-primary)" : "var(--bg-surface)",
            color: filterTab === "ACTIVE" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: filterTab === "ACTIVE" ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Activos ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setFilterTab("INACTIVE")}
          style={{
            padding: "0.45rem 1rem",
            borderRadius: "9999px",
            border: filterTab === "INACTIVE" ? "1px solid var(--color-brand-primary)" : "1px solid var(--border-subtle)",
            background: filterTab === "INACTIVE" ? "var(--color-brand-primary)" : "var(--bg-surface)",
            color: filterTab === "INACTIVE" ? "#ffffff" : "var(--text-secondary)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            boxShadow: filterTab === "INACTIVE" ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          Inactivos ({inactiveCount})
        </button>
      </div>

      {/* Methods Table */}
      <div
        className="table-saas-container"
      >
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            Cargando métodos de envío...
          </div>
        ) : filteredMethods.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay métodos de envío en esta categoría.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table-saas">
              <thead>
                <tr>
                  <th>Método / Zona</th>
                  <th>Precio</th>
                  <th>Envío Gratis</th>
                  <th>Tiempo Estimado</th>
                  <th>Estado</th>
                  <th>Historial</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMethods.map((m) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{m.name}</div>
                      {m.zoneDescription && (
                        <div style={{ fontSize: "0.825rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                          {m.zoneDescription}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "1rem", fontWeight: 700 }}>
                      {m.price === 0 ? (
                        <span style={{ color: "#16a34a", background: "#dcfce7", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.85rem" }}>
                          GRATIS (RD$0)
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-primary)" }}>{formatCurrency(m.price)}</span>
                      )}
                    </td>

                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {m.freeShippingThreshold ? (
                        <span style={{ color: "#0284c7" }}>
                          Gratis sobre {formatCurrency(m.freeShippingThreshold)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-secondary)" }}>No aplica</span>
                      )}
                    </td>

                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {m.estimatedDays || "No especificado"}
                    </td>

                    <td style={{ padding: "1rem" }}>
                      <button
                        type="button"
                        onClick={() => handleToggleActive(m)}
                        title={m.isActive ? "Clic para desactivar" : "Clic para activar"}
                        style={{
                          background: m.isActive ? "#dcfce7" : "#fee2e2",
                          color: m.isActive ? "#166534" : "#991b1b",
                          border: `1px solid ${m.isActive ? "#86efac" : "#fca5a5"}`,
                          borderRadius: "9999px",
                          padding: "0.25rem 0.75rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: m.isActive ? "#16a34a" : "#dc2626" }} />
                        {m.isActive ? "Activo" : "Inactivo"}
                      </button>
                    </td>

                    <td style={{ padding: "1rem", fontSize: "0.825rem", color: "var(--text-secondary)" }}>
                      {m.ordersCount} {m.ordersCount === 1 ? "pedido" : "pedidos"}
                    </td>

                    <td style={{ padding: "1rem", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="btn btn-secondary btn-sm"
                        >
                          ✏️ Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setDeletingMethod(m);
                          }}
                          className="btn btn-danger btn-sm"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "540px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {editingMethod ? "Editar Método de Envío" : "Nuevo Método de Envío"}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="modal-close-btn"
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", borderRadius: "var(--radius-md)", padding: "0.75rem 1rem", marginBottom: "1rem", fontSize: "0.875rem" }}>
                ⚠️ {formError}
              </div>
            )}

            <form onSubmit={handleSaveForm} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label htmlFor="envio-name" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Nombre del Método *
                </label>
                <input
                  id="envio-name"
                  type="text"
                  required
                  placeholder="Ej. Retiro en tienda física, Venta local..."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label htmlFor="envio-zone" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Zona de Cobertura / Descripción
                </label>
                <textarea
                  id="envio-zone"
                  rows={2}
                  placeholder="Ej. Retiro en tienda física, San Fernando de Montecristi..."
                  value={formData.zoneDescription}
                  onChange={(e) => setFormData({ ...formData, zoneDescription: e.target.value })}
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label htmlFor="envio-price" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                    Tarifa (RD$) *
                  </label>
                  <input
                    id="envio-price"
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                    0 = Envío Gratis
                  </span>
                </div>

                <div>
                  <label htmlFor="envio-threshold" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                    Envío Gratis desde (RD$)
                  </label>
                  <input
                    id="envio-threshold"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Opcional"
                    value={formData.freeShippingThreshold}
                    onChange={(e) => setFormData({ ...formData, freeShippingThreshold: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                <div>
                  <label htmlFor="envio-days" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                    Tiempo Estimado de Entrega
                  </label>
                  <input
                    id="envio-days"
                    type="text"
                    placeholder="Ej. Mismo día, 24 a 48 horas..."
                    value={formData.estimatedDays}
                    onChange={(e) => setFormData({ ...formData, estimatedDays: e.target.value })}
                  />
                </div>

                <div>
                  <label htmlFor="envio-order" style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                    Orden
                  </label>
                  <input
                    id="envio-order"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.35rem", padding: "0.5rem 0" }}>
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--color-brand-primary)" }}
                />
                <label htmlFor="isActiveToggle" style={{ fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", color: "var(--text-primary)", margin: 0 }}>
                  Activar de inmediato para selección en el Checkout
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? "Guardando..." : editingMethod ? "Guardar Cambios" : "Crear Método"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE MODAL (Safe Deletion) */}
      {deletingMethod && (
        <div
          className="modal-backdrop"
          onClick={() => setDeletingMethod(null)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "460px", textAlign: "center" }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>
              {deletingMethod.ordersCount > 0 ? "🛡️" : "🗑️"}
            </div>

            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0 0 0.75rem", color: "var(--text-primary)" }}>
              {deletingMethod.ordersCount > 0
                ? "Método en uso en pedidos"
                : "¿Eliminar método de envío?"}
            </h3>

            {deletingMethod.ordersCount > 0 ? (
              <div>
                <p style={{ fontSize: "0.925rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 1.25rem" }}>
                  El método <strong>&quot;{deletingMethod.name}&quot;</strong> está vinculado a{" "}
                  <strong>{deletingMethod.ordersCount}</strong> pedidos registrados en la tienda.
                  <br />
                  <br />
                  Para proteger la integridad histórica de tus ventas, <strong>no puede ser eliminado físicamente</strong>. Puedes <strong>desactivarlo</strong> para que no esté disponible en nuevas compras.
                </p>

                {deleteError && (
                  <div style={{ background: "#fef2f2", color: "#991b1b", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem" }}>
                    {deleteError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setDeletingMethod(null)}
                    className="btn btn-secondary"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = deletingMethod;
                      setDeletingMethod(null);
                      if (target.isActive) handleToggleActive(target);
                    }}
                    className="btn"
                    style={{
                      backgroundColor: "#f59e0b",
                      color: "#ffffff",
                      border: "none",
                    }}
                  >
                    Desactivar Método
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.925rem", color: "var(--text-secondary)", margin: "0 0 1.25rem" }}>
                  ¿Estás seguro de que deseas eliminar permanentemente <strong>&quot;{deletingMethod.name}&quot;</strong>? Esta acción no se puede deshacer.
                </p>

                {deleteError && (
                  <div style={{ background: "#fef2f2", color: "#991b1b", padding: "0.75rem", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.85rem" }}>
                    {deleteError}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={() => setDeletingMethod(null)}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="btn btn-danger"
                  >
                    {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
