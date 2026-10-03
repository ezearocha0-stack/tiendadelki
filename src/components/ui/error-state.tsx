"use client";

import React from "react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  isConnectionError?: boolean;
}

export function ErrorState({
  title = "Algo no salió como esperábamos",
  message = "No pudimos cargar la información en este momento. Por favor verifica tu conexión o intenta nuevamente.",
  onRetry,
  isConnectionError = false,
}: ErrorStateProps) {
  return (
    <div
      style={{
        backgroundColor: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "var(--radius-lg)",
        padding: "2.5rem 1.5rem",
        textAlign: "center",
        maxWidth: "480px",
        margin: "1.5rem auto",
        boxShadow: "var(--shadow-xs)",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          backgroundColor: "#fee2e2",
          color: "var(--color-brand-danger)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          fontWeight: "700",
          margin: "0 auto 1rem auto",
        }}
      >
        {isConnectionError ? "⚡" : "✕"}
      </div>

      <h3
        style={{
          fontSize: "1.15rem",
          fontWeight: "700",
          color: "var(--text-primary)",
          marginBottom: "0.4rem",
        }}
      >
        {isConnectionError ? "Error de Conexión" : title}
      </h3>

      <p
        style={{
          fontSize: "0.9rem",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          marginBottom: onRetry ? "1.25rem" : 0,
        }}
      >
        {message}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            padding: "0.55rem 1.25rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "#ffffff",
            border: "1px solid #fca5a5",
            color: "var(--color-brand-danger)",
            fontWeight: "600",
            fontSize: "0.875rem",
            cursor: "pointer",
            transition: "background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#fee2e2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
