import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { getPublicStoreSettings } from "@/lib/server-api";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuestra Tienda Física y Filosofía - TiendaDelki",
  description: "Conoce más sobre TiendaDelki, nuestra historia, tienda física en República Dominicana y nuestro compromiso con el servicio y la calidad.",
};

export default async function NuestraTiendaPage() {
  const settings = await getPublicStoreSettings();
  const locationLabel = `${settings.city}, ${settings.province}`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "1000px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>Nuestra Tienda</span>
        </nav>

        {/* Hero Section */}
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span
            style={{
              display: "inline-block",
              background: "var(--color-primary-light, rgba(37,99,235,0.1))",
              color: "var(--color-primary, #2563eb)",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Nuestra Historia y Visión
          </span>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 1rem", color: "var(--color-text-main)" }}>
            De la Tienda Física a la Experiencia Digital
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1.15rem", maxWidth: "700px", margin: "0 auto", lineHeight: 1.6 }}>
            En {settings.storeName} fusionamos la cercanía, calidez y confianza del comercio físico tradicional con la eficiencia y rapidez de una moderna plataforma de comercio electrónico.
          </p>
        </div>

        {/* Story Card */}
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-lg, 16px)",
            border: "1px solid var(--color-border)",
            padding: "2.5rem",
            boxShadow: "var(--shadow-sm)",
            marginBottom: "3rem",
            lineHeight: 1.8,
            fontSize: "1.05rem",
            color: "var(--color-text-main)",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1rem" }}>
            ¿Quiénes Somos?
          </h2>
          <p style={{ margin: "0 0 1.25rem", color: "var(--color-text-muted)" }}>
            {settings.storeName} nació con un objetivo claro: ofrecer a las familias y profesionales dominicanos productos de primera calidad, garantizados y con precios justos. Desde nuestro punto de venta en {locationLabel}, atendemos diariamente a clientes que buscan atención personalizada y asesoría experta.
          </p>
          <p style={{ margin: "0 0 1.25rem", color: "var(--color-text-muted)" }}>
            Nuestra plataforma web responde a la necesidad de nuestros clientes de poder consultar nuestro catálogo con <strong>inventario real en tiempo real</strong>, verificar la disponibilidad de artículos antes de visitarnos y gestionar sus pedidos o compras para retiro directo en nuestra tienda física en Montecristi.
          </p>
          <p style={{ margin: 0, color: "var(--color-text-muted)" }}>
            No somos un intermediario anónimo. Detrás de cada atención en mostrador y de cada mensaje de WhatsApp hay un equipo humano comprometido con tu satisfacción y tranquilidad.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, textAlign: "center", marginBottom: "2rem" }}>
          Nuestros Cuatro Pilares
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3.5rem",
          }}
        >
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.75rem",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📦</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Inventario Real
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
              Lo que ves en la web está disponible y reservado en nuestro stock físico inmediatamente.
            </p>
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.75rem",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🛡️</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Garantía Local
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
              Cuentas con respaldo y soporte técnico directamente con nosotros en República Dominicana.
            </p>
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.75rem",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🏪</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Venta y Retiro Local
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
              Atención presencial y retiro directo en nuestra tienda física en San Fernando de Montecristi.
            </p>
          </div>

          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.75rem",
              textAlign: "center",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>💬</div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Atención Humana
            </h3>
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", margin: 0 }}>
              Respuestas rápidas, fotos adicionales y asesoría uno a uno por WhatsApp en todo momento.
            </p>
          </div>
        </div>

        {/* Showroom Visit Box */}
        <div
          style={{
            background: "linear-gradient(135deg, var(--color-surface) 0%, rgba(37,99,235,0.04) 100%)",
            borderRadius: "var(--radius-lg, 16px)",
            border: "1px solid var(--color-border)",
            padding: "2.5rem 2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.75rem" }}>
            Visita Nuestra Tienda Física en {locationLabel}
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", maxWidth: "600px", margin: "0 0 1.5rem" }}>
            Ven a conocernos en {settings.address ? `${settings.address}, ` : ""}{settings.sector ? `${settings.sector}, ` : ""}{locationLabel}. Prueba los productos en persona y retira tus pedidos realizados por la web.
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link
              href="/contacto"
              style={{
                backgroundColor: "var(--color-primary, #2563eb)",
                color: "#ffffff",
                padding: "0.85rem 1.75rem",
                borderRadius: "var(--radius-md, 8px)",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.95rem",
              }}
            >
              Ver Dirección y Horarios
            </Link>
            <Link
              href="/tienda"
              style={{
                backgroundColor: "transparent",
                color: "var(--color-text-main)",
                border: "1px solid var(--color-border)",
                padding: "0.85rem 1.75rem",
                borderRadius: "var(--radius-md, 8px)",
                fontWeight: 600,
                textDecoration: "none",
                fontSize: "0.95rem",
              }}
            >
              Explorar Catálogo
            </Link>
          </div>
        </div>
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
