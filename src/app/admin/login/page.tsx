"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Error al iniciar sesión");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundColor: "var(--bg-app)",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: "420px",
          width: "100%",
          padding: "clamp(1.5rem, 5vw, 2.5rem) clamp(1rem, 4vw, 2rem)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          {/* Logo Mark */}
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 6px 16px rgba(79, 70, 229, 0.35)",
              margin: "0 auto 1.25rem auto",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>

          <span
            className="badge badge-review"
            style={{ marginBottom: "0.85rem", fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase" }}
          >
            TiendaDelki Security
          </span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", color: "var(--text-primary)", letterSpacing: "-0.025em", margin: "0.2rem 0 0 0" }}>
            Acceso Administrativo
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: "0.35rem" }}>
            Credenciales de personal autorizado
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              padding: "0.85rem 1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "var(--radius-md)",
              color: "#b91c1c",
              fontSize: "0.875rem",
              fontWeight: "600",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label htmlFor="admin-email" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
              Correo Electrónico
            </label>
            <input
              id="admin-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ezearocha@gmail.com"
            />
          </div>

          <div>
            <label htmlFor="admin-password" style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", marginBottom: "0.4rem", color: "var(--text-primary)" }}>
              Contraseña
            </label>
            <input
              id="admin-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              padding: "0.85rem",
              fontSize: "0.95rem",
              marginTop: "0.5rem",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Verificando credenciales..." : "Iniciar Sesión en el Panel"}
          </button>
        </form>
      </div>
    </div>
  );
}
