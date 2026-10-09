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

      <main style={{ flex: 1, padding: "clamp(1.5rem, 4vw, 2.5rem) clamp(0.75rem, 3vw, 1rem)", maxWidth: "960px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>Políticas y Condiciones</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--color-text-main)" }}>
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
              padding: "clamp(1.25rem, 3.5vw, 2rem)",
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

          {/* 3. Cambios y Garantias */}
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
              3. Cambios Comerciales y Garantías
            </h2>
            <div style={{ fontSize: "0.95rem", lineHeight: 1.7, color: "var(--color-text-muted)" }}>
              <p style={{ margin: "0 0 1rem" }}>
                En <strong>TiendaDelki</strong> procuramos que cada cliente quede plenamente satisfecho con su compra. Para brindarte un servicio ágil y transparente en nuestro establecimiento físico, aplicamos las siguientes directrices:
              </p>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", margin: "1.25rem 0 0.5rem" }}>
                A. Plazo comercial de 24 horas para cambios voluntarios (talla o preferencia)
              </h3>
              <p style={{ margin: "0 0 0.75rem" }}>
                Si deseas cambiar una prenda por ajuste de talla o preferencia de modelo, dispones de un plazo comercial de <strong>hasta 24 horas continuas</strong> a partir del momento de la entrega o el retiro en tienda física. Para procesar el cambio voluntario, es indispensable cumplir con los siguientes requisitos:
              </p>
              <ul style={{ paddingLeft: "1.25rem", margin: "0 1rem 1rem" }}>
                <li style={{ marginBottom: "0.35rem" }}>
                  <strong>Estado del artículo:</strong> La prenda debe conservar todas sus etiquetas originales intactas, no haber sido lavada ni usada, encontrarse libre de olores (como perfumes o desodorantes), manchas o roturas, y mantenerse en su empaque original.
                </li>
                <li style={{ marginBottom: "0.35rem" }}>
                  <strong>Comprobante:</strong> Es obligatorio presentar el número de pedido oficial o el recibo/factura de compra.
                </li>
                <li style={{ marginBottom: "0.35rem" }}>
                  <strong>Gestión presencial:</strong> Los cambios se efectúan de forma presencial en nuestra tienda en San Fernando de Montecristi y están sujetos a la disponibilidad de existencias en el inventario.
                </li>
              </ul>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", margin: "1.25rem 0 0.5rem" }}>
                B. Exclusiones por razones de higiene y mercancía en liquidación
              </h3>
              <p style={{ margin: "0 0 0.75rem" }}>
                Por estrictos motivos sanitarios, de higiene y cuidado de nuestros clientes, <strong>no se admiten cambios voluntarios en prendas íntimas, trajes de baño ni accesorios de uso personal directo</strong>. Asimismo, los artículos adquiridos en liquidación final o rebajas especiales no aplican para cambios voluntarios por preferencia o talla.
              </p>

              <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text-main)", margin: "1.25rem 0 0.5rem" }}>
                C. Reclamos por defectos de fábrica y derechos del consumidor
              </h3>
              <p style={{ margin: "0 0 1rem" }}>
                El plazo comercial de 24 horas regula exclusivamente los cambios voluntarios por gusto o ajuste de talla. Dicho plazo <strong>no limita ni sustituye tus derechos legales como consumidor</strong> conforme a la legislación aplicable en la República Dominicana (Ley No. 358-05 de Protección al Consumidor). Si recibes una prenda con defectos de fabricación comprobables o un artículo distinto al ordenado, atenderemos tu reclamo oportunamente para su correspondiente reposición o solución procedente, previa evaluación de la mercancía con su comprobante de compra.
              </p>

              <p style={{ margin: 0 }}>
                Para consultar disponibilidad de tallas o coordinar cualquier visita a la tienda, puedes escribirnos directamente a nuestro WhatsApp oficial de atención.
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
