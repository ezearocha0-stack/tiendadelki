"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface VariantItem {
  id: string;
  sku: string;
  title: string;
  stock: number;
  minStock: number;
  price: number | string;
  isActive: boolean;
  isLowStock: boolean;
  isOutOfStock: boolean;
}

interface ProductStockItem {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  hasVariants: boolean;
  category: { id: string; name: string };
  thumbnailUrl: string | null;
  totalStock: number;
  minStock: number;
  isLowStock: boolean;
  isOutOfStock: boolean;
  variants: VariantItem[];
}

interface MovementLogItem {
  id: string;
  movementType: string;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  product: { id: string; name: string; slug: string };
  variant: { id: string; title: string; sku: string } | null;
  user: { id: string; firstName: string; lastName: string; email: string | null } | null;
}

interface Category {
  id: string;
  name: string;
}

export default function AdminInventoryPage() {
  // Pestañas
  const [activeTab, setActiveTab] = useState<"MATRIZ" | "ALERTAS" | "HISTORIAL">("MATRIZ");

  // Datos
  const [items, setItems] = useState<ProductStockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [kpis, setKpis] = useState({
    totalProducts: 0,
    totalUnitsInStock: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filtros Matriz
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "NORMAL">("ALL");

  // Historial
  const [movements, setMovements] = useState<MovementLogItem[]>([]);
  const [movementTypeFilter, setMovementTypeFilter] = useState("");
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Modales
  const [activeModal, setActiveModal] = useState<"QUICK_SALE" | "ENTRY" | "ADJUSTMENT" | "RETURN" | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductStockItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  // Estado del Formulario del Modal
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formNotes, setFormNotes] = useState("");
  const [formAdjType, setFormAdjType] = useState<"DELTA" | "EXACT">("DELTA");
  const [formAdjValue, setFormAdjValue] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [modalMessage, setModalMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [confirmDestructive, setConfirmDestructive] = useState(false);

  // Búsqueda en Venta Rápida
  const [quickSaleSearch, setQuickSaleSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar estado general
  async function loadInventory() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (statusFilter !== "ALL") params.set("status", statusFilter);

      const [statusRes, catRes] = await Promise.all([
        fetch(`/api/inventory/status?${params.toString()}`),
        fetch("/api/categories"),
      ]);

      if (statusRes.ok) {
        const json = await statusRes.json();
        setItems(json.data || []);
        if (json.kpis) setKpis(json.kpis);
      }

      if (catRes.ok) {
        const cJson = await catRes.json();
        setCategories(cJson.data || []);
      }
    } catch (e) {
      console.error("Error al cargar inventario:", e);
    } finally {
      setLoading(false);
    }
  }

  // Cargar historial
  async function loadMovements() {
    try {
      setLoadingMovements(true);
      const params = new URLSearchParams();
      if (movementTypeFilter) params.set("movementType", movementTypeFilter);
      params.set("limit", "60");

      const res = await fetch(`/api/inventory?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setMovements(json.data || []);
      }
    } catch (e) {
      console.error("Error al cargar movimientos:", e);
    } finally {
      setLoadingMovements(false);
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const urlStatus = urlParams.get("status");
      if (urlStatus && (urlStatus === "LOW_STOCK" || urlStatus === "OUT_OF_STOCK" || urlStatus === "NORMAL")) {
        setStatusFilter(urlStatus);
      }
      if (urlParams.get("action") === "quick_sale") {
        setActiveModal("QUICK_SALE");
      }
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [search, selectedCategory, statusFilter]);

  useEffect(() => {
    if (activeTab === "HISTORIAL") {
      loadMovements();
    }
  }, [activeTab, movementTypeFilter]);

  // Enfocar buscador al abrir Venta Rápida
  useEffect(() => {
    if (activeModal === "QUICK_SALE") {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [activeModal]);

  // Abrir modal con producto preseleccionado
  function openModalForProduct(
    product: ProductStockItem,
    modalType: "QUICK_SALE" | "ENTRY" | "ADJUSTMENT" | "RETURN",
    variantId?: string
  ) {
    setSelectedProduct(product);
    if (product.hasVariants) {
      setSelectedVariantId(variantId || product.variants[0]?.id || "");
    } else {
      setSelectedVariantId("");
    }
    setFormQuantity(1);
    setFormNotes(
      modalType === "QUICK_SALE"
        ? "Venta física en mostrador"
        : modalType === "ENTRY"
        ? "Recepción de proveedor"
        : modalType === "RETURN"
        ? "Devolución de cliente"
        : ""
    );
    setFormAdjType("DELTA");
    setFormAdjValue(0);
    setConfirmDestructive(false);
    setModalMessage(null);
    setActiveModal(modalType);
  }

  // Abrir Venta Rápida Global
  function openQuickSaleGlobal() {
    setSelectedProduct(null);
    setSelectedVariantId("");
    setQuickSaleSearch("");
    setFormQuantity(1);
    setFormNotes("Venta física en mostrador");
    setModalMessage(null);
    setActiveModal("QUICK_SALE");
  }

  // Ejecutar Venta Física Rápida
  async function handleExecuteQuickSale(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!selectedProduct) {
      setModalMessage({ type: "error", text: "Seleccione un producto para vender." });
      return;
    }
    if (selectedProduct.hasVariants && !selectedVariantId) {
      setModalMessage({ type: "error", text: "Debe seleccionar la variante física." });
      return;
    }

    try {
      setSubmitting(true);
      setModalMessage(null);

      const res = await fetch("/api/inventory/quick-sale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProduct.id,
          variantId: selectedVariantId || undefined,
          quantity: formQuantity,
          notes: formNotes || "Venta física en mostrador",
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "No se pudo procesar la venta física.");
      }

      setModalMessage({
        type: "success",
        text: `⚡ ¡Venta física de ${formQuantity} unidad(es) procesada! Nuevo stock: ${json.data.newStock}`,
      });

      // Recargar datos y resetear para la siguiente venta rápida
      loadInventory();
      setFormQuantity(1);
    } catch (err: unknown) {
      setModalMessage({ type: "error", text: err instanceof Error ? err.message : "Error desconocido." });
    } finally {
      setSubmitting(false);
    }
  }

  // Ejecutar Entrada, Ajuste o Devolución
  async function handleExecuteMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProduct) return;

    if (activeModal === "ADJUSTMENT" && !formNotes.trim()) {
      setModalMessage({ type: "error", text: "Debe especificar el motivo del ajuste." });
      return;
    }

    // Validación de confirmación destructiva si reduce stock
    if (activeModal === "ADJUSTMENT") {
      let isNegative = false;
      const currentStock = selectedProduct.hasVariants
        ? selectedProduct.variants.find((v) => v.id === selectedVariantId)?.stock ?? 0
        : selectedProduct.totalStock;

      if (formAdjType === "DELTA" && formAdjValue < 0) isNegative = true;
      if (formAdjType === "EXACT" && formAdjValue < currentStock) isNegative = true;

      if (isNegative && !confirmDestructive) {
        setModalMessage({
          type: "error",
          text: "Este ajuste reduce existencias. Por favor, marque la casilla de confirmación antes de continuar.",
        });
        return;
      }
    }

    try {
      setSubmitting(true);
      setModalMessage(null);

      let payload: any = {
        productId: selectedProduct.id,
        variantId: selectedVariantId || undefined,
        notes: formNotes,
      };

      if (activeModal === "ENTRY") {
        payload.movementType = "ENTRADA";
        payload.quantity = formQuantity;
      } else if (activeModal === "RETURN") {
        payload.movementType = "DEVOLUCION";
        payload.quantity = formQuantity;
      } else if (activeModal === "ADJUSTMENT") {
        payload.movementType = "AJUSTE";
        payload.type = formAdjType;
        payload.value = formAdjValue;
      }

      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al registrar movimiento.");
      }

      setModalMessage({
        type: "success",
        text: `Operación completada con éxito. Stock anterior: ${json.data.previousStock} -> Nuevo stock: ${json.data.newStock}`,
      });

      loadInventory();
      setTimeout(() => {
        setActiveModal(null);
      }, 1500);
    } catch (err: unknown) {
      setModalMessage({ type: "error", text: err instanceof Error ? err.message : "Error inesperado." });
    } finally {
      setSubmitting(false);
    }
  }

  // Filtrado de productos para el buscador de Venta Rápida
  const quickSaleFilteredProducts = items.filter((p) => {
    if (!quickSaleSearch) return true;
    const term = quickSaleSearch.toLowerCase();
    if (p.name.toLowerCase().includes(term)) return true;
    if (p.sku && p.sku.toLowerCase().includes(term)) return true;
    if (p.variants.some((v) => v.title.toLowerCase().includes(term) || v.sku.toLowerCase().includes(term))) return true;
    return false;
  });

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Encabezado Principal */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "2rem" }}>📦</span>
            <div>
              <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                Control de Inventario y Operativa
              </h1>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}>
                Gestión en tiempo real, trazabilidad de movimientos y venta física ultrarrápida.
              </p>
            </div>
          </div>
        </div>

        {/* Botón de Acción Principal: Venta Física Rápida */}
        <button
          onClick={openQuickSaleGlobal}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.85rem 1.6rem",
            backgroundColor: "#10b981",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-lg)",
            fontWeight: "800",
            fontSize: "1.05rem",
            cursor: "pointer",
            boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
            transition: "all 0.2s ease",
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <span style={{ fontSize: "1.25rem" }}>⚡</span>
          <span>VENDIDO FÍSICAMENTE</span>
        </button>
      </div>

      {/* Tarjetas KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div className="card card-interactive" style={{ padding: "1.25rem 1.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total Productos
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#eef2ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #c7d2fe",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="7"></rect>
                <rect x="14" y="3" width="7" height="7"></rect>
                <rect x="14" y="14" width="7" height="7"></rect>
                <rect x="3" y="14" width="7" height="7"></rect>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            {kpis.totalProducts}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Artículos en catálogo activo
          </div>
        </div>

        <div className="card card-interactive" style={{ padding: "1.25rem 1.4rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Unidades en Stock
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #bfdbfe",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#1d4ed8", letterSpacing: "-0.02em" }}>
            {kpis.totalUnitsInStock}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Disponibilidad física total
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab("MATRIZ");
            setStatusFilter("LOW_STOCK");
          }}
          className="card card-interactive"
          style={{
            padding: "1.25rem 1.4rem",
            cursor: "pointer",
            border: statusFilter === "LOW_STOCK" ? "2px solid #f59e0b" : "1px solid var(--border-subtle)",
            backgroundColor: statusFilter === "LOW_STOCK" ? "#fffbeb" : "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#b45309", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Stock Bajo
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#fffbeb",
                color: "#d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #fde68a",
              }}
            >
              ⚠️
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#b45309", letterSpacing: "-0.02em" }}>
            {kpis.lowStockCount}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            Requiere reposición urgente
          </div>
        </div>

        <div
          onClick={() => {
            setActiveTab("MATRIZ");
            setStatusFilter("OUT_OF_STOCK");
          }}
          className="card card-interactive"
          style={{
            padding: "1.25rem 1.4rem",
            cursor: "pointer",
            border: statusFilter === "OUT_OF_STOCK" ? "2px solid #ef4444" : "1px solid var(--border-subtle)",
            backgroundColor: statusFilter === "OUT_OF_STOCK" ? "#fef2f2" : "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.72rem", color: "#991b1b", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Agotados
            </span>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid #fecaca",
              }}
            >
              🛑
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#dc2626", letterSpacing: "-0.02em" }}>
            {kpis.outOfStockCount}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
            0 unidades en existencia
          </div>
        </div>
      </div>

      {/* Barra de Pestañas */}
      <div
        className="scrollbar-none"
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "1.5rem",
          overflowX: "auto",
          whiteSpace: "nowrap",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <button
          onClick={() => setActiveTab("MATRIZ")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            borderBottom: activeTab === "MATRIZ" ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
            backgroundColor: "transparent",
            color: activeTab === "MATRIZ" ? "var(--color-brand-primary)" : "var(--text-secondary)",
            fontWeight: activeTab === "MATRIZ" ? "700" : "500",
            fontSize: "0.95rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          📊 Matriz de Stock ({items.length})
        </button>

        <button
          onClick={() => {
            setActiveTab("ALERTAS");
            setStatusFilter("ALL");
          }}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            borderBottom: activeTab === "ALERTAS" ? "2px solid #f59e0b" : "2px solid transparent",
            backgroundColor: "transparent",
            color: activeTab === "ALERTAS" ? "#b45309" : "var(--text-secondary)",
            fontWeight: activeTab === "ALERTAS" ? "700" : "500",
            fontSize: "0.95rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          ⚠️ Alertas de Reposición ({kpis.lowStockCount + kpis.outOfStockCount})
        </button>

        <button
          onClick={() => setActiveTab("HISTORIAL")}
          style={{
            padding: "0.75rem 1.25rem",
            border: "none",
            borderBottom: activeTab === "HISTORIAL" ? "2px solid var(--color-brand-primary)" : "2px solid transparent",
            backgroundColor: "transparent",
            color: activeTab === "HISTORIAL" ? "var(--color-brand-primary)" : "var(--text-secondary)",
            fontWeight: activeTab === "HISTORIAL" ? "700" : "500",
            fontSize: "0.95rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          📜 Historial de Movimientos
        </button>
      </div>

      {/* CONTENIDO PESTAÑA 1: MATRIZ DE STOCK */}
      {(activeTab === "MATRIZ" || activeTab === "ALERTAS") && (
        <div>
          {/* Filtros */}
          <div
            className="card"
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              padding: "1rem 1.25rem",
            }}
          >
            <input
              type="text"
              placeholder="Buscar por producto, variante o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: "1 1 240px",
                minWidth: 0,
                maxWidth: "100%",
                padding: "0.6rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-app)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: "0.6rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-app)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
                flex: "1 1 180px",
                minWidth: 0,
                maxWidth: "100%",
              }}
            >
              <option value="">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {activeTab === "MATRIZ" && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                style={{
                  padding: "0.6rem 1rem",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-strong)",
                  backgroundColor: "var(--bg-app)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                  flex: "1 1 180px",
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              >
                <option value="ALL">Todos los Estados</option>
                <option value="NORMAL">Stock Normal</option>
                <option value="LOW_STOCK">Stock Bajo</option>
                <option value="OUT_OF_STOCK">Agotados</option>
              </select>
            )}

            {(search || selectedCategory || statusFilter !== "ALL") && (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("");
                  setStatusFilter("ALL");
                }}
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
              >
                Limpiar Filtros
              </button>
            )}
          </div>

          {/* Tabla de Matriz de Stock */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
              Cargando matriz de inventario...
            </div>
          ) : items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
              <p style={{ color: "var(--text-secondary)", fontWeight: "600" }}>
                No se encontraron artículos con los filtros aplicados.
              </p>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border-subtle)" }}>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>PRODUCTO / VARIANTE</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>SKU</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>CATEGORÍA</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>STOCK ACTUAL</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>STOCK MÍN</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>ESTADO</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "right" }}>ACCIONES RÁPIDAS</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((p) => {
                    if (p.hasVariants) {
                      return p.variants.map((v, idx) => (
                        <tr
                          key={`${p.id}-${v.id}`}
                          style={{
                            borderBottom: "1px solid var(--border-subtle)",
                            backgroundColor: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                          }}
                        >
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                              {idx === 0 && p.thumbnailUrl ? (
                                <img
                                  src={p.thumbnailUrl}
                                  alt={p.name}
                                  style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                                />
                              ) : (
                                <div style={{ width: "36px" }} />
                              )}
                              <div>
                                <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>
                                  {idx === 0 ? p.name : <span style={{ color: "var(--text-muted)", fontWeight: "400" }}>↳</span>}
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#60a5fa", fontWeight: "600" }}>
                                  {v.title}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                            {v.sku}
                          </td>

                          <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                            {idx === 0 ? p.category.name : ""}
                          </td>

                          <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                            <span
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: "800",
                                color: v.isOutOfStock ? "#ef4444" : v.isLowStock ? "#f59e0b" : "#10b981",
                              }}
                            >
                              {v.stock}
                            </span>
                          </td>

                          <td style={{ padding: "0.85rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                            {v.minStock}
                          </td>

                          <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                            {v.isOutOfStock ? (
                              <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: "0.75rem", fontWeight: "700" }}>
                                AGOTADO
                              </span>
                            ) : v.isLowStock ? (
                              <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: "0.75rem", fontWeight: "700" }}>
                                STOCK BAJO
                              </span>
                            ) : (
                              <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.75rem", fontWeight: "700" }}>
                                DISPONIBLE
                              </span>
                            )}
                          </td>

                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                              <button
                                onClick={() => openModalForProduct(p, "QUICK_SALE", v.id)}
                                title="Vendido Físicamente"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                                  color: "#34d399",
                                  border: "1px solid rgba(16, 185, 129, 0.3)",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "700",
                                  fontSize: "0.8rem",
                                }}
                              >
                                ⚡ Venta
                              </button>

                              <button
                                onClick={() => openModalForProduct(p, "ENTRY", v.id)}
                                title="Entrada de mercancía"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  backgroundColor: "rgba(59, 130, 246, 0.15)",
                                  color: "#60a5fa",
                                  border: "1px solid rgba(59, 130, 246, 0.3)",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "0.8rem",
                                }}
                              >
                                📥 Entrada
                              </button>

                              <button
                                onClick={() => openModalForProduct(p, "ADJUSTMENT", v.id)}
                                title="Ajuste manual de auditoría"
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(245, 158, 11, 0.3)",
                                  borderRadius: "4px",
                                  cursor: "pointer",
                                  fontWeight: "600",
                                  fontSize: "0.8rem",
                                }}
                              >
                                ⚖️ Ajuste
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    }

                    // Producto Simple
                    return (
                      <tr key={p.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.85rem 1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {p.thumbnailUrl ? (
                              <img
                                src={p.thumbnailUrl}
                                alt={p.name}
                                style={{ width: "36px", height: "36px", borderRadius: "6px", objectFit: "cover" }}
                              />
                            ) : (
                              <div style={{ width: "36px", height: "36px", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                📦
                              </div>
                            )}
                            <div>
                              <div style={{ fontWeight: "700", color: "var(--text-primary)" }}>{p.name}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Producto Simple</div>
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", color: "var(--text-secondary)" }}>
                          {p.sku || "-"}
                        </td>

                        <td style={{ padding: "0.85rem 1rem", color: "var(--text-secondary)" }}>
                          {p.category.name}
                        </td>

                        <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                          <span
                            style={{
                              fontSize: "1.1rem",
                              fontWeight: "800",
                              color: p.isOutOfStock ? "#ef4444" : p.isLowStock ? "#f59e0b" : "#10b981",
                            }}
                          >
                            {p.totalStock}
                          </span>
                        </td>

                        <td style={{ padding: "0.85rem 1rem", textAlign: "center", color: "var(--text-muted)" }}>
                          {p.minStock}
                        </td>

                        <td style={{ padding: "0.85rem 1rem", textAlign: "center" }}>
                          {p.isOutOfStock ? (
                            <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(239, 68, 68, 0.15)", color: "#f87171", fontSize: "0.75rem", fontWeight: "700" }}>
                              AGOTADO
                            </span>
                          ) : p.isLowStock ? (
                            <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: "0.75rem", fontWeight: "700" }}>
                              STOCK BAJO
                            </span>
                          ) : (
                            <span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.75rem", fontWeight: "700" }}>
                              DISPONIBLE
                            </span>
                          )}
                        </td>

                        <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                          <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                            <button
                              onClick={() => openModalForProduct(p, "QUICK_SALE")}
                              title="Vendido Físicamente"
                              style={{
                                padding: "0.35rem 0.65rem",
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                color: "#34d399",
                                border: "1px solid rgba(16, 185, 129, 0.3)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "700",
                                fontSize: "0.8rem",
                              }}
                            >
                              ⚡ Venta
                            </button>

                            <button
                              onClick={() => openModalForProduct(p, "ENTRY")}
                              title="Entrada de mercancía"
                              style={{
                                padding: "0.35rem 0.65rem",
                                backgroundColor: "rgba(59, 130, 246, 0.15)",
                                color: "#60a5fa",
                                border: "1px solid rgba(59, 130, 246, 0.3)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.8rem",
                              }}
                            >
                              📥 Entrada
                            </button>

                            <button
                              onClick={() => openModalForProduct(p, "ADJUSTMENT")}
                              title="Ajuste manual de auditoría"
                              style={{
                                padding: "0.35rem 0.65rem",
                                backgroundColor: "rgba(245, 158, 11, 0.15)",
                                color: "#fbbf24",
                                border: "1px solid rgba(245, 158, 11, 0.3)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.8rem",
                              }}
                            >
                              ⚖️ Ajuste
                            </button>

                            <button
                              onClick={() => openModalForProduct(p, "RETURN")}
                              title="Devolución de cliente"
                              style={{
                                padding: "0.35rem 0.65rem",
                                backgroundColor: "rgba(147, 51, 234, 0.15)",
                                color: "#c084fc",
                                border: "1px solid rgba(147, 51, 234, 0.3)",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontWeight: "600",
                                fontSize: "0.8rem",
                              }}
                            >
                              🔄
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
      )}

      {/* CONTENIDO PESTAÑA 3: HISTORIAL DE MOVIMIENTOS */}
      {activeTab === "HISTORIAL" && (
        <div>
          {/* Filtro por tipo de movimiento */}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1.5rem",
              backgroundColor: "var(--bg-surface)",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              alignItems: "center",
            }}
          >
            <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)", fontWeight: "600" }}>
              Tipo de Movimiento:
            </label>
            <select
              value={movementTypeFilter}
              onChange={(e) => setMovementTypeFilter(e.target.value)}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-surface)",
                color: "var(--text-primary)",
                maxWidth: "320px",
              }}
            >
              <option value="">Todos los Movimientos</option>
              <option value="VENTA_FISICA">VENTA_FISICA (Tienda Presencial)</option>
              <option value="VENTA_ONLINE">VENTA_ONLINE (Pedido Web)</option>
              <option value="ENTRADA">ENTRADA (Recepción / Proveedor)</option>
              <option value="AJUSTE">AJUSTE (Auditoría / Merma)</option>
              <option value="DEVOLUCION">DEVOLUCION (Cliente)</option>
              <option value="RESERVA">RESERVA (Retención de stock)</option>
              <option value="CANCELACION_RESERVA">CANCELACION_RESERVA (Liberación)</option>
            </select>
          </div>

          {loadingMovements ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-muted)" }}>
              Cargando historial de movimientos...
            </div>
          ) : movements.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "4rem",
                backgroundColor: "var(--bg-surface)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
                color: "var(--text-muted)",
              }}
            >
              No hay movimientos registrados en la bitácora.
            </div>
          ) : (
            <div
              className="table-saas-container"
            >
              <table className="table-saas">
                <thead>
                  <tr>
                    <th>FECHA / HORA</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>TIPO</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>PRODUCTO / VARIANTE</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>CANTIDAD</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600", textAlign: "center" }}>ANTES ➔ DESPUÉS</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>USUARIO / AUTOR</th>
                    <th style={{ padding: "0.85rem 1rem", color: "var(--text-muted)", fontWeight: "600" }}>NOTAS / REFERENCIA</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => {
                    const isNegative = m.quantity < 0;
                    const badgeStyles: Record<string, { bg: string; color: string; label: string }> = {
                      VENTA_FISICA: { bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", label: "VENTA FÍSICA" },
                      VENTA_ONLINE: { bg: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", label: "VENTA ONLINE" },
                      ENTRADA: { bg: "rgba(139, 92, 246, 0.15)", color: "#a78bfa", label: "ENTRADA" },
                      AJUSTE: { bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", label: "AJUSTE" },
                      DEVOLUCION: { bg: "rgba(20, 184, 166, 0.15)", color: "#2dd4bf", label: "DEVOLUCIÓN" },
                      RESERVA: { bg: "rgba(249, 115, 22, 0.15)", color: "#fb923c", label: "RESERVA" },
                      CANCELACION_RESERVA: { bg: "rgba(99, 102, 241, 0.15)", color: "#818cf8", label: "LIBERACIÓN RESERVA" },
                    };

                    const badge = badgeStyles[m.movementType] || {
                      bg: "rgba(255,255,255,0.1)",
                      color: "var(--text-primary)",
                      label: m.movementType,
                    };

                    const dateFormatted = new Date(m.createdAt).toLocaleString("es-DO", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={m.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                          {dateFormatted}
                        </td>

                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span
                            style={{
                              padding: "0.25rem 0.55rem",
                              borderRadius: "4px",
                              backgroundColor: badge.bg,
                              color: badge.color,
                              fontWeight: "700",
                              fontSize: "0.75rem",
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div style={{ fontWeight: "600", color: "var(--text-primary)" }}>{m.product.name}</div>
                          {m.variant && (
                            <div style={{ fontSize: "0.75rem", color: "#60a5fa" }}>
                              {m.variant.title} ({m.variant.sku})
                            </div>
                          )}
                        </td>

                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <span
                            style={{
                              fontWeight: "800",
                              fontSize: "1rem",
                              color: isNegative ? "#f87171" : "#34d399",
                            }}
                          >
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </span>
                        </td>

                        <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
                          <span style={{ color: "var(--text-muted)" }}>{m.previousStock}</span>
                          {" ➔ "}
                          <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{m.newStock}</span>
                        </td>

                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-secondary)" }}>
                          {m.user ? `${m.user.firstName} ${m.user.lastName}` : <span style={{ color: "var(--text-muted)" }}>Sistema</span>}
                        </td>

                        <td style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {m.notes || m.referenceType || "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES INTERACTIVOS */}
      {/* ========================================================================= */}

      {/* MODAL: VENTA FÍSICA RÁPIDA */}
      {activeModal === "QUICK_SALE" && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "560px" }}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.5rem" }}>⚡</span>
                <h2 className="modal-title" style={{ color: "var(--text-primary)" }}>
                  Registrar Venta Física en Mostrador
                </h2>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="modal-close-btn"
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#ecfdf5",
                border: "1px solid #a7f3d0",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                fontSize: "0.825rem",
                color: "#065f46",
                marginBottom: "1.25rem",
                lineHeight: 1.45,
              }}
            >
              <strong>Venta Presencial Directa:</strong> Descuenta el inventario físico en tiempo real de forma inmediata. No altera pedidos web de clientes.
            </div>

            {/* Selector de Producto si no estaba preseleccionado */}
            {!selectedProduct ? (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
                  1. Buscar Producto por Nombre o SKU:
                </label>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escriba el nombre o código SKU..."
                  value={quickSaleSearch}
                  onChange={(e) => setQuickSaleSearch(e.target.value)}
                  style={{
                    marginBottom: "0.5rem",
                  }}
                />

                <div style={{ maxHeight: "200px", overflowY: "auto", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", backgroundColor: "#ffffff" }}>
                  {quickSaleFilteredProducts.slice(0, 10).map((p) => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct(p);
                        if (p.hasVariants) {
                          setSelectedVariantId(p.variants[0]?.id || "");
                        }
                      }}
                      style={{
                        padding: "0.65rem 0.85rem",
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "background-color 0.15s ease",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                    >
                      <div>
                        <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{p.name}</span>
                        {p.sku && <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginLeft: "0.5rem" }}>({p.sku})</span>}
                      </div>
                      <span style={{ fontWeight: "700", fontSize: "0.825rem", color: p.totalStock > 0 ? "#16a34a" : "#dc2626" }}>
                        Stock: {p.totalStock}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.85rem 1rem",
                  marginBottom: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700", textTransform: "uppercase" }}>PRODUCTO SELECCIONADO:</div>
                  <div style={{ fontWeight: "800", color: "var(--text-primary)", fontSize: "1.05rem", marginTop: "0.15rem" }}>
                    {selectedProduct.name}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cambiar
                </button>
              </div>
            )}

            {/* Selector de Variante si tiene variantes */}
            {selectedProduct && selectedProduct.hasVariants && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
                  2. Seleccionar Variante:
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.5rem" }}>
                  {selectedProduct.variants.map((v) => {
                    const isSelected = selectedVariantId === v.id;
                    return (
                      <div
                        key={v.id}
                        onClick={() => setSelectedVariantId(v.id)}
                        style={{
                          padding: "0.6rem 0.8rem",
                          borderRadius: "var(--radius-md)",
                          border: isSelected ? "2px solid #10b981" : "1px solid var(--border-strong)",
                          backgroundColor: isSelected ? "#ecfdf5" : "#ffffff",
                          cursor: "pointer",
                          textAlign: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div style={{ fontWeight: "700", fontSize: "0.9rem", color: isSelected ? "#065f46" : "var(--text-primary)" }}>
                          {v.title}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: v.stock > 0 ? "#15803d" : "#dc2626", fontWeight: "600", marginTop: "0.15rem" }}>
                          Stock: {v.stock}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selector de Cantidad */}
            {selectedProduct && (
              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
                  3. Cantidad a Descontar:
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => setFormQuantity(Math.max(1, formQuantity - 1))}
                    className="btn btn-secondary"
                    style={{
                      width: "42px",
                      height: "42px",
                      padding: 0,
                      fontSize: "1.2rem",
                      fontWeight: "700",
                    }}
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: "80px",
                      height: "42px",
                      textAlign: "center",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-strong)",
                      fontSize: "1.2rem",
                      fontWeight: "800",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => setFormQuantity(formQuantity + 1)}
                    className="btn btn-secondary"
                    style={{
                      width: "42px",
                      height: "42px",
                      padding: 0,
                      fontSize: "1.2rem",
                      fontWeight: "700",
                    }}
                  >
                    +
                  </button>

                  {/* Atajos de cantidad rápida */}
                  <div style={{ display: "flex", gap: "0.4rem", marginLeft: "0.5rem" }}>
                    {[1, 2, 3, 5].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setFormQuantity(q)}
                        className="btn btn-sm"
                        style={{
                          border: formQuantity === q ? "1px solid #10b981" : "1px solid var(--border-strong)",
                          backgroundColor: formQuantity === q ? "#ecfdf5" : "#ffffff",
                          color: formQuantity === q ? "#065f46" : "var(--text-secondary)",
                          fontWeight: "700",
                        }}
                      >
                        {q} ud.
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje de feedback */}
            {modalMessage && (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  marginBottom: "1.25rem",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  backgroundColor: modalMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                  color: modalMessage.type === "success" ? "#065f46" : "#991b1b",
                  border: `1px solid ${modalMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                }}
              >
                {modalMessage.text}
              </div>
            )}

            {/* Botón de Confirmación */}
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExecuteQuickSale()}
                disabled={submitting || !selectedProduct}
                className="btn btn-whatsapp"
                style={{
                  padding: "0.7rem 1.5rem",
                  fontSize: "0.95rem",
                  opacity: submitting || !selectedProduct ? 0.6 : 1,
                }}
              >
                {submitting ? "Descontando stock..." : `⚡ Confirmar Venta (${formQuantity} ud.)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ENTRADA / AJUSTE / DEVOLUCIÓN */}
      {(activeModal === "ENTRY" || activeModal === "ADJUSTMENT" || activeModal === "RETURN") && selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setActiveModal(null)}
        >
          <div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px" }}
          >
            <div className="modal-header">
              <h2 className="modal-title">
                {activeModal === "ENTRY" && "📥 Entrada de Mercancía"}
                {activeModal === "ADJUSTMENT" && "⚖️ Ajuste Manual de Inventario"}
                {activeModal === "RETURN" && "🔄 Devolución de Producto"}
              </h2>
              <button
                onClick={() => setActiveModal(null)}
                className="modal-close-btn"
                aria-label="Cerrar ventana"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteMovement}>
              <div style={{ marginBottom: "1rem", backgroundColor: "var(--bg-subtle)", padding: "0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: "700" }}>PRODUCTO:</div>
                <div style={{ fontWeight: "700", color: "var(--text-primary)", fontSize: "0.95rem", marginTop: "0.15rem" }}>{selectedProduct.name}</div>
              </div>

              {selectedProduct.hasVariants && (
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="variant-select" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.3rem", color: "var(--text-primary)" }}>
                    Variante:
                  </label>
                  <select
                    id="variant-select"
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                  >
                    {selectedProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} (Stock actual: {v.stock})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Parámetros específicos para Ajuste */}
              {activeModal === "ADJUSTMENT" ? (
                <>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.3rem", color: "var(--text-primary)" }}>
                      Tipo de Ajuste:
                    </label>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", color: "var(--text-primary)", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="adjType"
                          checked={formAdjType === "DELTA"}
                          onChange={() => setFormAdjType("DELTA")}
                        />
                        Variación (+ / -)
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.9rem", color: "var(--text-primary)", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="adjType"
                          checked={formAdjType === "EXACT"}
                          onChange={() => setFormAdjType("EXACT")}
                        />
                        Fijar Stock Exacto
                      </label>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <label htmlFor="inv-adj-value" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.3rem", color: "var(--text-primary)" }}>
                      {formAdjType === "DELTA" ? "Variación (ej. -2 por merma, +5 por recuento):" : "Nuevo Stock Físico Exacto:"}
                    </label>
                    <input
                      id="inv-adj-value"
                      type="number"
                      value={formAdjValue}
                      onChange={(e) => setFormAdjValue(parseInt(e.target.value) || 0)}
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: "700",
                      }}
                    />
                  </div>

                  {/* Confirmación destructiva */}
                  <div
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "#fffbeb",
                      border: "1px solid #fde68a",
                      marginBottom: "1rem",
                    }}
                  >
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#92400e", cursor: "pointer", margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={confirmDestructive}
                        onChange={(e) => setConfirmDestructive(e.target.checked)}
                      />
                      Confirmo que verifiqué físicamente este ajuste de inventario.
                    </label>
                  </div>
                </>
              ) : (
                <div style={{ marginBottom: "1rem" }}>
                  <label htmlFor="inv-qty-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.3rem", color: "var(--text-primary)" }}>
                    Cantidad:
                  </label>
                  <input
                    id="inv-qty-input"
                    type="number"
                    min="1"
                    value={formQuantity}
                    onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: "700",
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: "1.25rem" }}>
                <label htmlFor="inv-notes-input" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.3rem", color: "var(--text-primary)" }}>
                  Motivo / Notas {activeModal === "ADJUSTMENT" && "(Requerido)"}:
                </label>
                <textarea
                  id="inv-notes-input"
                  rows={2}
                  required={activeModal === "ADJUSTMENT"}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ej. Recuento físico en almacén, recepción factura 0023, rotura..."
                />
              </div>

              {modalMessage && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-md)",
                    marginBottom: "1rem",
                    fontSize: "0.85rem",
                    backgroundColor: modalMessage.type === "success" ? "#ecfdf5" : "#fef2f2",
                    color: modalMessage.type === "success" ? "#065f46" : "#991b1b",
                    border: `1px solid ${modalMessage.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                  }}
                >
                  {modalMessage.text}
                </div>
              )}

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? "Aplicando..." : "Confirmar Operación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
