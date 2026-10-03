"use client";

import React, { useEffect, useRef } from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDestructive = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const cancelBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === "Escape" && !isLoading) {
        onCancel();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      setTimeout(() => cancelBtnRef.current?.focus(), 50);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 9998,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "1.75rem",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.85rem" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              backgroundColor: isDestructive ? "#fef2f2" : "#eff6ff",
              color: isDestructive ? "var(--color-brand-danger)" : "var(--color-brand-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1rem",
              fontWeight: "700",
              flexShrink: 0,
            }}
          >
            {isDestructive ? "⚠" : "ℹ"}
          </div>
          <h3
            id="confirm-modal-title"
            style={{
              fontSize: "1.15rem",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {title}
          </h3>
        </div>

        <p
          style={{
            fontSize: "0.925rem",
            color: "var(--text-secondary)",
            lineHeight: 1.55,
            marginBottom: "1.5rem",
          }}
        >
          {message}
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            style={{
              padding: "0.6rem 1.15rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "#ffffff",
              border: "1px solid var(--border-strong)",
              color: "var(--text-primary)",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
              transition: "background-color 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-muted)")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: isDestructive ? "var(--color-brand-danger)" : "var(--color-brand-primary)",
              color: "#ffffff",
              border: "none",
              fontSize: "0.9rem",
              fontWeight: "600",
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.7 : 1,
              transition: "opacity 0.15s ease",
            }}
          >
            {isLoading ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
