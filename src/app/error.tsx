"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Registro controlado en consola de cliente
    console.error("🔴 [Unhandled App Error]:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        backgroundColor: "var(--color-bg, #f8fafc)",
        color: "var(--color-text-main, #0f172a)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: "520px",
          width: "100%",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
          border: "1px solid #e2e8f0",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            margin: "0 auto 1.5rem",
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            marginBottom: "0.75rem",
            letterSpacing: "-0.025em",
          }}
        >
          Algo no salió como esperábamos
        </h1>

        <p
          style={{
            fontSize: "0.95rem",
            color: "#64748b",
            lineHeight: 1.6,
            marginBottom: "1.75rem",
          }}
        >
          Ha ocurrido un error inesperado al procesar la solicitud. Nuestro equipo técnico ha sido
          notificado. Puedes intentar recargar la vista o volver a la tienda.
        </p>

        {error.digest && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#94a3b8",
              marginBottom: "1.5rem",
              fontFamily: "monospace",
              background: "#f1f5f9",
              padding: "0.4rem 0.75rem",
              borderRadius: "6px",
              display: "inline-block",
            }}
          >
            Ref ID: {error.digest}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => reset()}
            type="button"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "var(--color-primary, #2563eb)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)",
              transition: "opacity 0.2s ease",
            }}
          >
            🔄 Intentar Nuevamente
          </button>

          <Link
            href="/"
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#f8fafc",
              color: "#334155",
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.95rem",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            🏠 Ir al Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
