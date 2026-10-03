"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, description?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", description?: string, duration = 3500) => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, type, message, description, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Máximo 5 toasts visibles

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const getToastConfig = (type: ToastType) => {
    switch (type) {
      case "success":
        return {
          icon: "✓",
          iconBg: "#ecfdf5",
          iconColor: "#059669",
          borderLeft: "4px solid #10b981",
        };
      case "error":
        return {
          icon: "✕",
          iconBg: "#fef2f2",
          iconColor: "#dc2626",
          borderLeft: "4px solid #ef4444",
        };
      case "warning":
        return {
          icon: "⚠",
          iconBg: "#fffbeb",
          iconColor: "#d97706",
          borderLeft: "4px solid #f59e0b",
        };
      case "info":
      default:
        return {
          icon: "ℹ",
          iconBg: "#eff6ff",
          iconColor: "#2563eb",
          borderLeft: "4px solid #3b82f6",
        };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}

      {/* Floating Toasts Container */}
      <div
        aria-live="polite"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          maxWidth: "400px",
          width: "calc(100% - 40px)",
          pointerEvents: "none",
        }}
      >
        {toasts.map((toast) => {
          const config = getToastConfig(toast.type);
          return (
            <div
              key={toast.id}
              className="toast-item"
              role="alert"
              style={{
                pointerEvents: "auto",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-subtle)",
                borderLeft: config.borderLeft,
                color: "var(--text-primary)",
                borderRadius: "var(--radius-md)",
                padding: "0.85rem 1rem",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  backgroundColor: config.iconBg,
                  color: config.iconColor,
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: "800",
                  flexShrink: 0,
                  marginTop: "1px",
                }}
              >
                {config.icon}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: "600", fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.35 }}>
                  {toast.message}
                </div>
                {toast.description && (
                  <div
                    style={{
                      fontSize: "0.825rem",
                      color: "var(--text-secondary)",
                      marginTop: "0.25rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {toast.description}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Cerrar notificación"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "1.1rem",
                  lineHeight: 1,
                  padding: "0 0 0 4px",
                  transition: "color 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de un ToastProvider");
  }
  return context;
}
