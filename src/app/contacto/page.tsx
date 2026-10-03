"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";

export default function ContactoPage() {
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
    const storePhone = "18095550199";
    const text = encodeURIComponent(
      `👋 *¡Hola TiendaDelki!* Me gustaría comunicarme con atención al cliente sobre: ${formData.subject || "una consulta"}.`
    );
    window.open(`https://wa.me/${storePhone}?text=${text}`, "_blank");
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
            ¿Tienes alguna duda sobre un producto, un envío o una garantía? Contáctanos y nuestro equipo te responderá de inmediato.
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
                Canales de Atención
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
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
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>WhatsApp Inmediato</div>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", margin: "0.2rem 0 0.5rem" }}>
                      Respuesta en menos de 10 minutos en horario comercial.
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
                      Escríbenos al (809) 555-0199 →
                    </button>
                  </div>
                </div>

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
                      Av. Winston Churchill #105, Plaza Comercial Galerías, Nivel 1, Local 14.<br />
                      Santo Domingo, Distrito Nacional, República Dominicana.
                    </p>
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
                      <strong>Lunes a Sábado:</strong> 9:00 AM – 7:00 PM<br />
                      <strong>Domingos y Feriados:</strong> 10:00 AM – 3:00 PM
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Store Map Representation */}
            <div
              style={{
                background: "var(--color-surface)",
                borderRadius: "var(--radius-lg, 16px)",
                border: "1px solid var(--color-border)",
                padding: "1.5rem",
                boxShadow: "var(--shadow-sm)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  height: "180px",
                  borderRadius: "var(--radius-md, 8px)",
                  background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  color: "#475569",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <svg width="40" height="40" fill="currentColor" viewBox="0 0 24 24" style={{ color: "#ef4444" }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <div style={{ fontWeight: 700, fontSize: "1rem" }}>TiendaDelki Santo Domingo</div>
                <div style={{ fontSize: "0.8125rem" }}>Av. Winston Churchill #105</div>
              </div>
              <a
                href="https://maps.google.com/?q=Santo+Domingo+Distrito+Nacional"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-block",
                  marginTop: "1rem",
                  fontSize: "0.875rem",
                  color: "var(--color-primary, #2563eb)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Abrir en Google Maps →
              </a>
            </div>
          </div>

          {/* Contact Message Form */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px solid var(--color-border)",
              padding: "2rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
              Envíanos un Mensaje
            </h2>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem", margin: "0 0 1.5rem" }}>
              Llena el siguiente formulario y nos pondremos en contacto contigo a la brevedad.
            </p>

            {submitted ? (
              <div
                style={{
                  padding: "2.5rem 1.5rem",
                  textAlign: "center",
                  background: "rgba(16, 185, 129, 0.08)",
                  borderRadius: "var(--radius-md, 8px)",
                  border: "1px solid #10b981",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    background: "#10b981",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1rem",
                  }}
                >
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
                  ¡Mensaje Enviado con Éxito!
                </h3>
                <p style={{ fontSize: "0.95rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
                  Gracias por comunicarte con TiendaDelki. Nuestro equipo te responderá a tu correo o WhatsApp muy pronto.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  style={{
                    background: "var(--color-primary, #2563eb)",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "var(--radius-sm, 6px)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Tu nombre"
                    value={formData.name}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }} className="form-row-2">
                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                      Correo Electrónico *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="tu@correo.com"
                      value={formData.email}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm, 6px)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.95rem",
                        background: "var(--color-bg)",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      placeholder="809-000-0000"
                      value={formData.phone}
                      onChange={handleChange}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        borderRadius: "var(--radius-sm, 6px)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.95rem",
                        background: "var(--color-bg)",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Asunto
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Consulta general">Consulta general de productos</option>
                    <option value="Estado de un pedido">Estado de mi pedido online</option>
                    <option value="Cotización o ventas al por mayor">Cotización o venta corporativa</option>
                    <option value="Garantías y devoluciones">Garantías y devoluciones</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Mensaje *
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={4}
                    placeholder="Escribe aquí tu consulta..."
                    value={formData.message}
                    onChange={handleChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    backgroundColor: "var(--color-primary, #2563eb)",
                    color: "#ffffff",
                    padding: "0.9rem 1.5rem",
                    borderRadius: "var(--radius-md, 8px)",
                    fontWeight: 700,
                    fontSize: "1rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                >
                  Enviar Mensaje
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />

      <style jsx>{`
        @media (min-width: 768px) {
          .form-row-2 {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (min-width: 900px) {
          .contact-grid {
            grid-template-columns: 420px 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
