import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";

export const metadata = {
  title: "Página no encontrada - TiendaDelki",
  description: "La página que buscas no existe o ha sido movida.",
};

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <StoreHeader />

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "4rem 1.5rem",
          backgroundColor: "var(--color-bg, #f8fafc)",
        }}
      >
        <div
          style={{
            maxWidth: "500px",
            width: "100%",
            textAlign: "center",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            padding: "3rem 2rem",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              fontSize: "4rem",
              fontWeight: 900,
              color: "var(--color-primary, #2563eb)",
              lineHeight: 1,
              marginBottom: "1rem",
              letterSpacing: "-0.05em",
            }}
          >
            404
          </div>

          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "var(--color-text-main, #0f172a)",
              marginBottom: "0.75rem",
            }}
          >
            Página No Encontrada
          </h1>

          <p
            style={{
              fontSize: "0.95rem",
              color: "#64748b",
              lineHeight: 1.6,
              marginBottom: "2rem",
            }}
          >
            Lo sentimos, el enlace al que intentas acceder no existe, ha cambiado de dirección o ya no está disponible.
          </p>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "var(--color-primary, #2563eb)",
                color: "#ffffff",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              🏠 Ir al Inicio
            </Link>

            <Link
              href="/tienda"
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#f8fafc",
                color: "#334155",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              🛍️ Explorar Tienda
            </Link>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
