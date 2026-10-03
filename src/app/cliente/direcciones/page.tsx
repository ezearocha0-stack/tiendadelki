"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";

interface CustomerAddressItem {
  id: string;
  label: string;
  recipientName: string;
  recipientPhone: string;
  streetAddress: string;
  sectorOrNeighborhood: string;
  city: string;
  provinceOrState: string;
  postalCode?: string | null;
  deliveryNotes?: string | null;
  isDefault: boolean;
}

export default function ClienteDireccionesPage() {
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<CustomerAddressItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState({
    label: "Casa",
    recipientName: "",
    recipientPhone: "",
    streetAddress: "",
    sectorOrNeighborhood: "",
    city: "Santo Domingo",
    provinceOrState: "Distrito Nacional",
    postalCode: "",
    deliveryNotes: "",
    isDefault: false,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadAddresses() {
    try {
      const res = await fetch("/api/cliente/addresses");
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data || []);
      }
    } catch (e) {
      console.error("Error al cargar direcciones:", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAddresses();
  }, []);

  function handleOpenCreate() {
    setEditingId(null);
    setFormData({
      label: "Casa",
      recipientName: "",
      recipientPhone: "",
      streetAddress: "",
      sectorOrNeighborhood: "",
      city: "Santo Domingo",
      provinceOrState: "Distrito Nacional",
      postalCode: "",
      deliveryNotes: "",
      isDefault: addresses.length === 0,
    });
    setShowForm(true);
    setMsg(null);
  }

  function handleOpenEdit(addr: CustomerAddressItem) {
    setEditingId(addr.id);
    setFormData({
      label: addr.label,
      recipientName: addr.recipientName,
      recipientPhone: addr.recipientPhone,
      streetAddress: addr.streetAddress,
      sectorOrNeighborhood: addr.sectorOrNeighborhood,
      city: addr.city,
      provinceOrState: addr.provinceOrState,
      postalCode: addr.postalCode || "",
      deliveryNotes: addr.deliveryNotes || "",
      isDefault: addr.isDefault,
    });
    setShowForm(true);
    setMsg(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const url = editingId ? `/api/cliente/addresses/${editingId}` : "/api/cliente/addresses";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMsg({ type: "error", text: json.error?.message || "Error al guardar dirección." });
      } else {
        setMsg({ type: "success", text: editingId ? "Dirección actualizada." : "Dirección guardada." });
        setShowForm(false);
        loadAddresses();
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error de conexión al guardar la dirección." });
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(id: string) {
    setDeleteId(id);
  }

  async function handleConfirmDelete() {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/cliente/addresses/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Dirección eliminada correctamente", "success");
        loadAddresses();
      } else {
        showToast("Error al eliminar la dirección.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al eliminar la dirección.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const res = await fetch(`/api/cliente/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        showToast("Dirección predeterminada actualizada", "success");
        loadAddresses();
      } else {
        showToast("Error al actualizar la dirección predeterminada.", "error");
      }
    } catch (e) {
      showToast("Error de conexión al actualizar.", "error");
    }
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando tus direcciones...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", color: "var(--text-primary)" }}>
            📍 Libreta de Direcciones
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Administra tus lugares de entrega para agilizar tus compras en el checkout
          </p>
        </div>

        {!showForm && (
          <button
            onClick={handleOpenCreate}
            style={{
              padding: "0.6rem 1.15rem",
              backgroundColor: "var(--color-brand-accent)",
              color: "#ffffff",
              borderRadius: "var(--radius-md)",
              fontWeight: "700",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            + Agregar Nueva Dirección
          </button>
        )}
      </div>

      {msg && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "var(--radius-md)",
            fontSize: "0.85rem",
            backgroundColor: msg.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
            color: msg.type === "success" ? "#34d399" : "#f87171",
            border: `1px solid ${msg.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
          }}
        >
          {msg.text}
        </div>
      )}

      {/* Formulario de Creación / Edición */}
      {showForm && (
        <div className="card" style={{ padding: "1.75rem", border: "1px solid var(--border-strong)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700" }}>
              {editingId ? "Editar Dirección" : "Nueva Dirección de Entrega"}
            </h3>
            <button
              onClick={() => setShowForm(false)}
              style={{ background: "none", color: "var(--text-muted)", fontSize: "1.25rem", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 2fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Etiqueta
                </label>
                <input
                  type="text"
                  required
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder="Casa, Oficina..."
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Nombre de Destinatario *
                </label>
                <input
                  type="text"
                  required
                  value={formData.recipientName}
                  onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                  placeholder="Quién recibe el paquete"
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Teléfono de Contacto *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.recipientPhone}
                  onChange={(e) => setFormData({ ...formData, recipientPhone: e.target.value })}
                  placeholder="809-555-0100"
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Calle, Número y Referencia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.streetAddress}
                  onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
                  placeholder="Calle Principal #12, Apto 3B"
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Sector / Barrio *
                </label>
                <input
                  type="text"
                  required
                  value={formData.sectorOrNeighborhood}
                  onChange={(e) => setFormData({ ...formData, sectorOrNeighborhood: e.target.value })}
                  placeholder="Piantini, Naco..."
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Ciudad *
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Santo Domingo, Santiago..."
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                  Provincia *
                </label>
                <input
                  type="text"
                  required
                  value={formData.provinceOrState}
                  onChange={(e) => setFormData({ ...formData, provinceOrState: e.target.value })}
                  placeholder="Distrito Nacional, Santiago..."
                  style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                Instrucciones de Entrega (Opcional)
              </label>
              <input
                type="text"
                value={formData.deliveryNotes}
                onChange={(e) => setFormData({ ...formData, deliveryNotes: e.target.value })}
                placeholder="Frente al parque, portón blanco..."
                style={{ width: "100%", padding: "0.65rem", backgroundColor: "var(--bg-app)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
              />
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              />
              <span>Usar como mi dirección de entrega predeterminada</span>
            </label>

            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.65rem 1.25rem",
                  backgroundColor: "var(--color-brand-accent)",
                  color: "#ffffff",
                  borderRadius: "var(--radius-md)",
                  fontWeight: "700",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Guardando..." : "Guardar Dirección"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  padding: "0.65rem 1rem",
                  backgroundColor: "var(--bg-surface-elevated)",
                  color: "var(--text-secondary)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Direcciones */}
      {addresses.length === 0 && !showForm ? (
        <EmptyState
          icon="📍"
          title="No tienes direcciones guardadas todavía"
          description="Agrega tus lugares frecuentes de entrega para agilizar el checkout y recibir tus pedidos más rápido."
          actionLabel="+ Agregar mi primera dirección"
          onAction={handleOpenCreate}
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem" }}>
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className="card"
              style={{
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                backgroundColor: "var(--bg-surface)",
                border: addr.isDefault ? "2px solid var(--color-brand-accent)" : "1px solid var(--border-subtle)",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "800", color: "var(--text-primary)" }}>
                    {addr.label}
                  </span>
                  {addr.isDefault && (
                    <span
                      style={{
                        padding: "0.15rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                        backgroundColor: "rgba(37, 99, 235, 0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(37, 99, 235, 0.3)",
                      }}
                    >
                      Predeterminada
                    </span>
                  )}
                </div>

                <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "var(--text-primary)" }}>
                  {addr.recipientName}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
                  {addr.streetAddress}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {addr.sectorOrNeighborhood}, {addr.city}
                </p>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  {addr.provinceOrState}
                </p>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                  📞 {addr.recipientPhone}
                </p>
                {addr.deliveryNotes && (
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: "0.35rem" }}>
                    &quot;{addr.deliveryNotes}&quot;
                  </p>
                )}
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", paddingTop: "0.75rem", borderTop: "1px solid var(--border-subtle)" }}>
                {!addr.isDefault && (
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    style={{
                      fontSize: "0.75rem",
                      padding: "0.3rem 0.6rem",
                      backgroundColor: "transparent",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                    }}
                  >
                    Hacer predeterminada
                  </button>
                )}
                <button
                  onClick={() => handleOpenEdit(addr)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.6rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--text-primary)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Editar
                </button>
                <button
                  onClick={() => requestDelete(addr.id)}
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.3rem 0.6rem",
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    color: "#f87171",
                    border: "1px solid rgba(239, 68, 68, 0.25)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Confirmación para Eliminar Dirección */}
      <ConfirmModal
        isOpen={Boolean(deleteId)}
        title="Eliminar Dirección"
        message="¿Estás seguro de que deseas eliminar esta dirección de entrega? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
