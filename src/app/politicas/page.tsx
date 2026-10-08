import Link from "next/link";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos, Condiciones y Políticas - TiendaDelki",
  description: "Políticas de compra local, retiro en tienda, pagos y privacidad de TiendaDelki en Montecristi, República Dominicana.",
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
            TiendaDelki • San Fernando de Montecristi, República Dominicana.
          </p>
        </div>

        {/* Content Sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          {/* 1. Modalidad de Operacion y Retiro */}
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
              1. Modalidad de Operación, Ventas y Retiro de Pedidos
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                En <strong>TiendaDelki</strong> operamos localmente en <strong>San Fernando de Montecristi, República Dominicana</strong>, atendiendo a nuestros clientes mediante ventas presenciales y catálogo digital con inventario en tiempo real:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Ventas Locales y Retiro en Tienda:</strong> Los pedidos realizados a través de nuestra plataforma web o por WhatsApp quedan reservados para ser retirados directamente por el cliente en nuestra tienda física en Montecristi.
                </li>
                <li style={{ marginBottom: "0.5rem" }}>
                  <strong>Entregas a Domicilio y Envíos:</strong> Actualmente <strong>NO disponemos de servicio de entrega a domicilio ni envíos a otras ciudades</strong>. No se cobran tarifas de delivery ni se realizan envíos interurbanos por el momento.
                </li>
              </ul>
              <p style={{ margin: 0 }}>
                Al confirmar tu orden, te informaremos sobre el estado de preparación de tu compra para que puedas pasar a retirarla cómodamente por nuestro local.
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
              2. Métodos de Pago
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                Para mayor comodidad y transparencia, aceptamos las siguientes formas de pago:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
                <li style={{ marginBottom: "0.35rem" }}>
                  <strong>Transferencia o Depósito Bancario:</strong> A las cuentas bancarias oficiales autorizadas mostradas al momento de confirmar tu pedido.
                </li>
                <li style={{ marginBottom: "0.35rem" }}>
                  <strong>Pago Presencial:</strong> Pago directo en nuestra tienda física al momento de retirar tu pedido.
                </li>
              </ul>
              <p style={{ margin: 0 }}>
                Si seleccionas pago por transferencia, deberás enviar el comprobante por WhatsApp junto a tu número de pedido para validar tu reserva antes del retiro.
              </p>
            </div>
          </section>

          {/* 3. Cambios y Garantia */}
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
              3. Cambios y Garantía
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                Tu satisfacción con cada compra es fundamental. Puedes solicitar el cambio de un producto o talla en nuestra tienda física bajo las siguientes pautas:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 0 1rem" }}>
                <li style={{ marginBottom: "0.35rem" }}>El producto debe encontrarse sin uso, con sus etiquetas adheridas y en su empaque original.</li>
                <li style={{ marginBottom: "0.35rem" }}>Presentar el número de pedido o constancia de compra.</li>
                <li style={{ marginBottom: "0.35rem" }}>Los cambios se gestionan presencialmente en nuestro local en Montecristi.</li>
              </ul>
              <p style={{ margin: 0 }}>
                Para consultar disponibilidad de tallas antes de pasar por la tienda, contáctanos directamente a nuestro WhatsApp de atención al cliente.
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
                En <strong>TiendaDelki</strong> respetamos y protegemos la privacidad de nuestros clientes. Los datos proporcionados en los formularios de la tienda (nombre, teléfono, WhatsApp y notas) se utilizan exclusivamente para procesar tu orden, coordinar el retiro en tienda y brindarte asesoría personalizada.
              </p>
              <p style={{ margin: 0 }}>
                No compartimos, vendemos ni cedemos tus datos personales a terceros bajo ninguna circunstancia.
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
