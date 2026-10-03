"use client";

import React from "react";
import Link from "next/link";

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
}

export function EmptyState({
  icon = "📦",
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: EmptyStateProps) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: "3.5rem 2rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "540px",
        margin: "0 auto",
        width: "100%",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          backgroundColor: "var(--bg-muted)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.75rem",
          color: "var(--text-secondary)",
          marginBottom: "1.25rem",
        }}
      >
        {typeof icon === "string" ? <span>{icon}</span> : icon}
      </div>

      <h3
        style={{
          fontSize: "1.25rem",
          fontWeight: "700",
          color: "var(--text-primary)",
          marginBottom: "0.4rem",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: "0.925rem",
          color: "var(--text-secondary)",
          lineHeight: 1.55,
          maxWidth: "400px",
          marginBottom: actionLabel || secondaryLabel ? "1.5rem" : 0,
        }}
      >
        {description}
      </p>

      {(actionLabel || secondaryLabel) && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
          {actionLabel && actionHref && (
            <Link
              href={actionHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.625rem 1.25rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-brand-primary)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.9rem",
                textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary)")}
            >
              {actionLabel}
            </Link>
          )}

          {actionLabel && !actionHref && onAction && (
            <button
              type="button"
              onClick={onAction}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.625rem 1.25rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--color-brand-primary)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--color-brand-primary)")}
            >
              {actionLabel}
            </button>
          )}

          {secondaryLabel && secondaryHref && (
            <Link
              href={secondaryHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.625rem 1.25rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "0.9rem",
                textDecoration: "none",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-muted)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              {secondaryLabel}
            </Link>
          )}

          {secondaryLabel && !secondaryHref && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.625rem 1.25rem",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-strong)",
                color: "var(--text-primary)",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-muted)")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#ffffff")}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
