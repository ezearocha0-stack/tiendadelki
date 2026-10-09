import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { getOrderByNumber, getBankAccounts } from "@/lib/server-api";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { formatCurrency } from "@/lib/formatters";
import { OrderConfirmationActions } from "@/components/store/order-confirmation-actions";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

interface OrderConfirmationPageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams?: Promise<{ token?: string }>;
}

export async function generateMetadata({ params }: OrderConfirmationPageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Pedido #${orderNumber} Confirmado - TiendaDelki`,
    description: `Detalles y estado de tu pedido #${orderNumber} en TiendaDelki República Dominicana.`,
  };
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; color: string; step: number; icon: string }
> = {
  PENDIENTE_DE_PAGO: {
    label: "PENDIENTE DE PAGO",
    bg: "#fef3c7",
    color: "#b45309",
    step: 1,
    icon: "⏳",
  },
  PAGO_EN_REVISION: {
    label: "PAGO EN REVISIÓN",
    bg: "#dbeafe",
    color: "#1e40af",
    step: 1,
    icon: "⏱️",
  },
  PAGADO: {
    label: "PAGO CONFIRMADO",
    bg: "#dcfce7",
    color: "#15803d",
    step: 2,
    icon: "✅",
  },
  PREPARANDO: {
    label: "EN PREPARACIÓN",
    bg: "#ede9fe",
    color: "#6d28d9",
    step: 3,
    icon: "📦",
  },
  ENVIADO: {
    label: "EN CAMINO / DESPACHADO",
    bg: "#e0f2fe",
    color: "#0369a1",
    step: 4,
    icon: "🚚",
  },
  ENTREGADO: {
    label: "ENTREGADO",
    bg: "#d1fae5",
    color: "#047857",
    step: 5,
    icon: "🎉",
  },
  COMPLETADO: {
    label: "ORDEN COMPLETADA",
    bg: "#f1f5f9",
    color: "#334155",
    step: 5,
    icon: "⭐",
  },
  CANCELADO: {
    label: "CANCELADO",
    bg: "#fee2e2",
    color: "#b91c1c",
    step: 0,
    icon: "🛑",
  },
};

const ORDER_STEPS = [
  { step: 1, label: "Recibido" },
  { step: 2, label: "Pagado" },
  { step: 3, label: "Preparando" },
  { step: 4, label: "En Camino" },
  { step: 5, label: "Entregado" },
];

export default async function OrderConfirmationPage({ params, searchParams }: OrderConfirmationPageProps) {
  const { orderNumber } = await params;
  const cleanNumber = orderNumber.trim().toUpperCase().replace(/^#/, "");

  // 1. Obtener token desde Cookie HttpOnly en el dominio de Vercel (flujo estándar seguro)
  const cookieStore = await cookies();
  const cookieToken =
    cookieStore.get(`order_token_${cleanNumber}`)?.value ||
    cookieStore.get("order_token")?.value;

  // 2. Fallback opcional por query param si viene de un enlace directo autorizado
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const queryToken = resolvedSearchParams?.token;

  const token = cookieToken || queryToken;

  // 3. Consultar pedido enviando el token (sin token válido, getOrderByNumber no devuelve datos privados)
  const [order, bankAccounts] = await Promise.all([
    getOrderByNumber(orderNumber, token),
    getBankAccounts(),
  ]);

  if (!order) {
    notFound();
  }

  // 4. Si el visitante no tiene autorización para datos privados (shippingAddress no presente),
  // redirigir al portal público de rastreo para no mostrar la confirmación privada.
  if (!order.shippingAddress) {
    redirect(`/rastreo?guia=${encodeURIComponent(cleanNumber)}`);
  }

  // Parseo resiliente y defensivo de dirección de entrega (soporta objeto, string JSON o null/undefined)
  const shippingAddr =
    typeof order.shippingAddress === "string"
      ? (() => {
          try {
            return JSON.parse(order.shippingAddress);
          } catch {
            return {};
          }
        })()
      : (order.shippingAddress as Record<string, string>) || {};

  const subtotal = Number(order.subtotal || 0);
  const shippingCost = Number(order.shippingCost || 0);
  const total = Number(order.total || 0);

  const statusMeta = STATUS_CONFIG[order.status] || {
    label: order.status || "RECIBIDO",
    bg: "#f3f4f6",
    color: "#374151",
    step: 1,
    icon: "📋",
  };

  const formattedAccounts = (bankAccounts || []).map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    accountType: a.accountType,
    holderName: a.holderName,
    holderId: a.holderId,
    instructions: a.instructions,
  }));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2.5rem 1rem", maxWidth: "900px", width: "100%", margin: "0 auto" }}>
        {/* Success Header Card */}
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-lg, 16px)",
            border: "1px solid var(--color-border)",
            padding: "2.5rem 1.5rem",
            textAlign: "center",
            boxShadow: "var(--shadow-md)",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              width: "72px",
              height: "72px",
              borderRadius: "50%",
              background: order.status === "CANCELADO" ? "#fee2e2" : "#dcfce7",
              color: order.status === "CANCELADO" ? "#dc2626" : "#15803d",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
              fontSize: "2rem",
            }}
          >
            {order.status === "CANCELADO" ? "✕" : "✓"}
          </div>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: statusMeta.bg,
              color: statusMeta.color,
              fontSize: "0.8125rem",
              fontWeight: 800,
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              marginBottom: "0.85rem",
            }}
          >
            {statusMeta.icon} {statusMeta.label}
          </span>

          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0 0 0.5rem" }}>
            {order.status === "CANCELADO"
              ? `Pedido #${order.orderNumber} Cancelado`
              : `¡Gracias por tu compra, ${order.guestName || "Cliente"}!`}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "1rem", margin: "0 0 1.25rem" }}>
            {order.status === "CANCELADO"
              ? "Este pedido ha sido cancelado por nuestro equipo administrativo."
              : "Hemos registrado tu pedido con éxito bajo el identificador único:"}
          </p>

          <div
            style={{
              display: "inline-block",
              background: "var(--color-primary-light, rgba(37,99,235,0.08))",
              color: "var(--color-primary, #2563eb)",
              fontSize: "1.5rem",
              fontWeight: 800,
              letterSpacing: "1px",
              padding: "0.6rem 1.5rem",
              borderRadius: "var(--radius-md, 8px)",
              border: "1px dashed var(--color-primary, #2563eb)",
              marginBottom: "1.5rem",
            }}
          >
            #{order.orderNumber}
          </div>

          {/* Visual Progression Stepper (for active non-cancelled orders) */}
          {order.status !== "CANCELADO" && (
            <div
              style={{
                marginTop: "1.25rem",
                paddingTop: "1.5rem",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  position: "relative",
                  maxWidth: "550px",
                  margin: "0 auto",
                }}
              >
                {/* Stepper Progress Track */}
                <div
                  style={{
                    position: "absolute",
                    top: "14px",
                    left: "20px",
                    right: "20px",
                    height: "3px",
                    background: "#e2e8f0",
                    zIndex: 0,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    top: "14px",
                    left: "20px",
                    width: `${Math.min(100, Math.max(0, ((statusMeta.step - 1) / (ORDER_STEPS.length - 1)) * 100))}%`,
                    height: "3px",
                    background: "var(--color-primary, #2563eb)",
                    zIndex: 0,
                    transition: "width 0.3s ease",
                  }}
                />

                {ORDER_STEPS.map((s) => {
                  const isCompleted = statusMeta.step >= s.step;
                  const isCurrent = statusMeta.step === s.step;
                  return (
                    <div
                      key={s.step}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          background: isCompleted ? "var(--color-primary, #2563eb)" : "#ffffff",
                          border: isCompleted
                            ? "2px solid var(--color-primary, #2563eb)"
                            : "2px solid #cbd5e1",
                          color: isCompleted ? "#ffffff" : "#64748b",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          boxShadow: isCurrent ? "0 0 0 4px rgba(37,99,235,0.2)" : "none",
                        }}
                      >
                        {isCompleted ? "✓" : s.step}
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? "var(--color-primary, #2563eb)" : "var(--color-text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons: WhatsApp, Receipt, Tracking details */}
        <OrderConfirmationActions
          orderNumber={order.orderNumber}
          guestName={order.guestName || "Cliente"}
          guestPhone={order.guestPhone || ""}
          total={total}
          bankAccounts={formattedAccounts}
          initialStatus={order.status || "PENDIENTE_DE_PAGO"}
          initialProofUrl={order.proofOfPaymentUrl || null}
          proofRejectionReason={order.proofRejectionReason || null}
          carrierName={order.carrierName || null}
          trackingNumber={order.trackingNumber || null}
          trackingUrl={order.trackingUrl || null}
          shippedAt={
            order.shippedAt
              ? typeof order.shippedAt === "string"
                ? order.shippedAt
                : order.shippedAt instanceof Date
                ? order.shippedAt.toISOString()
                : String(order.shippedAt)
              : null
          }
        />

        {/* Order Details & Items Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "1.5rem",
            marginTop: "2rem",
          }}
          className="order-detail-grid"
        >
          {/* Items & Financial Breakdown */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>
              Productos en tu Orden
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", marginBottom: "1.25rem" }}>
              {(order.items || []).map((item: any, idx: number) => {
                const itemTitle = item.productTitle || item.title || "Producto";
                const itemVariant = item.variantTitle || item.variant || null;
                const itemSku = item.sku || null;
                const itemQuantity = Number(item.quantity || 1);
                const itemUnit = Number(item.unitPrice ?? item.price ?? 0);
                const itemTotal = Number(item.totalPrice ?? itemUnit * itemQuantity);

                return (
                  <div
                    key={item.id || item.sku || `order-item-${idx}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: "0.75rem",
                      borderBottom: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{itemTitle}</div>
                      <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                        {itemVariant ? `${itemVariant} • ` : ""}
                        {itemSku ? `SKU: ${itemSku} • ` : ""}Cant: {itemQuantity} × {formatCurrency(itemUnit)}
                      </div>
                    </div>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {formatCurrency(itemTotal)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-muted)" }}>
                  Envío ({order.shippingMethod?.name || order.shippingMethodName || "Método Seleccionado"})
                </span>
                <span style={{ fontWeight: 600, color: shippingCost === 0 ? "#10b981" : "inherit" }}>
                  {shippingCost === 0 ? "GRATIS" : formatCurrency(shippingCost)}
                </span>
              </div>
              <div style={{ height: "1px", background: "var(--color-border)", margin: "0.4rem 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 800 }}>
                <span>Total</span>
                <span style={{ color: "var(--color-primary, #2563eb)" }}>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Shipping & Delivery Address */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>
              Datos de Entrega
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.95rem" }}>
              <div>
                <strong style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", display: "block" }}>
                  Destinatario:
                </strong>
                {order.guestName || "Cliente"}
                {order.guestPhone
                  ? ` (${order.guestPhone}${order.guestWhatsapp ? ` / WhatsApp: ${order.guestWhatsapp}` : ""})`
                  : ""}
              </div>

              <div>
                <strong style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", display: "block" }}>
                  Dirección:
                </strong>
                {[
                  shippingAddr?.streetAddress,
                  shippingAddr?.sectorOrNeighborhood,
                  shippingAddr?.city,
                  shippingAddr?.provinceOrState,
                ]
                  .filter(Boolean)
                  .join(", ") || "Dirección registrada con el pedido"}
              </div>

              {shippingAddr?.deliveryNotes && (
                <div>
                  <strong style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", display: "block" }}>
                    Referencia de Entrega:
                  </strong>
                  {shippingAddr.deliveryNotes}
                </div>
              )}

              {order.customerNotes && (
                <div>
                  <strong style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", display: "block" }}>
                    Comentarios Adicionales:
                  </strong>
                  {order.customerNotes}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation actions */}
        <div style={{ textAlign: "center", marginTop: "3rem", display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link
            href={`/rastreo?guia=${encodeURIComponent(cleanNumber)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              backgroundColor: "rgba(37, 99, 235, 0.08)",
              color: "var(--color-primary, #2563eb)",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: "0.95rem",
              padding: "0.75rem 1.4rem",
              borderRadius: "10px",
              border: "1px solid rgba(37, 99, 235, 0.2)",
            }}
          >
            📦 Consultar en Portal de Rastreo
          </Link>
          <Link
            href="/tienda"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--color-text-muted)",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: "0.95rem",
              padding: "0.75rem 1.4rem",
            }}
          >
            ← Continuar comprando en el Catálogo
          </Link>
        </div>
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}