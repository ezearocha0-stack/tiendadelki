"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmModal } from "@/components/ui/confirm-modal";

interface Category {
  id: string;
  name: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  attributes: Record<string, string>;
  price: string | number;
  stock: number;
  minStock: number;
  isActive: boolean;
}

interface ProductImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  altText: string | null;
  isPrimary: boolean;
  storageKey: string;
}

interface ProductDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  categoryId: string;
  basePrice: string | number;
  compareAtPrice: string | number | null;
  costPrice: string | number | null;
  sku: string | null;
  stock: number;
  minStock: number;
  hasVariants: boolean;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  isFeatured: boolean;
  isNew: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export default function AdminEditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<string | null>(null);
  const [imageToDelete, setImageToDelete] = useState<string | null>(null);
  const [isDeletingVariant, setIsDeletingVariant] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Formulario General
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [compareAtPrice, setCompareAtPrice] = useState<number | "">("");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT" | "ARCHIVED">("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(true);
  const [hasVariants, setHasVariants] = useState(false);
  const [simpleStock, setSimpleStock] = useState<number>(0);
  const [simpleSku, setSimpleSku] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  // Variantes e Imágenes
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);

  // Modal / Form para agregar nueva variante
  const [showAddVariantModal, setShowAddVariantModal] = useState(false);
  const [newVarTitle, setNewVarTitle] = useState("");
  const [newVarSku, setNewVarSku] = useState("");
  const [newVarStock, setNewVarStock] = useState(5);
  const [newVarPrice, setNewVarPrice] = useState<number | "">("");
  const [newVarAttrKey, setNewVarAttrKey] = useState("Talla");
  const [newVarAttrVal, setNewVarAttrVal] = useState("");

  const [uploadingImage, setUploadingImage] = useState(false);

  async function loadProduct() {
    try {
      setLoading(true);
      const [prodRes, catsRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch("/api/categories"),
      ]);

      if (!prodRes.ok) throw new Error("Producto no encontrado");

      const pData: { data: ProductDetail } = await prodRes.json();
      const cData = await catsRes.json();

      const p = pData.data;
      setName(p.name);
      setSlug(p.slug);
      setCategoryId(p.categoryId);
      setDescription(p.description || "");
      setShortDescription(p.shortDescription || "");
      setBasePrice(Number(p.basePrice));
      setCompareAtPrice(p.compareAtPrice ? Number(p.compareAtPrice) : "");
      setStatus(p.status);
      setIsFeatured(p.isFeatured);
      setIsNew(p.isNew);
      setHasVariants(p.hasVariants);
      setSimpleStock(p.stock);
      setSimpleSku(p.sku || "");
      setSeoTitle(p.seoTitle || "");
      setSeoDescription(p.seoDescription || "");
      setVariants(p.variants);
      setImages(p.images);

      if (cData.success) {
        setCategories(cData.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar producto");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function handleUpdateGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name,
        slug,
        categoryId,
        description,
        shortDescription,
        basePrice: Number(basePrice),
        compareAtPrice: compareAtPrice !== "" ? Number(compareAtPrice) : null,
        status,
        isFeatured,
        isNew,
        stock: hasVariants ? 0 : Number(simpleStock),
        sku: hasVariants ? null : simpleSku || null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      };

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Error al actualizar");

      setSuccessMsg("¡Producto actualizado exitosamente!");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    try {
      if (!newVarSku || !newVarTitle || !newVarAttrVal) {
        showToast("Por favor complete los campos de la variante", "warning");
        return;
      }

      const payload = {
        title: newVarTitle,
        sku: newVarSku.toUpperCase(),
        attributes: { [newVarAttrKey]: newVarAttrVal },
        price: newVarPrice !== "" ? Number(newVarPrice) : Number(basePrice),
        stock: Number(newVarStock),
        minStock: 2,
        isActive: true,
      };

      const res = await fetch(`/api/products/${id}/variants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Error al agregar variante");

      setVariants((prev) => [...prev, data.data]);
      setShowAddVariantModal(false);
      setNewVarTitle("");
      setNewVarSku("");
      setNewVarAttrVal("");
      setHasVariants(true);
      showToast("Variante agregada correctamente", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error al agregar variante", "error");
    }
  }

  function requestDeleteVariant(variantId: string) {
    setVariantToDelete(variantId);
  }

  async function handleConfirmDeleteVariant() {
    if (!variantToDelete) return;
    setIsDeletingVariant(true);

    try {
      const res = await fetch(`/api/products/${id}/variants/${variantToDelete}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error?.message || "Error al eliminar");
      }
      setVariants((prev) => prev.filter((v) => v.id !== variantToDelete));
      showToast("Variante eliminada exitosamente", "success");
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error al eliminar", "error");
    } finally {
      setIsDeletingVariant(false);
      setVariantToDelete(null);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");

        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Error al subir");

        // Asociar al producto
        const attachRes = await fetch(`/api/products/${id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: uploadData.data.url,
            thumbnailUrl: uploadData.data.thumbnailUrl,
            storageKey: uploadData.data.storageKey,
            altText: name,
            isPrimary: images.length === 0,
          }),
        });

        const attachData = await attachRes.json();
        if (attachRes.ok) {
          setImages((prev) => [...prev, attachData.data]);
        }
      }
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Error al procesar fotos", "error");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function handleSetPrimaryImage(imageId: string) {
    try {
      const res = await fetch(`/api/products/${id}/images/${imageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (res.ok) {
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            isPrimary: img.id === imageId,
          }))
        );
        showToast("Imagen principal actualizada", "success");
      }
    } catch (e) {
      console.error(e);
    }
  }

  function requestDeleteImage(imageId: string) {
    setImageToDelete(imageId);
  }

  async function handleConfirmDeleteImage() {
    if (!imageToDelete) return;
    setIsDeletingImage(true);

    try {
      const res = await fetch(`/api/products/${id}/images/${imageToDelete}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageToDelete));
        showToast("Imagen eliminada exitosamente", "success");
      } else {
        showToast("Error al eliminar imagen", "error");
      }
    } catch (e) {
      showToast("Error de conexión al eliminar imagen", "error");
    } finally {
      setIsDeletingImage(false);
      setImageToDelete(null);
    }
  }

  if (loading) {
    return <div className="container" style={{ paddingTop: "5rem", textAlign: "center" }}>Cargando producto...</div>;
  }

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "5rem", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <Link href="/admin/productos" style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "inline-block" }}>
            ← Volver a Productos
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800" }}>Editar: {name}</h1>
        </div>

        <span className="badge badge-success">
          {status === "PUBLISHED" ? "Publicado" : status === "DRAFT" ? "Borrador" : "Archivado"}
        </span>
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

      {/* FORMULARIO GENERAL */}
      <form onSubmit={handleUpdateGeneral} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem" }}>1. Información General</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Nombre del Producto *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                }}
              />
            </div>

            <div className="grid grid-cols-2">
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                  Slug (URL) *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                  Categoría *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Descripción Corta
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                maxLength={300}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Descripción Completa
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>
        </div>

        {/* PRECIOS Y ESTADO */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem" }}>2. Precios y Visibilidad</h2>

          <div className="grid grid-cols-2" style={{ gap: "1rem", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Precio de Venta (RD$) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "1rem",
                  fontWeight: "700",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Precio Anterior (RD$)
              </label>
              <input
                type="number"
                step="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-muted)",
                  fontSize: "1rem",
                }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="radio"
                name="status"
                value="PUBLISHED"
                checked={status === "PUBLISHED"}
                onChange={() => setStatus("PUBLISHED")}
              />
              <span>Publicado</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="radio"
                name="status"
                value="DRAFT"
                checked={status === "DRAFT"}
                onChange={() => setStatus("DRAFT")}
              />
              <span>Borrador</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span>Destacado</span>
            </label>
          </div>
        </div>

        {/* BOTÓN ACTUALIZAR DATOS PRINCIPALES */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: "0.75rem 1.75rem",
              backgroundColor: "var(--color-brand-accent)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              fontWeight: "700",
            }}
          >
            {submitting ? "Guardando..." : "Guardar Cambios Generales"}
          </button>
        </div>
      </form>

      {/* SECCIÓN 3: ADMINISTRACIÓN DE VARIANTES */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>3. Variantes del Producto</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              {variants.length > 0
                ? `${variants.length} variantes configuradas con control individual de existencias y precios.`
                : "Producto simple sin variantes de talla/color."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddVariantModal(true)}
            className="btn btn-sm btn-secondary"
          >
            ＋ Agregar Variante
          </button>
        </div>

        {/* Modal simple para agregar variante */}
        {showAddVariantModal && (
          <div
            style={{
              padding: "1.25rem",
              backgroundColor: "var(--bg-app)",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.5rem",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <h4 style={{ fontSize: "1rem", marginBottom: "1rem", fontWeight: 700, color: "var(--text-primary)" }}>Nueva Variante Flexible</h4>
            <form onSubmit={handleAddVariant} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 600 }}>
                    Título de la variante (ej. Azul Marino / L)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Azul / L"
                    value={newVarTitle}
                    onChange={(e) => setNewVarTitle(e.target.value)}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 600 }}>
                    SKU Único
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="CAM-AZUL-L"
                    value={newVarSku}
                    onChange={(e) => setNewVarSku(e.target.value.toUpperCase())}
                    style={{ width: "100%", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2" style={{ gap: "0.75rem" }}>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ width: "40%" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 600 }}>Atributo</label>
                    <input
                      type="text"
                      value={newVarAttrKey}
                      onChange={(e) => setNewVarAttrKey(e.target.value)}
                      placeholder="Color o Talla"
                      style={{ width: "100%", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div style={{ width: "60%" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 600 }}>Valor</label>
                    <input
                      type="text"
                      value={newVarAttrVal}
                      onChange={(e) => setNewVarAttrVal(e.target.value)}
                      placeholder="Azul"
                      style={{ width: "100%", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 600 }}>Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={newVarStock}
                      onChange={(e) => setNewVarStock(parseInt(e.target.value) || 0)}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.25rem", fontWeight: 600 }}>Precio (RD$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Heredar base"
                      value={newVarPrice}
                      onChange={(e) => setNewVarPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                      style={{ width: "100%", padding: "0.55rem 0.75rem", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)" }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setShowAddVariantModal(false)}
                  className="btn btn-sm btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-sm btn-primary"
                >
                  Guardar Variante
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Tabla de Variantes Existentes */}
        {variants.length > 0 && (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <table className="table-saas" style={{ width: "100%", minWidth: "560px" }}>
              <thead>
                <tr>
                  <th>Título</th>
                  <th>SKU</th>
                  <th>Precio</th>
                  <th>Stock Disponible</th>
                  <th style={{ textAlign: "right" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: "600" }}>{v.title}</td>
                    <td style={{ color: "var(--text-secondary)", fontFamily: "var(--font-family-mono)" }}>{v.sku}</td>
                    <td>{formatCurrency(v.price)}</td>
                    <td>
                      <span className={v.stock > 0 ? "badge badge-success" : "badge badge-danger"}>
                        {v.stock} unidades
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => requestDeleteVariant(v.id)}
                        className="btn btn-sm btn-danger"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECCIÓN 4: GALERÍA DE IMÁGENES */}
      <div className="card" style={{ marginTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>4. Fotografías</h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              Suba nuevas fotos para convertirlas a WebP optimizado o elija la imagen principal.
            </p>
          </div>

          <label
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--bg-surface-elevated)",
              border: "1px dashed var(--border-strong)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              color: "var(--text-primary)",
              fontWeight: "600",
              fontSize: "0.85rem",
            }}
          >
            <span>📷 {uploadingImage ? "Procesando con Sharp..." : "Subir más fotos"}</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              style={{ display: "none" }}
            />
          </label>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {images.map((img) => (
            <div
              key={img.id}
              style={{
                position: "relative",
                width: "130px",
                height: "130px",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                border: img.isPrimary ? "2px solid #3b82f6" : "1px solid var(--border-subtle)",
                backgroundColor: "var(--bg-app)",
              }}
            >
              <img
                src={img.thumbnailUrl || img.url}
                alt={img.altText || name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />

              {img.isPrimary && (
                <span
                  style={{
                    position: "absolute",
                    top: "4px",
                    left: "4px",
                    backgroundColor: "#2563eb",
                    color: "#fff",
                    fontSize: "0.65rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    fontWeight: "700",
                  }}
                >
                  Principal
                </span>
              )}

              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: "rgba(0, 0, 0, 0.8)",
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 6px",
                }}
              >
                {!img.isPrimary && (
                  <button
                    type="button"
                    onClick={() => handleSetPrimaryImage(img.id)}
                    style={{ color: "#60a5fa", fontSize: "0.75rem", background: "none" }}
                  >
                    Principal
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => requestDeleteImage(img.id)}
                  style={{ color: "#f87171", fontSize: "0.75rem", background: "none", marginLeft: "auto" }}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modales de Confirmación */}
      <ConfirmModal
        isOpen={Boolean(variantToDelete)}
        title="Eliminar Variante"
        message="¿Está seguro de que desea eliminar esta variante de producto? Esta acción no se puede deshacer."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isDeletingVariant}
        onConfirm={handleConfirmDeleteVariant}
        onCancel={() => setVariantToDelete(null)}
      />

      <ConfirmModal
        isOpen={Boolean(imageToDelete)}
        title="Eliminar Imagen"
        message="¿Desea eliminar permanentemente esta fotografía del producto y del servidor?"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isDestructive={true}
        isLoading={isDeletingImage}
        onConfirm={handleConfirmDeleteImage}
        onCancel={() => setImageToDelete(null)}
      />
    </div>
  );
}
