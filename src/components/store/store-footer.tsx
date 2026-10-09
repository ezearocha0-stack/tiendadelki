"use client";

import Link from "next/link";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatWhatsAppPhone } from "@/core/whatsapp/whatsapp-helper";

export function StoreFooter() {
  const { settings, fullAddress, scheduleSummary } = useStoreSettings();
  const formattedWhatsApp = formatWhatsAppPhone(settings.whatsapp);

  return (
    <footer
      style={{
        backgroundColor: "#0f172a",
        borderTop: "1px solid #1e293b",
        color: "#94a3b8",
        paddingTop: "clamp(2rem, 5vw, 3.5rem)",
        paddingBottom: "2rem",
        marginTop: "4rem",
      }}
    >
      <div
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "0 1.25rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem",
        }}
      >
        {/* Columna 1: Tienda y Misión */}
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
              {settings.storeName}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
              {settings.shortDescription}
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#94a3b8", marginBottom: "1.25rem" }}>
            {settings.description}
          </p>
          <div style={{ fontSize: "0.825rem", display: "flex", flexDirection: "column", gap: "0.4rem", color: "#cbd5e1" }}>
            {fullAddress && <div><strong>Ubicación:</strong> {fullAddress}</div>}
            {(settings.phone || settings.secondaryPhone) && (
              <div>
                <strong>Teléfono:</strong> {[settings.phone, settings.secondaryPhone].filter(Boolean).join(" / ")}
              </div>
            )}
            {settings.email && <div><strong>Email:</strong> {settings.email}</div>}
            {scheduleSummary && <div><strong>Horario:</strong> {scheduleSummary}</div>}
          </div>
        </div>

        {/* Columna 2: Navegación y Enlaces Rápidos */}
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Comprar & Explorar
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.875rem", padding: 0 }}>
            <li>
              <Link href="/tienda" style={{ color: "#cbd5e1" }}>Catálogo Completo</Link>
            </li>
            <li>
              <Link href="/categorias" style={{ color: "#cbd5e1" }}>Categorías</Link>
            </li>
            <li>
              <Link href="/ofertas" style={{ color: "#f87171", fontWeight: "600" }}>Rebajas y Ofertas</Link>
            </li>
            <li>
              <Link href="/rastreo" style={{ color: "#38bdf8", fontWeight: "600" }}>Rastrear mi Pedido</Link>
            </li>
            <li>
              <Link href="/nuestra-tienda" style={{ color: "#cbd5e1" }}>Nuestra Tienda Física</Link>
            </li>
            <li>
              <Link href="/contacto" style={{ color: "#cbd5e1" }}>Contacto y Ubicación</Link>
            </li>
            <li>
              <Link href="/faq" style={{ color: "#cbd5e1" }}>Preguntas Frecuentes</Link>
            </li>
            <li>
              <Link href="/politicas" style={{ color: "#cbd5e1" }}>Términos y Condiciones</Link>
            </li>
          </ul>
        </div>

        {/* Columna 3: Información Bancaria Oficial y Redes */}
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Pagos y Transferencias
          </h3>
          <p style={{ fontSize: "0.825rem", color: "#94a3b8", marginBottom: "0.85rem" }}>
            Aceptamos transferencias y depósitos bancarios autorizados con confirmación rápida y verificación segura en checkout.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.825rem" }}>
            <div style={{ padding: "0.6rem 0.85rem", backgroundColor: "#1e293b", borderRadius: "var(--radius-sm, 6px)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#60a5fa" }}>Transferencia / Depósito</strong>
              <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Cuentas oficiales verificadas en el checkout</div>
            </div>
            {settings.instagram && (
              <a
                href={settings.instagram}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#e2e8f0", textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}
              >
                <span>📸 Instagram: @tiendadelki</span>
              </a>
            )}
            {settings.facebook && (
              <a
                href={settings.facebook}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#e2e8f0", textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span>🌐 Facebook: TiendaDelki</span>
              </a>
            )}
            {settings.tiktok && (
              <a
                href={settings.tiktok}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#e2e8f0", textDecoration: "none", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span>🎵 TikTok: @tiendadelki</span>
              </a>
            )}
          </div>
        </div>

        {/* Columna 4: Cobertura de Envíos y WhatsApp */}
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Modalidad de Venta y Retiro
          </h3>
          <p style={{ fontSize: "0.825rem", color: "#cbd5e1", lineHeight: 1.5, marginBottom: "1rem" }}>
            {settings.deliveryMessage}
          </p>

          {settings.whatsapp && (
            <div style={{ marginTop: "1rem" }}>
              <a
                href={`https://wa.me/${formattedWhatsApp}?text=${encodeURIComponent(settings.contactMessage)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-cta-whatsapp"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.15rem",
                  borderRadius: "var(--radius-md, 8px)",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  textDecoration: "none",
                  backgroundColor: "#22c55e",
                  color: "#ffffff",
                }}
              >
                <span>Atención por WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Copyright */}
      <div
        style={{
          maxWidth: "1320px",
          margin: "0 auto",
          padding: "1.5rem 1.25rem 0 1.25rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "#64748b",
        }}
      >
        <div>
          © {new Date().getFullYear()} {settings.storeName}. Todos los derechos reservados.
        </div>

        <div style={{ display: "flex", gap: "1.25rem" }}>
          <Link href="/politicas" style={{ color: "#94a3b8" }}>Privacidad</Link>
          <Link href="/politicas" style={{ color: "#94a3b8" }}>Términos y Condiciones</Link>
          <Link href="/faq" style={{ color: "#94a3b8" }}>Ayuda</Link>
          <Link href="/admin/login" style={{ color: "#64748b" }}>Admin</Link>
        </div>
      </div>
    </footer>
  );
}
