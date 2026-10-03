"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error("🔥 [CRITICAL ROOT ERROR]:", error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          padding: 0,
          backgroundColor: "#0f172a",
          color: "#f8fafc",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: "480px",
            textAlign: "center",
            padding: "2rem",
            backgroundColor: "#1e293b",
            borderRadius: "16px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            border: "1px solid #334155",
          }}
        >
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🛠️</div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Servicio Temporalmente Interrumpido
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            Ha ocurrido un problema crítico en el servidor. Estamos trabajando para solucionarlo de inmediato.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: "pointer",
            }}
          >
            Reintentar Carga
          </button>
        </div>
      </body>
    </html>
  );
}
