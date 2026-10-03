"use client";

import Link from "next/link";

export function StoreFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#0f172a",
        borderTop: "1px solid #1e293b",
        color: "#94a3b8",
        paddingTop: "3.5rem",
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
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "2.5rem",
          marginBottom: "3rem",
        }}
      >
        {/* Columna 1: Tienda y Misión */}
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
              Tienda<span style={{ color: "#38bdf8" }}>Delki</span>
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: "600" }}>
              Tienda Física & Online • República Dominicana
            </div>
          </div>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#94a3b8", marginBottom: "1.25rem" }}>
            Tu tienda de confianza en Santo Domingo. Moda, calzado y accesorios seleccionados con inventario verificado y envíos a todas las provincias.
          </p>
          <div style={{ fontSize: "0.825rem", display: "flex", flexDirection: "column", gap: "0.4rem", color: "#cbd5e1" }}>
            <div><strong>Ubicación:</strong> Santo Domingo, Distrito Nacional, R.D.</div>
            <div><strong>Teléfono:</strong> (809) 555-0100</div>
            <div><strong>Horario:</strong> Lun - Sáb: 9:00 AM - 7:00 PM</div>
          </div>
        </div>

        {/* Columna 2: Navegación y Enlaces Rápidos */}
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Comprar & Explorar
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.875rem" }}>
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
              <Link href="/faq" style={{ color: "#cbd5e1" }}>Preguntas Frecuentes</Link>
            </li>
            <li>
              <Link href="/politicas" style={{ color: "#cbd5e1" }}>Términos y Envíos</Link>
            </li>
          </ul>
        </div>

        {/* Columna 3: Información Bancaria Oficial */}
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Pagos Oficiales
          </h3>
          <p style={{ fontSize: "0.825rem", color: "#94a3b8", marginBottom: "0.85rem" }}>
            Aceptamos transferencias y depósitos bancarios autorizados con confirmación rápida:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.825rem" }}>
            <div style={{ padding: "0.6rem 0.85rem", backgroundColor: "#1e293b", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#60a5fa" }}>Banco Popular Dominicano</strong>
              <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Cta. Corriente Empresarial</div>
            </div>
            <div style={{ padding: "0.6rem 0.85rem", backgroundColor: "#1e293b", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#34d399" }}>Banreservas</strong>
              <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Cta. de Ahorros Empresarial</div>
            </div>
            <div style={{ padding: "0.6rem 0.85rem", backgroundColor: "#1e293b", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <strong style={{ color: "#fbbf24" }}>Banco BHD</strong>
              <div style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Cta. de Ahorros</div>
            </div>
          </div>
        </div>

        {/* Columna 4: Cobertura de Envíos y WhatsApp */}
        <div>
          <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "1rem" }}>
            Envíos y Contacto
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.825rem", color: "#cbd5e1" }}>
            <li><strong>Gran Santo Domingo:</strong> Entrega rápida en 24h.</li>
            <li><strong>Interior del País:</strong> Vía Caribe Tours, Metro Pac y BM Cargo.</li>
            <li><strong>Recogida en Tienda:</strong> Disponible sin costo adicional.</li>
          </ul>

          <div style={{ marginTop: "1.25rem" }}>
            <a
              href="https://wa.me/18095550100?text=Hola%20TiendaDelki,%20quiero%20hacer%20un%20pedido"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cta-whatsapp"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.6rem 1.15rem",
                borderRadius: "var(--radius-md)",
                fontWeight: "600",
                fontSize: "0.85rem",
                textDecoration: "none",
              }}
            >
              <span>Atención por WhatsApp</span>
            </a>
          </div>
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
          © {new Date().getFullYear()} TiendaDelki. Todos los derechos reservados.
        </div>

        <div style={{ display: "flex", gap: "1.25rem" }}>
          <Link href="/politicas" style={{ color: "#94a3b8" }}>Privacidad</Link>
          <Link href="/politicas" style={{ color: "#94a3b8" }}>Términos y Envíos</Link>
          <Link href="/faq" style={{ color: "#94a3b8" }}>Ayuda</Link>
          <Link href="/admin/login" style={{ color: "#64748b" }}>Admin</Link>
        </div>
      </div>
    </footer>
  );
}
