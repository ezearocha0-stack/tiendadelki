"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "./cart-context";
import { useFavorites } from "./favorites-context";
import { useWhatsApp } from "@/hooks/use-whatsapp";

export function StoreHeader() {
  const router = useRouter();
  const { itemCount } = useCart();
  const { favoritesCount } = useFavorites();
  const { phone, formattedPhone } = useWhatsApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tienda?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  }

  const navLinks = [
    { label: "Inicio", href: "/" },
    { label: "Catálogo", href: "/tienda" },
    { label: "Categorías", href: "/categorias" },
    { label: "Ofertas", href: "/ofertas" },
    { label: "Nuestra Tienda", href: "/nuestra-tienda" },
    { label: "Rastrear Pedido", href: "/rastreo" },
  ];

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "#ffffff" }}>
      {/* 1. Barra de Anuncios Superior */}
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "#e2e8f0",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "0.35rem 1.25rem",
          fontSize: "0.78rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span>📍 Tienda física en San Fernando de Montecristi</span>
          <span style={{ opacity: 0.4 }}>•</span>
          <span>🏪 Ventas locales y retiro en tienda</span>
        </div>

        {phone && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <a
              href={`https://wa.me/${formattedPhone}?text=Hola%20TiendaDelki,%20tengo%20una%20consulta`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#4ade80", fontWeight: "600", display: "flex", alignItems: "center", gap: "0.35rem" }}
            >
              <span>WhatsApp: {phone}</span>
            </a>
          </div>
        )}
      </div>

      {/* 2. Barra Principal de Navegación */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0.75rem 1.25rem",
        }}
      >
        <div
          style={{
            maxWidth: "1320px",
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1.5rem",
          }}
        >
          {/* Botón menú móvil (hamburguesa) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "5px",
              background: "none",
              border: "none",
              padding: "0.5rem",
              cursor: "pointer",
              minHeight: "44px",
              minWidth: "44px",
            }}
            className="mobile-only-btn"
            aria-label="Abrir menú de navegación"
          >
            <span style={{ width: "22px", height: "2px", backgroundColor: "var(--text-primary)", display: "block" }}></span>
            <span style={{ width: "22px", height: "2px", backgroundColor: "var(--text-primary)", display: "block" }}></span>
            <span style={{ width: "22px", height: "2px", backgroundColor: "var(--text-primary)", display: "block" }}></span>
          </button>

          {/* Logo */}
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            <div>
              <div style={{ fontSize: "1.35rem", fontWeight: "800", letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1 }}>
                Tienda<span style={{ color: "var(--color-brand-accent)" }}>Delki</span>
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: "600", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Física & Online
              </div>
            </div>
          </Link>

          {/* Buscador central en Desktop */}
          <form
            onSubmit={handleSearchSubmit}
            style={{
              flex: "1 1 360px",
              maxWidth: "480px",
              display: "flex",
              position: "relative",
            }}
            className="desktop-search-form"
          >
            <input
              type="text"
              placeholder="Buscar productos, ropa, accesorios..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 2.5rem 0.55rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                backgroundColor: "var(--bg-muted)",
                color: "var(--text-primary)",
                fontSize: "0.875rem",
              }}
            />
            <button
              type="submit"
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                padding: "0.35rem 0.5rem",
                color: "var(--text-muted)",
                fontSize: "0.95rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              aria-label="Buscar"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
          </form>

          {/* Enlaces y Acciones a la Derecha */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            {/* WhatsApp Directo */}
            {phone && (
              <a
                href={`https://wa.me/${formattedPhone}?text=Hola%20TiendaDelki,%20quiero%20hacer%20un%20pedido`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.85rem",
                  backgroundColor: "#ecfdf5",
                  color: "#065f46",
                  border: "1px solid #a7f3d0",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.825rem",
                  fontWeight: "600",
                  textDecoration: "none",
                  minHeight: "38px",
                }}
                className="desktop-nav-link"
              >
                <span>WhatsApp</span>
              </a>
            )}

            {/* Botón de Favoritos */}
            <Link
              href="/favoritos"
              title="Mis Favoritos"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "40px",
                height: "40px",
                borderRadius: "var(--radius-md)",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-subtle)",
                fontSize: "1rem",
                color: "var(--text-primary)",
                textDecoration: "none",
                position: "relative",
              }}
              className="desktop-nav-link"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
              {favoritesCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    backgroundColor: "var(--color-brand-danger)",
                    color: "#ffffff",
                    borderRadius: "var(--radius-full)",
                    minWidth: "18px",
                    height: "18px",
                    fontSize: "0.68rem",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 4px",
                  }}
                >
                  {favoritesCount}
                </span>
              )}
            </Link>

            {/* Botón de Mi Cuenta */}
            <Link
              href="/cliente/perfil"
              title="Mi Cuenta"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.45rem 0.85rem",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: "600",
                color: "var(--text-primary)",
                textDecoration: "none",
                minHeight: "40px",
              }}
              className="desktop-nav-link"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Cuenta</span>
            </Link>

            {/* Botón de Carrito */}
            <Link
              href="/carrito"
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem 1rem",
                backgroundColor: "var(--color-brand-primary)",
                color: "#ffffff",
                borderRadius: "var(--radius-md)",
                fontWeight: "600",
                fontSize: "0.875rem",
                textDecoration: "none",
                boxShadow: "var(--shadow-xs)",
                minHeight: "40px",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
              <span className="cart-label">Carrito</span>
              {itemCount > 0 && (
                <span
                  style={{
                    backgroundColor: "var(--color-brand-accent)",
                    color: "#ffffff",
                    borderRadius: "9999px",
                    padding: "0.15rem 0.45rem",
                    fontSize: "0.75rem",
                    fontWeight: "700",
                    lineHeight: 1,
                  }}
                >
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* 3. Navegación Secundaria en Desktop */}
        <nav
          style={{
            maxWidth: "1320px",
            margin: "0.4rem auto 0 auto",
            display: "flex",
            alignItems: "center",
            gap: "2rem",
            paddingTop: "0.4rem",
            borderTop: "1px solid var(--border-subtle)",
          }}
          className="desktop-secondary-nav"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                color: "var(--text-secondary)",
                fontSize: "0.875rem",
                fontWeight: "500",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = "var(--text-primary)")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-secondary)")}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/ofertas"
            style={{
              color: "var(--color-brand-danger)",
              fontSize: "0.875rem",
              fontWeight: "600",
              textDecoration: "none",
            }}
          >
            Rebajas y Ofertas
          </Link>
        </nav>
      </div>

      {/* 4. Drawer de Menú Móvil */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(15, 23, 42, 0.4)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "flex",
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: "82%",
              maxWidth: "320px",
              backgroundColor: "#ffffff",
              height: "100%",
              padding: "1.5rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "var(--shadow-xl)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <span style={{ fontWeight: "800", fontSize: "1.2rem", color: "var(--text-primary)" }}>
                  Tienda<span style={{ color: "var(--color-brand-accent)" }}>Delki</span>
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: "1.25rem",
                    cursor: "pointer",
                    padding: "0.5rem",
                    minHeight: "44px",
                    minWidth: "44px",
                  }}
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              </div>

              {/* Buscador en móvil */}
              <form onSubmit={handleSearchSubmit} style={{ marginBottom: "1.5rem", position: "relative" }}>
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.625rem 2.5rem 0.625rem 0.85rem",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-strong)",
                    backgroundColor: "var(--bg-muted)",
                    color: "var(--text-primary)",
                    fontSize: "0.875rem",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    padding: "0.25rem",
                  }}
                  aria-label="Buscar"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </button>
              </form>

              {/* Enlaces de navegación */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      color: "var(--text-primary)",
                      fontSize: "0.95rem",
                      fontWeight: "500",
                      padding: "0.85rem 0",
                      borderBottom: "1px solid var(--border-subtle)",
                      display: "flex",
                      alignItems: "center",
                      minHeight: "44px",
                    }}
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/favoritos"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    fontWeight: "500",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    minHeight: "44px",
                  }}
                >
                  <span>Mis Favoritos</span>
                  {favoritesCount > 0 && (
                    <span
                      style={{
                        backgroundColor: "var(--color-brand-danger)",
                        color: "#ffffff",
                        padding: "0.1rem 0.5rem",
                        borderRadius: "var(--radius-full)",
                        fontSize: "0.75rem",
                        fontWeight: "700",
                      }}
                    >
                      {favoritesCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/cliente/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    color: "var(--text-primary)",
                    fontSize: "0.95rem",
                    fontWeight: "500",
                    padding: "0.85rem 0",
                    borderBottom: "1px solid var(--border-subtle)",
                    minHeight: "44px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  Mi Cuenta
                </Link>
              </div>
            </div>

            {/* Acciones inferiores del menú móvil */}
            <div style={{ paddingTop: "1.25rem", borderTop: "1px solid var(--border-subtle)" }}>
              {phone && (
                <a
                  href={`https://wa.me/${formattedPhone}?text=Hola%20TiendaDelki,%20quiero%20hacer%20un%20pedido`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    padding: "0.75rem",
                    backgroundColor: "var(--color-brand-whatsapp)",
                    color: "#ffffff",
                    borderRadius: "var(--radius-md)",
                    fontWeight: "600",
                    fontSize: "0.9rem",
                    textDecoration: "none",
                    minHeight: "44px",
                  }}
                >
                  <span>Pedir por WhatsApp</span>
                </a>
              )}

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "center", marginTop: "0.75rem" }}>
                San Fernando de Montecristi, República Dominicana
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
