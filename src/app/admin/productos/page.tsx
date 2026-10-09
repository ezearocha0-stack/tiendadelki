"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  stock: number;
  price: number;
}

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string | null;
  isPrimary: boolean;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  basePrice: string | number;
  compareAtPrice: string | number | null;
  stock: number;
  hasVariants: boolean;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  isFeatured: boolean;
  isNew: boolean;
  category: Category;
  images: ProductImage[];
  variants: ProductVariant[];
}

export default function AdminProductsPage() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("search", search);
      if (selectedCategory) queryParams.set("categoryId", selectedCategory);
      if (selectedStatus) queryParams.set("status", selectedStatus);

      const [prodsRes, catsRes] = await Promise.all([
        fetch(`/api/products?${queryParams.toString()}`),
        fetch("/api/categories"),
      ]);

      if (prodsRes.ok) {
        const pData = await prodsRes.json();
        setProducts(pData.data);
      }
      if (catsRes.ok) {
        const cData = await catsRes.json();
        setCategories(cData.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedStatus]);

  function requestDeleteProduct(id: string, name: string) {
    setProductToDelete({ id, name });
  }

  async function handleConfirmDelete() {
    if (!productToDelete) return;
    const { id, name } = productToDelete;

    try {
      setActionLoading(id);
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== id));
        showToast(`Producto '${name}' eliminado/archivado exitosamente`, "success");
      } else {
        const err = await res.json();
        showToast(err.error?.message || "Error al eliminar el producto", "error");
      }
    } catch (e) {
      showToast("Error de conexión al eliminar el producto", "error");
    } finally {
      setActionLoading(null);
      setProductToDelete(null);
    }
  }

  return (
    <div style={{ maxWidth: "1400px", width: "100%", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* Encabezado */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.75rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", letterSpacing: "-0.025em", color: "var(--text-primary)", margin: "0 0 0.25rem 0" }}>
            Catálogo de Productos
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", margin: 0 }}>
            Administre su catálogo físico y digital, variantes, precios, imágenes y existencias.
          </p>
        </div>

        <Link
          href="/admin/productos/nuevo"
          className="btn btn-primary"
          style={{
            padding: "0.6rem 1.25rem",
            fontSize: "0.875rem",
          }}
        >
          <span>＋</span>
          <span>Nuevo Producto</span>
        </Link>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="card" style={{ marginBottom: "1.5rem", padding: "1.25rem 1.4rem" }}>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: "1 1 240px", minWidth: 0, maxWidth: "100%" }}>
            <input
              type="text"
              placeholder="Buscar por nombre, SKU o slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div style={{ flex: "1 1 180px", minWidth: 0, maxWidth: "100%" }}>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            >
              <option value="">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: "1 1 160px", minWidth: 0, maxWidth: "100%" }}>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                width: "100%",
                padding: "0.65rem 1rem",
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            >
              <option value="">Todos los Estados</option>
              <option value="PUBLISHED">Publicado</option>
              <option value="DRAFT">Borrador</option>
              <option value="ARCHIVED">Archivado</option>
            </select>
          </div>

          {(search || selectedCategory || selectedStatus) && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedCategory("");
                setSelectedStatus("");
              }}
              className="btn btn-secondary"
              style={{ padding: "0.65rem 1rem", fontSize: "0.85rem", flexShrink: 0 }}
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Productos */}
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
            <p style={{ fontWeight: 600 }}>Cargando catálogo...</p>
            <style jsx>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : products.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
            <p style={{ fontSize: "1.15rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
              No se encontraron productos con los criterios seleccionados.
            </p>
            <Link
              href="/admin/productos/nuevo"
              className="btn btn-primary"
              style={{ padding: "0.6rem 1.4rem" }}
            >
              Crear el primer producto
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="table-saas">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>Imagen</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock / Variantes</th>
                  <th>Estado</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const primaryImg = p.images.find((i) => i.isPrimary) || p.images[0];
                  const totalVariantStock = p.hasVariants
                    ? p.variants.reduce((acc, v) => acc + v.stock, 0)
                    : p.stock;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div
                          style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "var(--radius-md)",
                            overflow: "hidden",
                            backgroundColor: "var(--bg-app)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid var(--border-subtle)",
                          }}
                        >
                          {primaryImg ? (
                            <img
                              src={primaryImg.thumbnailUrl || primaryImg.url}
                              alt={primaryImg.altText || p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: "1.25rem" }}>📦</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{p.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-family-mono)", marginTop: "0.15rem" }}>
                          SKU: {p.sku || (p.hasVariants ? "Múltiple (Variantes)" : "N/A")}
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: "0.78rem" }}>
                          {p.category?.name || "Sin categoría"}
                        </span>
                      </td>

                      <td>
                        <div style={{ fontWeight: "800", color: "var(--text-primary)" }}>{formatCurrency(p.basePrice)}</div>
                        {p.compareAtPrice && (
                          <div style={{ fontSize: "0.78rem", textDecoration: "line-through", color: "var(--text-muted)" }}>
                            {formatCurrency(p.compareAtPrice)}
                          </div>
                        )}
                      </td>

                      <td>
                        {p.hasVariants ? (
                          <div>
                            <span className="badge badge-review" style={{ fontSize: "0.78rem" }}>
                              {p.variants.length} variantes
                            </span>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                              Total stock: <strong style={{ color: "var(--text-primary)" }}>{totalVariantStock}</strong>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span
                              className={`badge ${totalVariantStock > 5 ? "badge-success" : totalVariantStock > 0 ? "badge-warning" : "badge-danger"}`}
                              style={{ fontSize: "0.78rem" }}
                            >
                              {totalVariantStock > 0 ? `${totalVariantStock} en stock` : "Agotado"}
                            </span>
                          </div>
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            p.status === "PUBLISHED"
                              ? "badge-success"
                              : p.status === "DRAFT"
                              ? "badge-warning"
                              : "badge-neutral"
                          }`}
                          style={{ fontSize: "0.78rem" }}
                        >
                          {p.status === "PUBLISHED" ? "Publicado" : p.status === "DRAFT" ? "Borrador" : "Archivado"}
                        </span>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.45rem" }}>
                          <Link
                            href={`/admin/productos/${p.id}/editar`}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.8rem",
                            }}
                          >
                            Editar
                          </Link>

                          <button
                            onClick={() => requestDeleteProduct(p.id, p.name)}
                            disabled={actionLoading === p.id}
                            className="btn btn-danger"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.8rem",
                            }}
                          >
                            {actionLoading === p.id ? "..." : "Eliminar"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title="Eliminar o Archivar Producto"
        message={`¿Está seguro de que desea eliminar o archivar el producto '${productToDelete?.name}'?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={Boolean(actionLoading)}
        onConfirm={handleConfirmDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
