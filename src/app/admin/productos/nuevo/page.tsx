"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
}

interface UploadedImage {
  url: string;
  thumbnailUrl: string;
  storageKey: string;
  altText: string;
  isPrimary: boolean;
}

interface VariantRow {
  title: string;
  sku: string;
  attributes: Record<string, string>;
  price: number | "";
  stock: number;
  minStock: number;
}

interface CustomAttribute {
  name: string;
  options: string[];
  currentInput: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Datos Básicos
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [autoSlug, setAutoSlug] = useState(true);
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");

  // Precios y Flags
  const [basePrice, setBasePrice] = useState<number | "">("");
  const [compareAtPrice, setCompareAtPrice] = useState<number | "">("");
  const [costPrice, setCostPrice] = useState<number | "">("");
  const [status, setStatus] = useState<"PUBLISHED" | "DRAFT">("PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNew, setIsNew] = useState(true);

  // Producto Simple vs Variantes
  const [hasVariants, setHasVariants] = useState(false);
  const [simpleSku, setSimpleSku] = useState("");
  const [simpleStock, setSimpleStock] = useState<number>(10);
  const [simpleMinStock, setSimpleMinStock] = useState<number>(2);

  // Constructor de Atributos para Variantes Flexibles
  const [attributes, setAttributes] = useState<CustomAttribute[]>([
    { name: "Color", options: ["Negro", "Blanco"], currentInput: "" },
    { name: "Talla", options: ["S", "M", "L"], currentInput: "" },
  ]);
  const [variants, setVariants] = useState<VariantRow[]>([]);

  // Imágenes
  const [images, setImages] = useState<UploadedImage[]>([]);

  // SEO
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setCategories(data.data);
          setCategoryId(data.data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  // Generador de slug automático a partir del nombre
  function handleNameChange(val: string) {
    setName(val);
    if (autoSlug) {
      const generated = val
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      setSlug(generated);
    }
  }

  // Manejo de subida de imágenes
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");

        const res = await fetch("/api/uploads", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "Error al subir imagen");

        const isFirst = images.length === 0 && i === 0;
        setImages((prev) => [
          ...prev,
          {
            url: data.data.url,
            thumbnailUrl: data.data.thumbnailUrl,
            storageKey: data.data.storageKey,
            altText: name || "Foto de producto",
            isPrimary: isFirst,
          },
        ]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar imágenes");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function setPrimaryImage(index: number) {
    setImages((prev) =>
      prev.map((img, i) => ({
        ...img,
        isPrimary: i === index,
      }))
    );
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      // Si eliminamos la principal y quedan fotos, marcar la primera como principal
      if (filtered.length > 0 && !filtered.some((img) => img.isPrimary)) {
        filtered[0].isPrimary = true;
      }
      return filtered;
    });
  }

  // Generador de combinaciones cartesianas para variantes flexibles
  function generateVariantCombinations() {
    if (attributes.length === 0) return;

    // Producto cartesiano de las opciones
    function cartesian(arrays: string[][]): string[][] {
      return arrays.reduce(
        (a, b) => a.flatMap((d) => b.map((e) => [d, e].flat())),
        [[]] as string[][]
      );
    }

    const validAttributes = attributes.filter((a) => a.options.length > 0);
    if (validAttributes.length === 0) return;

    const combinations = cartesian(validAttributes.map((a) => a.options));
    const prefix = (slug || "PROD").toUpperCase().slice(0, 4);

    const generatedRows: VariantRow[] = combinations.map((combo, idx) => {
      const attrObj: Record<string, string> = {};
      validAttributes.forEach((attr, i) => {
        attrObj[attr.name] = combo[i];
      });

      const title = combo.join(" / ");
      const skuSuffix = combo.map((c) => c.slice(0, 3).toUpperCase()).join("-");
      const sku = `${prefix}-${skuSuffix}-${idx + 1}`;

      return {
        title,
        sku,
        attributes: attrObj,
        price: basePrice !== "" ? Number(basePrice) : "",
        stock: 5,
        minStock: 2,
      };
    });

    setVariants(generatedRows);
  }

  function addAttribute() {
    setAttributes((prev) => [...prev, { name: "", options: [], currentInput: "" }]);
  }

  function removeAttribute(index: number) {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  }

  function addOptionToAttribute(attrIndex: number) {
    const attr = attributes[attrIndex];
    if (!attr.currentInput.trim()) return;

    const newOptions = [...attr.options, attr.currentInput.trim()];
    setAttributes((prev) =>
      prev.map((a, i) => (i === attrIndex ? { ...a, options: newOptions, currentInput: "" } : a))
    );
  }

  function removeOptionFromAttribute(attrIndex: number, optionIndex: number) {
    setAttributes((prev) =>
      prev.map((a, i) =>
        i === attrIndex ? { ...a, options: a.options.filter((_, idx) => idx !== optionIndex) } : a
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!name || !slug || !categoryId || basePrice === "") {
        throw new Error("Por favor complete los campos obligatorios marcados con *");
      }

      const payload = {
        name,
        slug,
        categoryId,
        description,
        shortDescription,
        basePrice: Number(basePrice),
        compareAtPrice: compareAtPrice !== "" ? Number(compareAtPrice) : null,
        costPrice: costPrice !== "" ? Number(costPrice) : null,
        status,
        isFeatured,
        isNew,
        hasVariants,
        sku: hasVariants ? null : simpleSku || undefined,
        stock: hasVariants ? 0 : Number(simpleStock),
        minStock: hasVariants ? 2 : Number(simpleMinStock),
        customAttributes: hasVariants
          ? attributes.map((a) => ({ name: a.name, options: a.options }))
          : [],
        seoTitle: seoTitle || undefined,
        seoDescription: seoDescription || undefined,
        images: images.map((img, i) => ({
          url: img.url,
          thumbnailUrl: img.thumbnailUrl,
          storageKey: img.storageKey,
          altText: img.altText || name,
          sortOrder: i,
          isPrimary: img.isPrimary,
        })),
        variants: hasVariants
          ? variants.map((v) => ({
              sku: v.sku,
              title: v.title,
              attributes: v.attributes,
              price: v.price !== "" ? Number(v.price) : Number(basePrice),
              stock: Number(v.stock),
              minStock: Number(v.minStock),
              isActive: true,
            }))
          : [],
      };

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al crear el producto");
      }

      router.push("/admin/productos");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container" style={{ paddingTop: "2rem", paddingBottom: "5rem", maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <Link href="/admin/productos" style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "0.25rem", display: "inline-block" }}>
            ← Volver a Productos
          </Link>
          <h1 style={{ fontSize: "1.85rem", fontWeight: "800" }}>Nuevo Producto</h1>
        </div>
      </div>

      {error && (
        <div style={{ padding: "1rem", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "var(--radius-md)", color: "#f87171", marginBottom: "1.5rem" }}>
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* SECCIÓN 1: INFORMACIÓN BÁSICA */}
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
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ej. Camisa de Lino Manga Corta"
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
                  Slug (URL amigable) *
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => {
                    setAutoSlug(false);
                    setSlug(e.target.value);
                  }}
                  placeholder="camisa-de-lino-manga-corta"
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
                Descripción Corta (Resumen para listados)
              </label>
              <input
                type="text"
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="Prenda fresca 100% lino ideal para climas tropicales."
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
                placeholder="Detalles sobre materiales, cuidados, ajuste y diseño..."
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

        {/* SECCIÓN 2: PRECIOS Y ESTADO */}
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
                placeholder="1500.00"
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
                Precio Anterior / Oferta Tachada (RD$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value === "" ? "" : parseFloat(e.target.value))}
                placeholder="1950.00 (Opcional)"
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
              <span>Publicado (Visible en tienda)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="radio"
                name="status"
                value="DRAFT"
                checked={status === "DRAFT"}
                onChange={() => setStatus("DRAFT")}
              />
              <span>Borrador (Oculto)</span>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.9rem" }}>
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span>Producto Destacado</span>
            </label>
          </div>
        </div>

        {/* SECCIÓN 3: TIPO DE PRODUCTO & VARIANTES FLEXIBLES */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "700" }}>3. Inventario y Variantes</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Defina si es un producto simple o si posee variantes (talla, color, material, etc.)
              </p>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "600" }}>
              <input
                type="checkbox"
                checked={hasVariants}
                onChange={(e) => setHasVariants(e.target.checked)}
              />
              <span>¿Tiene Variantes?</span>
            </label>
          </div>

          {!hasVariants ? (
            /* Producto Simple */
            <div className="grid grid-cols-2" style={{ gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                  SKU (Código único de inventario)
                </label>
                <input
                  type="text"
                  value={simpleSku}
                  onChange={(e) => setSimpleSku(e.target.value.toUpperCase())}
                  placeholder="CAM-LINO-001"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={simpleStock}
                    onChange={(e) => setSimpleStock(parseInt(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                    Alerta Mínima
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={simpleMinStock}
                    onChange={(e) => setSimpleMinStock(parseInt(e.target.value) || 0)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--radius-md)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Constructor de Variantes Flexibles */
            <div>
              <div style={{ marginBottom: "1.5rem" }}>
                <h4 style={{ fontSize: "0.95rem", marginBottom: "0.75rem" }}>Atributos y Opciones</h4>

                {attributes.map((attr, attrIdx) => (
                  <div
                    key={attrIdx}
                    style={{
                      padding: "1rem",
                      backgroundColor: "var(--bg-app)",
                      borderRadius: "var(--radius-md)",
                      marginBottom: "0.75rem",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "0.75rem" }}>
                      <input
                        type="text"
                        placeholder="Nombre de atributo (ej. Color, Talla)"
                        value={attr.name}
                        onChange={(e) =>
                          setAttributes((prev) =>
                            prev.map((a, i) => (i === attrIdx ? { ...a, name: e.target.value } : a))
                          )
                        }
                        style={{
                          width: "200px",
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border-strong)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-primary)",
                          fontWeight: "600",
                        }}
                      />

                      <div style={{ display: "flex", gap: "0.5rem", flex: 1 }}>
                        <input
                          type="text"
                          placeholder="Agregar opción (ej. Negro) y presione Enter"
                          value={attr.currentInput}
                          onChange={(e) =>
                            setAttributes((prev) =>
                              prev.map((a, i) =>
                                i === attrIdx ? { ...a, currentInput: e.target.value } : a
                              )
                            )
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addOptionToAttribute(attrIdx);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: "0.5rem 0.75rem",
                            backgroundColor: "var(--bg-surface)",
                            border: "1px solid var(--border-strong)",
                            borderRadius: "var(--radius-sm)",
                            color: "var(--text-primary)",
                            fontSize: "0.9rem",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => addOptionToAttribute(attrIdx)}
                          style={{
                            padding: "0.5rem 0.85rem",
                            backgroundColor: "var(--bg-surface-elevated)",
                            color: "var(--text-primary)",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.85rem",
                          }}
                        >
                          ＋ Añadir
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeAttribute(attrIdx)}
                        style={{ color: "#f87171", background: "none", fontSize: "0.9rem" }}
                      >
                        ✕
                      </button>
                    </div>

                    {/* Etiquetas de opciones */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                      {attr.options.map((opt, optIdx) => (
                        <span
                          key={optIdx}
                          className="badge"
                          style={{
                            backgroundColor: "var(--bg-surface-elevated)",
                            color: "var(--text-primary)",
                            fontSize: "0.85rem",
                            padding: "0.25rem 0.6rem",
                          }}
                        >
                          {opt}
                          <button
                            type="button"
                            onClick={() => removeOptionFromAttribute(attrIdx, optIdx)}
                            style={{ marginLeft: "0.3rem", color: "#f87171", background: "none" }}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={addAttribute}
                    style={{
                      padding: "0.5rem 1rem",
                      backgroundColor: "var(--bg-surface-elevated)",
                      color: "var(--text-primary)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.85rem",
                    }}
                  >
                    ＋ Agregar otro atributo
                  </button>

                  <button
                    type="button"
                    onClick={generateVariantCombinations}
                    style={{
                      padding: "0.5rem 1.25rem",
                      backgroundColor: "var(--color-brand-accent)",
                      color: "#fff",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                    }}
                  >
                    ⚡ Generar Lista de Variantes
                  </button>
                </div>
              </div>

              {/* Matriz de Variantes Generadas */}
              {variants.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "0.6rem" }}>Variante</th>
                        <th style={{ padding: "0.6rem" }}>SKU</th>
                        <th style={{ padding: "0.6rem" }}>Precio (RD$)</th>
                        <th style={{ padding: "0.6rem" }}>Stock</th>
                        <th style={{ padding: "0.6rem" }}>Mínimo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                          <td style={{ padding: "0.6rem", fontWeight: "600" }}>{v.title}</td>
                          <td style={{ padding: "0.6rem" }}>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === idx ? { ...row, sku: e.target.value.toUpperCase() } : row
                                  )
                                )
                              }
                              style={{
                                width: "140px",
                                padding: "0.4rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                color: "var(--text-primary)",
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <input
                              type="number"
                              step="0.01"
                              value={v.price}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === idx
                                      ? {
                                          ...row,
                                          price:
                                            e.target.value === "" ? "" : parseFloat(e.target.value),
                                        }
                                      : row
                                  )
                                )
                              }
                              style={{
                                width: "100px",
                                padding: "0.4rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                color: "var(--text-primary)",
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <input
                              type="number"
                              min="0"
                              value={v.stock}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === idx
                                      ? { ...row, stock: parseInt(e.target.value) || 0 }
                                      : row
                                  )
                                )
                              }
                              style={{
                                width: "70px",
                                padding: "0.4rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                color: "var(--text-primary)",
                              }}
                            />
                          </td>
                          <td style={{ padding: "0.6rem" }}>
                            <input
                              type="number"
                              min="0"
                              value={v.minStock}
                              onChange={(e) =>
                                setVariants((prev) =>
                                  prev.map((row, i) =>
                                    i === idx
                                      ? { ...row, minStock: parseInt(e.target.value) || 0 }
                                      : row
                                  )
                                )
                              }
                              style={{
                                width: "70px",
                                padding: "0.4rem",
                                backgroundColor: "var(--bg-app)",
                                border: "1px solid var(--border-subtle)",
                                borderRadius: "4px",
                                color: "var(--text-primary)",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECCIÓN 4: GALERÍA DE IMÁGENES OPTIMIZADAS */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
            4. Fotografías del Producto
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>
            Las imágenes son optimizadas automáticamente a WebP de alta resolución y miniaturas compactas con Sharp.
          </p>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.25rem",
                backgroundColor: "var(--bg-surface-elevated)",
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "0.9rem",
              }}
            >
              <span>📷</span>
              <span>{uploading ? "Procesando imágenes con Sharp..." : "Seleccionar fotografías"}</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>

          {/* Galería de vistas previas */}
          {images.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {images.map((img, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    width: "120px",
                    height: "120px",
                    borderRadius: "var(--radius-md)",
                    overflow: "hidden",
                    border: img.isPrimary ? "2px solid #3b82f6" : "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-app)",
                  }}
                >
                  <img
                    src={img.thumbnailUrl || img.url}
                    alt={img.altText}
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
                      backgroundColor: "rgba(0, 0, 0, 0.75)",
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "4px",
                    }}
                  >
                    {!img.isPrimary && (
                      <button
                        type="button"
                        onClick={() => setPrimaryImage(idx)}
                        style={{ color: "#60a5fa", fontSize: "0.7rem", background: "none" }}
                      >
                        Principal
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      style={{ color: "#f87171", fontSize: "0.75rem", background: "none", marginLeft: "auto" }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN 5: METADATOS SEO */}
        <div className="card">
          <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "1.25rem" }}>5. Optimización SEO</h2>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem" }}>
                Título SEO
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Camisa de Lino - TiendaDelki Ropa"
                maxLength={150}
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
                Descripción SEO
              </label>
              <textarea
                rows={2}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                placeholder="Descripción para resultados en Google y previsualización en WhatsApp..."
                maxLength={250}
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

        {/* BOTÓN FINAL */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
          <Link
            href="/admin/productos"
            style={{
              padding: "0.85rem 1.5rem",
              backgroundColor: "var(--bg-surface-elevated)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-md)",
              fontWeight: "600",
            }}
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={submitting || uploading}
            style={{
              padding: "0.85rem 2rem",
              backgroundColor: "var(--color-brand-accent)",
              color: "#fff",
              borderRadius: "var(--radius-md)",
              fontWeight: "700",
              fontSize: "1rem",
              opacity: submitting ? 0.6 : 1,
              boxShadow: "var(--shadow-md)",
            }}
          >
            {submitting ? "Guardando..." : "Guardar Producto"}
          </button>
        </div>
      </form>
    </div>
  );
}
