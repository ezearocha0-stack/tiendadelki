"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
}

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login?callbackUrl=" + pathname);
          return;
        }
        const data = await res.json();
        setUser(data.data);
      } catch (err) {
        router.push("/login?callbackUrl=" + pathname);
      } finally {
        setLoading(false);
      }
    }
    loadMe();
  }, [pathname, router]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      router.push("/login");
    }
  }

  const navItems = [
    { label: "Mi Perfil", href: "/cliente/perfil", icon: "👤" },
    { label: "Mis Pedidos", href: "/cliente/pedidos", icon: "🛍️" },
    { label: "Mis Direcciones", href: "/cliente/direcciones", icon: "📍" },
    { label: "Mis Favoritos", href: "/cliente/favoritos", icon: "❤️" },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <StoreHeader />
        <main style={{ flex: 1, padding: "5rem 1rem", textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              width: "40px",
              height: "40px",
              border: "3px solid rgba(37, 99, 235, 0.2)",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              marginBottom: "1rem",
            }}
          />
          <p style={{ color: "var(--text-secondary)" }}>Cargando portal de cliente...</p>
          <style jsx>{`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </main>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-app)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1rem 4rem" }}>
        <div className="container">
          {/* Bienvenida y Barra de Navegación de Cuenta */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "2rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Portal de Cliente</div>
              <h1 style={{ fontSize: "1.65rem", fontWeight: "800", color: "var(--text-primary)", marginTop: "0.2rem" }}>
                Hola, {user?.firstName} {user?.lastName}
              </h1>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                onClick={handleLogout}
                style={{
                  padding: "0.45rem 0.9rem",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  color: "#f87171",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cerrar Sesión 🚪
              </button>
            </div>
          </div>

          {/* Menú de Pestañas de Cliente */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              overflowX: "auto",
              paddingBottom: "0.5rem",
              marginBottom: "2rem",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/cliente/perfil" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.6rem 1.15rem",
                    borderRadius: "var(--radius-md)",
                    fontSize: "0.9rem",
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#ffffff" : "var(--text-secondary)",
                    backgroundColor: isActive ? "var(--color-brand-accent)" : "var(--bg-surface)",
                    border: `1px solid ${isActive ? "var(--color-brand-accent)" : "var(--border-subtle)"}`,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Contenido de la sub-página */}
          <div>{children}</div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
