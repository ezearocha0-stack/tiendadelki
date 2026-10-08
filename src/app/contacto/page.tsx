"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatWhatsAppPhone } from "@/core/whatsapp/whatsapp-helper";

export default function ContactoPage() {
  const { settings, fullAddress, scheduleSummary } = useStoreSettings();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Consulta general",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleDirectWhatsApp() {
    const formatted = formatWhatsAppPhone(settings.whatsapp);
    const text = encodeURIComponent(
      `👋 *¡Hola ${settings.storeName}!* Me gustaría comunicarme con atención al cliente sobre: ${formData.subject || "una consulta"}.`
    );
    window.open(`https://wa.me/${formatted}?text=${text}`, "_blank");
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>Contacto</span>
        </nav>

        {/* Hero Banner */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0 0 0.75rem", color: "var(--color-text-main)" }}>
            Estamos a tu Disposición
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem", maxWidth: "600px", margin: "0 auto" }}>
            ¿Tienes alguna duda sobre un producto, tu compra o el retiro en tienda? Contáctanos y nuestro equipo te atenderá de inmediato.
          </p>
        </div>

        {/* Grid: Information & Form */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "2.5rem",
          }}
          className="contact-grid"
        >
          {/* Info Card */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div
              style={{
                background: "var(--color-surface)",
                borderRadius: "var(--radius-lg, 16px)",
                border: "1px solid var(--color-border)",
                padding: "2rem",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 1.5rem" }}>
                Canales de Atención Oficial
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {settings.whatsapp && (
                  <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                    <div
                      style={{
                        width: "44px",
                        height: "44px",
                        borderRadius: "10px",
                        background: "rgba(37, 211, 102, 0.12)",
                        color: "#16a34a",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>WhatsApp Oficial</div>
                      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.2rem 0 0.5rem" }}>
                        Atención directa para consultas y seguimiento de pedidos.
                      </p>
                      <button
                        onClick={handleDirectWhatsApp}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#16a34a",
                          fontWeight: 700,
                          fontSize: "0.95rem",
                          padding: 0,
                          cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        Escríbenos al {settings.whatsapp} →
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "rgba(37, 99, 235, 0.1)",
                      color: "var(--color-primary, #2563eb)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>Ubicación de Tienda Física</div>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.2rem 0 0" }}>
                      {fullAddress}
                    </p>
                    {(settings.phone || settings.secondaryPhone) && (
                      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                        <strong>Teléfono:</strong> {[settings.phone, settings.secondaryPhone].filter(Boolean).join(" / ")}
                      </p>
                    )}
                    {settings.email && (
                      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", margin: "0.25rem 0 0" }}>
                        <strong>Email:</strong> {settings.email}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "10px",
                      background: "rgba(147, 51, 234, 0.1)",
                      color: "#9333ea",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>Horario de Atención</div>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.2rem 0 0" }}>
                      <strong>{settings.scheduleDays}:</strong> {settings.scheduleOpen} – {settings.scheduleClose}<br />
                      {settings.scheduleText && <span><strong>Nota:</strong> {settings.scheduleText}</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mensaje de Envíos */}
            <div
              style={{
                background: "var(--color-surface)",
                borderRadius: "var(--radius-lg, 16px)",
                border: "1px solid var(--color-border)",
                padding: "1.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
                Modalidad de Venta y Retiro
              </h3>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: 0 }}>
                {settings.deliveryMessage}
              </p>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
