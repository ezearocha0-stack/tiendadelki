import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos, Condiciones y Políticas - TiendaDelki",
  description: "Políticas de envío, pagos por transferencia, cambios y privacidad de TiendaDelki República Dominicana.",
};

export default function PoliticasPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "960px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>Políticas y Condiciones</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--color-text-main)" }}>
            Políticas de la Tienda y Términos de Servicio
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1rem" }}>
            Última actualización: Septiembre 2026 • TiendaDelki SRL, Santo Domingo, República Dominicana.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {/* 1. Politica de Envios */}
          <section
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px solid var(--color-border)",
              padding: "2rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-main)" }}>
              1. Política de Envíos y Tiempos de Entrega
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                En <strong>TiendaDelki</strong> realizamos envíos a todo el territorio de la República Dominicana bajo dos modalidades principales:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Gran Santo Domingo (Distrito Nacional, Santo Domingo Este, Norte y Oeste):</strong> Entregas locales realizadas por mensajería propia o servicios motorizados de confianza en un plazo de 24 horas laborables.
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Provincias e Interior del País:</strong> Envíos despachados a través de empresas de transporte expreso certificadas (Metro Pac, Caribe Tours, BM Cargo, Vimenpaq) con un tiempo estimado de 24 a 48 horas laborables.
                </li>
              </ul>
              <p style={{ margin: 0 }}>
                El costo del envío se calcula de forma transparente al momento del checkout. Si tu compra cumple el monto mínimo de la promoción de <strong>Envío Gratis</strong> (RD$ 3,000 en Santo Domingo o RD$ 5,000 en el interior), el envío se aplicará sin costo de forma automática.
              </p>
            </div>
          </section>

          {/* 2. Politica de Pagos */}
          <section
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px solid var(--color-border)",
              padding: "2rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-main)" }}>
              2. Modalidad de Pago: Transferencias y Depósitos
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                Para brindar la máxima seguridad a nuestros clientes, las compras online se procesan mediante <strong>depósito o transferencia bancaria directa</strong> en nuestras cuentas comerciales autorizadas:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
                <li style={{ marginBottom: "0.35rem" }}>Banco Popular Dominicano</li>
                <li style={{ marginBottom: "0.35rem" }}>Banco BHD</li>
                <li style={{ marginBottom: "0.35rem" }}>Banco de Reservas (Banreservas)</li>
              </ul>
              <p style={{ margin: "0 0 1rem" }}>
                Al finalizar tu pedido en la plataforma web, los productos quedarán <strong>reservados provisionalmente durante 24 horas</strong>. Para completar la orden, debes enviar el comprobante de la transferencia por WhatsApp con tu número de pedido (#TK-...). Una vez confirmado por nuestro departamento contable, el pedido pasa inmediatamente a preparación y despacho.
              </p>
              <p style={{ margin: 0 }}>
                En nuestra tienda física de Santo Domingo, aceptamos además pagos en efectivo y tarjetas de débito/crédito en el punto de venta.
              </p>
            </div>
          </section>

          {/* 3. Cambios y Devoluciones */}
          <section
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px solid var(--color-border)",
              padding: "2rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-main)" }}>
              3. Política de Cambios y Garantía
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                Tu satisfacción es nuestra prioridad. Cuentas con un plazo de <strong>7 días calendario</strong> tras recibir tu pedido para solicitar un cambio de producto o talla bajo las siguientes condiciones:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
                <li style={{ marginBottom: "0.35rem" }}>El producto debe estar sin uso, con sus etiquetas adheridas y en su empaque original.</li>
                <li style={{ marginBottom: "0.35rem" }}>Presentar el número de pedido o la factura física emitida.</li>
                <li style={{ marginBottom: "0.35rem" }}>Los cambios por defectos de fabricación son cubiertos en su totalidad por TiendaDelki, incluyendo los costos de reenvío.</li>
              </ul>
              <p style={{ margin: 0 }}>
                Para iniciar un cambio o solicitar garantía, contáctanos directamente a nuestro canal de WhatsApp de atención posventa.
              </p>
            </div>
          </section>

          {/* 4. Privacidad y Datos */}
          <section
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px solid var(--color-border)",
              padding: "2rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-main)" }}>
              4. Privacidad y Protección de Datos
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                En <strong>TiendaDelki</strong> respetamos estrictamente tu privacidad. Los datos personales recolectados en el formulario de compra (nombre, teléfono, WhatsApp, dirección física y notas) son utilizados con el propósito exclusivo de gestionar tu pedido, coordinar la entrega y mantenerte informado sobre el estatus de tu paquete.
              </p>
              <p style={{ margin: 0 }}>
                Nunca vendemos, alquilamos ni compartimos tus datos personales con terceros para fines comerciales o de publicidad ajena a TiendaDelki.
              </p>
            </div>
          </section>
        </div>
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
