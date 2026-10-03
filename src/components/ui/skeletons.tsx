"use client";

import React from "react";

export function ProductCardSkeleton() {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Imagen cuadrada */}
      <div className="skeleton" style={{ aspectRatio: "1 / 1", width: "100%" }} />

      <div style={{ padding: "1.1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {/* Categoría */}
        <div className="skeleton" style={{ width: "40%", height: "12px" }} />
        {/* Título (2 líneas) */}
        <div className="skeleton" style={{ width: "90%", height: "18px" }} />
        <div className="skeleton" style={{ width: "65%", height: "18px" }} />

        {/* Precio */}
        <div style={{ marginTop: "0.5rem" }}>
          <div className="skeleton" style={{ width: "50%", height: "24px" }} />
        </div>

        {/* Botón */}
        <div className="skeleton" style={{ width: "100%", height: "36px", marginTop: "0.5rem" }} />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="store-product-grid">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "2rem 1.25rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
        gap: "2.5rem",
      }}
    >
      {/* Galería izquierda */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="skeleton" style={{ aspectRatio: "1 / 1", width: "100%", borderRadius: "var(--radius-lg)" }} />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ width: "70px", height: "70px", borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      </div>

      {/* Detalles derecha */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="skeleton" style={{ width: "30%", height: "16px" }} />
        <div className="skeleton" style={{ width: "85%", height: "36px" }} />
        <div className="skeleton" style={{ width: "40%", height: "32px" }} />
        <div className="skeleton" style={{ width: "100%", height: "80px" }} />

        {/* Variantes */}
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <div className="skeleton" style={{ width: "60px", height: "38px" }} />
          <div className="skeleton" style={{ width: "60px", height: "38px" }} />
          <div className="skeleton" style={{ width: "60px", height: "38px" }} />
        </div>

        {/* Botones de acción */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
          <div className="skeleton" style={{ flex: 1, height: "50px", borderRadius: "var(--radius-md)" }} />
          <div className="skeleton" style={{ width: "50px", height: "50px", borderRadius: "var(--radius-md)" }} />
        </div>
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5, rows = 4 }: { columns?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} style={{ padding: "1rem" }}>
              <div className="skeleton" style={{ width: c === 0 ? "70%" : "85%", height: "16px" }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
