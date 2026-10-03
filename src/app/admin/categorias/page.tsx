"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  parent?: { id: string; name: string } | null;
  children?: Category[];
  _count?: { products: number };
}

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Formulario Crear / Editar
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadCategories() {
    try {
      setLoading(true);
      const res = await fetch("/api/categories?all=true");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  function handleNameChange(val: string) {
    setName(val);
    if (!isEditing) {
      const generated = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  }

  function startEdit(cat: Category) {
    setIsEditing(true);
    setEditId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setParentId(cat.parentId || "");
    setDescription(cat.description || "");
    setSortOrder(cat.sortOrder);
    setIsActive(cat.isActive);
    setError(null);
  }

  function cancelEdit() {
    setIsEditing(false);
    setEditId(null);
    setName("");
    setSlug("");
    setParentId("");
    setDescription("");
    setSortOrder(0);
    setIsActive(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name,
        slug,
        parentId: parentId || null,
        description: description || null,
        sortOrder: Number(sortOrder),
        isActive,
      };

      const url = isEditing && editId ? `/api/categories/${editId}` : "/api/categories";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al guardar categoría");
      }

      setSuccessMsg(isEditing ? "Categoría actualizada con éxito" : "Categoría creada con éxito");
      setTimeout(() => setSuccessMsg(null), 3000);
      cancelEdit();
      await loadCategories();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSaving(false);
    }
  }

  function requestDelete(cat: Category) {
    if (cat._count && cat._count.products > 0) {
      showToast(
        `No puede eliminar '${cat.name}' porque contiene ${cat._count.products} productos asociados.`,
        "warning"
      );
      return;
    }
    setCategoryToDelete(cat);
  }

  async function handleConfirmDelete() {
    if (!categoryToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/categories/${categoryToDelete.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message || "Error al eliminar");
      }
      setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
      showToast(`Categoría '${categoryToDelete.name}' eliminada correctamente`, "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error al eliminar categoría", "error");
    } finally {
      setIsDeleting(false);
      setCategoryToDelete(null);
    }
  }

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "5rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.85rem", fontWeight: "800" }}>Categorías de Catálogo</h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Organice sus productos en jerarquías principales y subcategorías
        </p>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-md)", color: "#f87171", marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "var(--radius-md)", color: "#34d399", marginBottom: "1.5rem" }}>
          ✅ {successMsg}
        </div>
      )}

      <div className="grid grid-cols-2" style={{ alignItems: "start", gap: "2rem" }}>
        {/* FORMULARIO DE CREAR / EDITAR */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem" }}>
            {isEditing ? `Editar: ${name}` : "Nueva Categoría"}
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Nombre de la Categoría *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Ropa Deportiva"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Slug (URL amigable) *
              </label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="ropa-deportiva"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Categoría Padre (Opcional)
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">(Ninguna - Es Categoría Principal)</option>
                {categories
                  .filter((c) => !isEditing || c.id !== editId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                  Orden de Visualización
                </label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-app)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div style={{ flex: 1, display: "flex", alignItems: "center", paddingTop: "1.25rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>Activa en Tienda</span>
                </label>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Descripción (Opcional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve reseña para la sección del catálogo..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    padding: "0.75rem 1.25rem",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--text-secondary)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "var(--color-brand-accent)",
                  color: "#fff",
                  borderRadius: "var(--radius-md)",
                  fontWeight: "700",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Guardando..." : isEditing ? "Actualizar" : "Crear Categoría"}
              </button>
            </div>
          </form>
        </div>

        {/* LISTADO JERÁRQUICO */}
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: "700" }}>Árbol de Categorías</h2>
            <span className="badge" style={{ backgroundColor: "var(--bg-surface-elevated)", color: "var(--text-secondary)" }}>
              {categories.length} registradas
            </span>
          </div>

          {loading ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
              Cargando categorías...
            </div>
          ) : (
            <div style={{ maxHeight: "600px", overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)", backgroundColor: "rgba(255, 255, 255, 0.02)" }}>
                    <th style={{ padding: "0.85rem 1.25rem" }}>Nombre / Slug</th>
                    <th style={{ padding: "0.85rem" }}>Productos</th>
                    <th style={{ padding: "0.85rem" }}>Estado</th>
                    <th style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => (
                    <tr key={cat.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "0.85rem 1.25rem" }}>
                        <div style={{ fontWeight: "600", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {cat.parentId && <span style={{ color: "var(--text-muted)" }}>↳</span>}
                          <span>{cat.name}</span>
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          /{cat.slug} {cat.parent && `(Padre: ${cat.parent.name})`}
                        </div>
                      </td>

                      <td style={{ padding: "0.85rem" }}>
                        <span className="badge" style={{ backgroundColor: "var(--bg-app)", color: "var(--text-secondary)" }}>
                          {cat._count?.products ?? 0} ítems
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem" }}>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: cat.isActive ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                            color: cat.isActive ? "#34d399" : "#f87171",
                          }}
                        >
                          {cat.isActive ? "Activa" : "Inactiva"}
                        </span>
                      </td>

                      <td style={{ padding: "0.85rem 1.25rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                          <button
                            type="button"
                            onClick={() => startEdit(cat)}
                            style={{
                              padding: "0.35rem 0.65rem",
                              backgroundColor: "var(--bg-surface-elevated)",
                              color: "#60a5fa",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                            }}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(cat)}
                            style={{
                              padding: "0.35rem 0.65rem",
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              color: "#f87171",
                              borderRadius: "4px",
                              fontSize: "0.8rem",
                            }}
                          >
                            Eliminar
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
      </div>

      <ConfirmModal
        isOpen={Boolean(categoryToDelete)}
        title="Eliminar Categoría"
        message={`¿Está seguro de eliminar la categoría '${categoryToDelete?.name}'?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCategoryToDelete(null)}
      />
    </div>
  );
}
