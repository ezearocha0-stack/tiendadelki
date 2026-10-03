"use client";

import { useState } from "react";
import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQS: FaqItem[] = [
  {
    category: "Compras y Pedidos",
    question: "¿Cómo realizo una compra en TiendaDelki?",
    answer: "Puedes comprar de dos formas: directamente en nuestra tienda web agregando productos al carrito y completando el checkout seguro, o solicitando tu orden en 1 solo clic por WhatsApp donde un asesor te atenderá personalmente.",
  },
  {
    category: "Compras y Pedidos",
    question: "¿Tienen tienda física donde pueda ver los productos antes de comprar?",
    answer: "¡Sí! Contamos con un showroom físico en la Av. Winston Churchill #105, Santo Domingo, donde puedes ver los productos, probarlos y pagar directamente en tienda en horario de Lunes a Sábado de 9:00 AM a 7:00 PM y Domingos de 10:00 AM a 3:00 PM.",
  },
  {
    category: "Compras y Pedidos",
    question: "¿Qué significa si un producto o variante dice 'Agotado'?",
    answer: "En TiendaDelki manejamos inventario en tiempo real. Si una variante o producto indica 'Agotado', significa que no tenemos stock disponible en este momento y el sistema bloquea su compra para garantizar que nunca pagues por algo que no podamos entregarte de inmediato.",
  },
  {
    category: "Pagos y Facturación",
    question: "¿Cuáles son las cuentas bancarias autorizadas para transferencias?",
    answer: "Aceptamos depósitos y transferencias a nuestras cuentas oficiales empresariales en Banco Popular Dominicano, Banco BHD y Banreservas. Al completar tu pedido en la web o por WhatsApp, recibirás los números de cuenta exactos para realizar tu transferencia.",
  },
  {
    category: "Pagos y Facturación",
    question: "¿Cómo envío el comprobante de pago?",
    answer: "Una vez realizada la transferencia o depósito, puedes presionar el botón 'Enviar Comprobante por WhatsApp' en la pantalla de confirmación de tu pedido, o enviarlo directamente a nuestro WhatsApp oficial (809) 555-0199 indicando tu número de orden (ej. #TK-2609-0001).",
  },
  {
    category: "Envíos y Entregas",
    question: "¿Cuánto tarda en llegar mi pedido?",
    answer: "Para el Gran Santo Domingo (Distrito Nacional, Este, Norte y Oeste), las entregas se realizan el mismo día o en 24 horas laborables. Para el interior del país (Santiago, La Vega, Puerto Plata, La Romana, etc.), los envíos se procesan vía transporte expreso certificado y tardan entre 24 y 48 horas.",
  },
  {
    category: "Envíos y Entregas",
    question: "¿Cómo funciona el Envío Gratis?",
    answer: "Ofrecemos envío gratuito en el Gran Santo Domingo para compras a partir de RD$ 3,000, y para el interior del país a partir de RD$ 5,000. El descuento se aplica automáticamente en tu pantalla de checkout.",
  },
  {
    category: "Garantías y Devoluciones",
    question: "¿Los productos cuentan con garantía?",
    answer: "Todos nuestros productos nuevos cuentan con garantía contra defectos de fábrica de 30 a 90 días (dependiendo de la categoría). Conserva tu factura o número de pedido para cualquier reclamación.",
  },
  {
    category: "Garantías y Devoluciones",
    question: "¿Puedo cambiar una prenda si la talla o color no me queda?",
    answer: "Sí, dispones de 7 días continuos a partir de la entrega para solicitar un cambio de talla o color, siempre y cuando el producto conserve sus etiquetas originales, empaque y no muestre señales de uso.",
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todas");

  const categories = ["Todas", "Compras y Pedidos", "Pagos y Facturación", "Envíos y Entregas", "Garantías y Devoluciones"];

  const filteredFaqs = selectedCategory === "Todas"
    ? FAQS
    : FAQS.filter((f) => f.category === selectedCategory);

  function toggleItem(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>Preguntas Frecuentes</span>
        </nav>

        {/* Hero Header */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0 0 0.75rem", color: "var(--color-text-main)" }}>
            Preguntas Frecuentes (FAQ)
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1.05rem", maxWidth: "600px", margin: "0 auto" }}>
            Encuentra respuestas rápidas y claras a las consultas más habituales sobre compras, pagos por transferencia y envíos en toda República Dominicana.
          </p>
        </div>

        {/* Category Filter Chips */}
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: "2.5rem",
          }}
        >
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat);
                  setOpenIndex(null);
                }}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "9999px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  border: isSelected
                    ? "1px solid var(--color-primary, #2563eb)"
                    : "1px solid var(--color-border)",
                  backgroundColor: isSelected
                    ? "var(--color-primary, #2563eb)"
                    : "var(--color-surface)",
                  color: isSelected ? "#ffffff" : "var(--color-text-main)",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Accordion List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredFaqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                style={{
                  background: "var(--color-surface)",
                  borderRadius: "var(--radius-md, 12px)",
                  border: isOpen
                    ? "1px solid var(--color-primary, #2563eb)"
                    : "1px solid var(--color-border)",
                  overflow: "hidden",
                  boxShadow: isOpen ? "var(--shadow-sm)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1.25rem 1.5rem",
                    background: "transparent",
                    border: "none",
                    textAlign: "left",
                    cursor: "pointer",
                    fontSize: "1.05rem",
                    fontWeight: 600,
                    color: isOpen ? "var(--color-primary, #2563eb)" : "var(--color-text-main)",
                    gap: "1rem",
                  }}
                >
                  <span>{faq.question}</span>
                  <span
                    style={{
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                      color: "var(--color-text-muted)",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 1.5rem 1.25rem",
                      color: "var(--color-text-muted)",
                      fontSize: "0.95rem",
                      lineHeight: 1.6,
                      borderTop: "1px solid var(--color-border-subtle, rgba(0,0,0,0.04))",
                    }}
                  >
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Support CTA */}
        <div
          style={{
            marginTop: "3.5rem",
            padding: "2rem",
            borderRadius: "var(--radius-lg, 16px)",
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            ¿No encontraste lo que buscabas?
          </h2>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", margin: "0 0 1.25rem" }}>
            Escríbenos directamente por WhatsApp y nuestro equipo te responderá de inmediato.
          </p>
          <a
            href="https://wa.me/18095550199?text=Hola%20TiendaDelki,%20tengo%20una%20pregunta"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "#25D366",
              color: "#ffffff",
              padding: "0.75rem 1.75rem",
              borderRadius: "9999px",
              fontWeight: 700,
              fontSize: "0.95rem",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)",
            }}
          >
            Chatear con Soporte por WhatsApp
          </a>
        </div>
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
