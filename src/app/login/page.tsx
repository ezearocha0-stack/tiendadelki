"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/cliente/perfil";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Credenciales incorrectas.");
        return;
      }

      // Si el rol es admin, llevar a dashboard, si es cliente, al callbackUrl
      if (data.user?.role && ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(data.user.role)) {
        router.push("/admin/dashboard");
      } else {
        router.push(callbackUrl);
      }
      router.refresh();
    } catch (err) {
      setErrorMessage("Error de conexión al iniciar sesión. Inténtelo nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="card"
      style={{
        maxWidth: "460px",
        margin: "0 auto",
        padding: "2.5rem 2rem",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏪</div>
        <h1 style={{ fontSize: "1.65rem", fontWeight: "800", color: "var(--text-primary)" }}>
          Iniciar Sesión
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.35rem" }}>
          Accede a tus pedidos, tracking y direcciones guardadas
        </p>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: "0.85rem 1rem",
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "var(--radius-md)",
            color: "#f87171",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
            Correo Electrónico
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ejemplo@correo.com"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
            }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
            Contraseña
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "var(--bg-app)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              color: "var(--text-primary)",
              fontSize: "0.95rem",
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: "0.5rem",
            padding: "0.85rem",
            backgroundColor: "var(--color-brand-accent)",
            color: "#ffffff",
            borderRadius: "var(--radius-md)",
            fontWeight: "700",
            fontSize: "0.95rem",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
          }}
        >
          {loading ? "Iniciando sesión..." : "Ingresar a mi Cuenta"}
        </button>
      </form>

      <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border-subtle)", textAlign: "center" }}>
        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
          ¿Aún no tienes cuenta?{" "}
          <Link
            href={`/registro?callbackUrl=${encodeURIComponent(callbackUrl)}`}
            style={{ color: "var(--color-brand-accent)", fontWeight: "700" }}
          >
            Regístrate aquí
          </Link>
        </p>

        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
          ¿Prefieres no registrarte? Puedes seguir comprando como invitado directamente en la tienda.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />
      <main style={{ flex: 1, padding: "3rem 1rem", display: "flex", alignItems: "center" }}>
        <div className="container">
          <Suspense fallback={<div style={{ textAlign: "center", color: "var(--text-muted)" }}>Cargando formulario...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
