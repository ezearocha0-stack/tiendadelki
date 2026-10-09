"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Si estamos en la pantalla de login, renderizar limpio sin layout administrativo
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navSections = [
    {
      title: "GESTIÓN PRINCIPAL",
      items: [
        {
          label: "Dashboard",
          href: "/admin/dashboard",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9"></rect>
              <rect x="14" y="3" width="7" height="5"></rect>
              <rect x="14" y="12" width="7" height="9"></rect>
              <rect x="3" y="16" width="7" height="5"></rect>
            </svg>
          ),
        },
        {
          label: "Pedidos Online",
          href: "/admin/pedidos",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          ),
        },
      ],
    },
    {
      title: "CATÁLOGO & STOCK",
      items: [
        {
          label: "Inventario Físico",
          href: "/admin/inventario",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          ),
        },
        {
          label: "Productos",
          href: "/admin/productos",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
              <line x1="7" y1="7" x2="7.01" y2="7"></line>
            </svg>
          ),
        },
        {
          label: "Categorías",
          href: "/admin/categorias",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
          ),
        },
      ],
    },
    {
      title: "CLIENTES & CONFIGURACIÓN",
      items: [
        {
          label: "Clientes",
          href: "/admin/clientes",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          ),
        },
                {
          label: "Configuración de Tienda",
          href: "/admin/configuracion",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          ),
        },
{
          label: "Tarifas de Envío",
          href: "/admin/configuracion/envios",
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          ),
        },
      ],
    },
  ];

  // Helper para determinar el título de la página activa
  function getActivePageTitle() {
    for (const section of navSections) {
      for (const item of section.items) {
        if (pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href))) {
          return item.label;
        }
      }
    }
    return "Administración";
  }

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/admin/login");
      router.refresh();
    } catch (e) {
      router.push("/admin/login");
    }
  }

  const renderNavContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
      <div>
        {/* Brand Header */}
        <div style={{ padding: "1.5rem 1.25rem 1.25rem 1.25rem", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              boxShadow: "0 4px 10px rgba(79, 70, 229, 0.3)",
              flexShrink: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontWeight: "800", fontSize: "1.05rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
                TiendaDelki
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  fontWeight: "700",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "9999px",
                  backgroundColor: "var(--color-brand-indigo-light, #eef2ff)",
                  color: "var(--color-brand-primary)",
                  letterSpacing: "0.04em",
                  border: "1px solid #c7d2fe",
                }}
              >
                ADMIN
              </span>
            </div>
            <div style={{ fontSize: "0.725rem", color: "var(--text-muted)", marginTop: "0.1rem" }}>
              Panel de Control Central
            </div>
          </div>
        </div>

        {/* Acceso Directo de Venta Física */}
        <div style={{ padding: "1rem 1.25rem 0.5rem 1.25rem" }}>
          <Link
            href="/admin/inventario?action=quick_sale"
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.6rem 0.85rem",
              backgroundColor: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "var(--radius-md)",
              fontSize: "0.825rem",
              fontWeight: "700",
              textDecoration: "none",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 2px rgba(16, 185, 129, 0.1)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "#d1fae5";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "#ecfdf5";
              e.currentTarget.style.transform = "none";
            }}
          >
            <span>⚡</span>
            <span>Registrar Venta Física</span>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav style={{ padding: "0.75rem 0.75rem" }}>
          {navSections.map((section) => (
            <div key={section.title} style={{ marginBottom: "1.25rem" }}>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: "700",
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                  padding: "0 0.6rem 0.4rem 0.6rem",
                }}
              >
                {section.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.55rem 0.75rem",
                        borderRadius: "var(--radius-md)",
                        fontSize: "0.875rem",
                        fontWeight: isActive ? "700" : "500",
                        color: isActive ? "var(--color-brand-primary)" : "var(--text-secondary)",
                        backgroundColor: isActive ? "var(--bg-sidebar-active, #eef2ff)" : "transparent",
                        borderLeft: isActive ? "3px solid var(--color-brand-primary)" : "3px solid transparent",
                        transition: "all 0.15s ease",
                        textDecoration: "none",
                      }}
                      onMouseOver={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "var(--bg-sidebar-hover, #f8fafc)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }
                      }}
                      onMouseOut={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--text-secondary)";
                        }
                      }}
                    >
                      <span style={{ color: isActive ? "var(--color-brand-primary)" : "var(--text-muted)", display: "flex" }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* User Info & Footer */}
      <div style={{ padding: "1rem 1.25rem", borderTop: "1px solid var(--border-subtle)", backgroundColor: "#ffffff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", minWidth: 0 }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                backgroundColor: "#eef2ff",
                color: "#4f46e5",
                fontWeight: "700",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #c7d2fe",
              }}
            >
              A
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "0.825rem", fontWeight: "700", color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Administrador
              </div>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Sesión Activa
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Cerrar Sesión"
            style={{
              padding: "0.4rem",
              borderRadius: "var(--radius-md)",
              color: "var(--color-brand-danger)",
              border: "1px solid #fecaca",
              backgroundColor: "#fef2f2",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#fee2e2")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
            aria-label="Cerrar sesión"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", backgroundColor: "var(--bg-app)" }}>
      {/* 1. SIDEBAR FIJO EN ESCRITORIO (>= 1024px) */}
      <aside
        className="admin-desktop-sidebar"
        style={{
          width: "260px",
          height: "100vh",
          position: "fixed",
          top: 0,
          left: 0,
          backgroundColor: "#ffffff",
          borderRight: "1px solid var(--border-subtle)",
          zIndex: 40,
          overflowY: "auto",
        }}
      >
        {renderNavContent()}
      </aside>

      {/* 2. DRAWER DE MENÚ EN MÓVIL (< 1024px) */}
      {mobileDrawerOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
          }}
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            style={{
              width: "280px",
              maxWidth: "85%",
              backgroundColor: "#ffffff",
              height: "100%",
              boxShadow: "var(--shadow-xl)",
              animation: "fadeIn 0.2s ease-out",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {renderNavContent()}
          </div>
        </div>
      )}

      {/* 3. ÁREA DE CONTENIDO PRINCIPAL */}
      <div className="admin-content-shell" style={{ flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* Top Header Integrado */}
        <header
          style={{
            height: "64px",
            backgroundColor: "#ffffff",
            borderBottom: "1px solid var(--border-subtle)",
            padding: "0 clamp(0.75rem, 2vw, 1.5rem)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 30,
            boxShadow: "0 1px 2px 0 rgba(15, 23, 42, 0.03)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
            {/* Botón menú móvil */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="admin-mobile-toggle"
              style={{
                display: "none",
                alignItems: "center",
                justifyContent: "center",
                width: "38px",
                height: "38px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-subtle)",
                color: "var(--text-primary)",
                cursor: "pointer",
                flexShrink: 0,
              }}
              aria-label="Abrir menú de navegación"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            {/* Breadcrumbs de navegación */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: "500", display: "none" }} className="admin-breadcrumb-root">Admin</span>
              <span style={{ fontSize: "0.85rem", color: "var(--border-strong)", display: "none" }} className="admin-breadcrumb-root">/</span>
              <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {getActivePageTitle()}
              </span>
            </div>
          </div>

          {/* Acciones del Header */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <Link
              href="/admin/inventario?action=quick_sale"
              className="btn"
              style={{
                backgroundColor: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                padding: "0.45rem 0.75rem",
                fontSize: "0.825rem",
                fontWeight: "700",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span>⚡</span>
              <span className="admin-header-label">Venta Física</span>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="btn btn-secondary"
              style={{
                padding: "0.45rem 0.75rem",
                fontSize: "0.825rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.25rem",
              }}
            >
              <span className="admin-header-label-desktop">Tienda</span>
              <span style={{ fontSize: "0.85rem" }}>↗</span>
            </Link>

            <button
              onClick={handleLogout}
              className="btn btn-danger"
              style={{
                padding: "0.45rem 0.75rem",
                fontSize: "0.825rem",
              }}
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        </header>

        {/* Contenedor de la página con fondo #F4F7FB */}
        <main style={{ flex: 1, backgroundColor: "var(--bg-app)", padding: "clamp(0.75rem, 2vw, 1.5rem)", minWidth: 0 }}>
          {children}
        </main>
      </div>

      <style jsx global>{`
        @media (min-width: 1024px) {
          .admin-desktop-sidebar {
            display: block !important;
          }
          .admin-content-shell {
            margin-left: 260px !important;
          }
          .admin-mobile-toggle {
            display: none !important;
          }
          .admin-breadcrumb-root {
            display: inline !important;
          }
        }
        @media (max-width: 1023px) {
          .admin-desktop-sidebar {
            display: none !important;
          }
          .admin-content-shell {
            margin-left: 0 !important;
          }
          .admin-mobile-toggle {
            display: flex !important;
          }
          .admin-header-label {
            display: none;
          }
        }
        @media (max-width: 480px) {
          .admin-header-label-desktop {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
