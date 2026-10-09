"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { useWhatsApp } from "@/hooks/use-whatsapp";

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  holderName: string;
  holderId: string;
  instructions: string | null;
}

interface OrderConfirmationActionsProps {
  orderNumber: string;
  guestName: string;
  guestPhone: string;
  total: number;
  bankAccounts: BankAccount[];
  initialStatus: string;
  initialProofUrl?: string | null;
  proofRejectionReason?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippedAt?: string | null;
}

export function OrderConfirmationActions({
  orderNumber,
  guestName,
  guestPhone,
  total,
  bankAccounts,
  initialStatus,
  initialProofUrl = null,
  proofRejectionReason = null,
  carrierName = null,
  trackingNumber = null,
  trackingUrl = null,
  shippedAt = null,
}: OrderConfirmationActionsProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTracking, setCopiedTracking] = useState(false);
  const [status, setStatus] = useState<string>(initialStatus);
  const [proofUrl, setProofUrl] = useState<string | null>(initialProofUrl);
  const [rejectionReason, setRejectionReason] = useState<string | null>(proofRejectionReason);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && orderNumber) {
      try {
        localStorage.setItem("tiendadelki_last_order", orderNumber);
      } catch {
        // ignore
      }
    }
  }, [orderNumber]);

  function handleCopy(accountNumber: string, id: string) {
    navigator.clipboard.writeText(accountNumber);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  function handleCopyTracking(trackNum: string) {
    navigator.clipboard.writeText(trackNum);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2500);
  }

  const { formattedPhone: storePhone } = useWhatsApp();

  function handleSendWhatsApp(customMsg?: string) {
    if (!storePhone) return;
    const text =
      customMsg ||
      [
        `👋 *¡Hola TiendaDelki!* Acabo de realizar el pedido *#${orderNumber}*.`,
        "",
        `👤 *Cliente:* ${guestName}`,
        `📞 *Teléfono:* ${guestPhone}`,
        `💰 *Monto a pagar:* ${formatCurrency(total)}`,
        "",
        "📎 *Adjunto por aquí mi comprobante de pago bancario* para que por favor confirmen la orden e inicien el despacho.",
        "",
        "¡Muchas gracias!",
      ].join("\n");

    const url = `https://wa.me/${storePhone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("El archivo no debe superar los 10MB");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/orders/${orderNumber}/proof`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al subir el comprobante.");
      }

      setStatus("PAGO_EN_REVISION");
      setRejectionReason(null);
      setProofUrl(json.data?.proofOfPaymentUrl || null);
      setUploadSuccess("¡Comprobante recibido con éxito! Tu pedido ha pasado a estado PAGO EN REVISIÓN.");
    } catch (err: any) {
      console.error("Error al subir comprobante:", err);
      setUploadError(err.message || "Error al subir comprobante.");
    } finally {
      setIsUploading(false);
    }
  }

  const isPendingPayment = status === "PENDIENTE_DE_PAGO";
  const isUnderReview = status === "PAGO_EN_REVISION";
  const isPaid = status === "PAGADO";
  const isPreparing = status === "PREPARANDO";
  const isShipped = status === "ENVIADO";
  const isDelivered = status === "ENTREGADO";
  const isCompleted = status === "COMPLETADO";
  const isCancelled = status === "CANCELADO";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* 1. DISPATCH / TRACKING CARD (When carrier or tracking number exists or order is shipped/delivered/completed) */}
      {(trackingNumber || carrierName || isShipped || isDelivered || isCompleted) && (
        <div
          style={{
            background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
            border: "2px solid #16a34a",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "1.75rem",
            boxShadow: "0 4px 14px rgba(22, 163, 74, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>🚚</span>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#166534" }}>
              {isDelivered || isCompleted ? "Paquete Entregado con Éxito" : "¡Tu paquete ya está en camino!"}
            </h3>
          </div>

          <p style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", color: "#14532d" }}>
            {isDelivered || isCompleted
              ? "Confirmamos que tu paquete fue entregado satisfactoriamente. ¡Esperamos que disfrutes tus productos!"
              : "Hemos despachado tu pedido con la empresa de transporte correspondiente. A continuación los datos para su seguimiento:"}
          </p>

          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.25rem",
              border: "1px solid #bbf7d0",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "1rem",
              marginBottom: "1.25rem",
            }}
          >
            {carrierName && (
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                  Empresa Transportista
                </span>
                <strong style={{ fontSize: "1.05rem", color: "#111827" }}>{carrierName}</strong>
              </div>
            )}

            {trackingNumber && (
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                  Número de Guía / Tracking
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.2rem" }}>
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      color: "#166534",
                      background: "#f0fdf4",
                      padding: "0.2rem 0.6rem",
                      borderRadius: "6px",
                      border: "1px dashed #86efac",
                    }}
                  >
                    {trackingNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyTracking(trackingNumber)}
                    style={{
                      background: copiedTracking ? "#16a34a" : "#f3f4f6",
                      color: copiedTracking ? "#ffffff" : "#374151",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      padding: "0.25rem 0.6rem",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {copiedTracking ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            )}

            {shippedAt && (
              <div>
                <span style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>
                  Fecha de Despacho
                </span>
                <span style={{ fontSize: "0.95rem", color: "#374151" }}>
                  {new Date(shippedAt).toLocaleDateString("es-DO", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  padding: "0.65rem 1.25rem",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  textDecoration: "none",
                  boxShadow: "0 2px 8px rgba(22, 163, 74, 0.25)",
                }}
              >
                🔍 Rastrear Envío en Línea ↗
              </a>
            )}

            {storePhone && (
              <button
                type="button"
                onClick={() =>
                  handleSendWhatsApp(
                    `Hola TiendaDelki, tengo una consulta sobre el despacho de mi pedido #${orderNumber}. Número de guía: ${trackingNumber || "N/A"}.`
                  )
                }
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  background: "#ffffff",
                  color: "#166534",
                  border: "1px solid #86efac",
                  padding: "0.65rem 1.2rem",
                  borderRadius: "8px",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                💬 Consultar sobre el envío por WhatsApp
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. ORDER CANCELLED BANNER */}
      {isCancelled && (
        <div
          style={{
            background: "#fef2f2",
            border: "2px solid #ef4444",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "1.75rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🛑</div>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, color: "#991b1b" }}>
            Este pedido ha sido Cancelado
          </h3>
          <p style={{ margin: "0 auto 1.25rem", maxWidth: "550px", fontSize: "0.95rem", color: "#7f1d1d" }}>
            Si crees que esto se debe a un error o necesitas reactivar tu compra, por favor comunícate directamente con nosotros vía WhatsApp.
          </p>
          {storePhone && (
            <button
              type="button"
              onClick={() =>
                handleSendWhatsApp(`Hola TiendaDelki, deseo consultar sobre mi pedido cancelado #${orderNumber}.`)
              }
              style={{
                backgroundColor: "#25D366",
                color: "#ffffff",
                padding: "0.75rem 1.5rem",
                borderRadius: "9999px",
                fontSize: "0.95rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Contactar Atención al Cliente
            </button>
          )}
        </div>
      )}

      {/* 3. ORDER PREPARING BANNER */}
      {isPreparing && (
        <div
          style={{
            background: "linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)",
            border: "2px solid #8b5cf6",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "1.75rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📦</div>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, color: "#5b21b6" }}>
            ¡Tu pedido está en Preparación!
          </h3>
          <p style={{ margin: "0 auto 1rem", maxWidth: "550px", fontSize: "0.95rem", color: "#4c1d95" }}>
            El pago ha sido confirmado. Nuestro equipo de almacén se encuentra empacando cuidadosamente tus artículos para su entrega a la empresa de transporte.
          </p>
          {storePhone && (
            <button
              type="button"
              onClick={() =>
                handleSendWhatsApp(`Hola TiendaDelki, deseo consultar el estatus de despacho de mi pedido #${orderNumber}.`)
              }
              style={{
                backgroundColor: "#25D366",
                color: "#ffffff",
                padding: "0.65rem 1.4rem",
                borderRadius: "9999px",
                fontSize: "0.9rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
              }}
            >
              Consultar por WhatsApp
            </button>
          )}
        </div>
      )}

      {/* 4. ORDER PAID BANNER */}
      {isPaid && (
        <div
          style={{
            background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
            border: "2px solid #10b981",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "1.75rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.25rem", fontWeight: 800, color: "#065f46" }}>
            ¡Pago Verificado y Aprobado!
          </h3>
          <p style={{ margin: "0 auto 1rem", maxWidth: "550px", fontSize: "0.95rem", color: "#047857" }}>
            Hemos verificado tu transferencia bancaria. Tu pedido pasará a empaque en nuestro almacén en las próximas horas.
          </p>
        </div>
      )}

      {/* 5. PAYMENT UNDER REVIEW BANNER */}
      {isUnderReview && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%)",
            border: "2px solid var(--color-primary, #2563eb)",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "1.75rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "#dbeafe",
              color: "#1e40af",
              fontSize: "0.85rem",
              fontWeight: 700,
              padding: "0.35rem 0.85rem",
              borderRadius: "9999px",
              marginBottom: "0.75rem",
            }}
          >
            ⏱ ESTADO: PAGO EN REVISIÓN
          </div>

          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 0.5rem", color: "var(--color-text-main)" }}>
            ¡Comprobante Recibido con Éxito!
          </h2>
          <p style={{ fontSize: "0.95rem", color: "var(--color-text-muted)", maxWidth: "580px", margin: "0 auto 1.25rem" }}>
            Hemos registrado tu comprobante de pago. Nuestro departamento contable está validando la transferencia para autorizar de inmediato la preparación y despacho de tus artículos.
          </p>

          {proofUrl && (
            <div style={{ marginBottom: "1rem" }}>
              <a
                href={proofUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.875rem",
                  color: "var(--color-primary, #2563eb)",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                👁️ Ver comprobante cargado
              </a>
            </div>
          )}

          {storePhone && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => handleSendWhatsApp()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  backgroundColor: "#25D366",
                  color: "#ffffff",
                  padding: "0.7rem 1.4rem",
                  borderRadius: "9999px",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(37, 211, 102, 0.25)",
                }}
              >
                Notificar por WhatsApp también
              </button>
            </div>
          )}
        </div>
      )}

      {/* 6. PENDING PAYMENT / REJECTION RE-UPLOAD */}
      {isPendingPayment && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(16, 185, 129, 0.04) 100%)",
            border: "2px solid #25D366",
            borderRadius: "var(--radius-lg, 16px)",
            padding: "1.75rem",
            textAlign: "center",
          }}
        >
          {/* Rejection Alert if rejected */}
          {rejectionReason && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #f87171",
                borderRadius: "10px",
                padding: "1rem",
                marginBottom: "1.5rem",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#991b1b", fontWeight: 700 }}>
                <span>⚠️</span>
                <span>Comprobante anterior rechazado por Administración</span>
              </div>
              <p style={{ margin: "0.4rem 0 0.5rem", fontSize: "0.9rem", color: "#7f1d1d" }}>
                <strong>Motivo:</strong> {rejectionReason}
              </p>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#4b5563" }}>
                Por favor realiza la transferencia correcta y carga un nuevo comprobante legible a continuación.
              </p>
            </div>
          )}

          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#166534" }}>
            {rejectionReason ? "Subir Nuevo Comprobante de Pago" : "Paso Siguiente: Envía o Sube tu Comprobante de Pago"}
          </h2>
          <p style={{ fontSize: "0.925rem", color: "var(--color-text-main)", maxWidth: "560px", margin: "0 auto 1.25rem" }}>
            Transfiere a cualquiera de nuestras cuentas oficiales y sube aquí tu comprobante o envíanoslo directamente por WhatsApp para activar el despacho.
          </p>

          {/* Upload directly form */}
          <div
            style={{
              maxWidth: "480px",
              margin: "0 auto 1.25rem",
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 8px)",
              padding: "1.25rem",
              border: "1px dashed var(--color-border)",
            }}
          >
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              📁 Subir Comprobante Directamente (JPG, PNG, PDF)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={isUploading}
              onChange={handleFileUpload}
              style={{
                display: "block",
                width: "100%",
                fontSize: "0.85rem",
                cursor: isUploading ? "not-allowed" : "pointer",
              }}
            />

            {isUploading && (
              <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "var(--color-primary, #2563eb)", fontWeight: 600 }}>
                Subiendo y validando comprobante...
              </div>
            )}

            {uploadError && (
              <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#b91c1c", fontWeight: 600 }}>
                ⚠️ {uploadError}
              </div>
            )}

            {uploadSuccess && (
              <div style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#15803d", fontWeight: 600 }}>
                ✓ {uploadSuccess}
              </div>
            )}
          </div>

          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", margin: "0 0 1rem" }}>
            — o también puedes enviarlo por mensajería instantánea —
          </div>

          {storePhone && (
            <button
              type="button"
              onClick={() => handleSendWhatsApp()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.6rem",
                backgroundColor: "#25D366",
                color: "#ffffff",
                padding: "0.85rem 1.85rem",
                borderRadius: "9999px",
                fontSize: "1rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(37, 211, 102, 0.35)",
                transition: "all 0.2s ease",
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Enviar Comprobante por WhatsApp
            </button>
          )}
        </div>
      )}

      {/* 7. OFFICIAL BANK ACCOUNTS (Shown when order is pending payment or under review) */}
      {(isPendingPayment || isUnderReview) && (
        <div
          style={{
            background: "var(--color-surface)",
            borderRadius: "var(--radius-md, 12px)",
            border: "1px solid var(--color-border)",
            padding: "1.5rem",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: "0 0 1rem" }}>
            Cuentas Bancarias Oficiales para Depósito / Transferencia
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.85rem" }}>
            {bankAccounts.map((acc) => (
              <div
                key={acc.id}
                style={{
                  background: "var(--color-bg)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm, 8px)",
                  padding: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem" }}>{acc.bankName}</div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                    {acc.accountType}: <strong style={{ color: "var(--color-text-main)" }}>{acc.accountNumber}</strong>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                    Titular: {acc.holderName} • RNC: {acc.holderId}
                  </div>
                  {acc.instructions && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem", fontStyle: "italic" }}>
                      ℹ️ {acc.instructions}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(acc.accountNumber, acc.id)}
                  style={{
                    background: copiedId === acc.id ? "#10b981" : "var(--color-surface)",
                    color: copiedId === acc.id ? "#ffffff" : "inherit",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm, 6px)",
                    padding: "0.5rem 1rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {copiedId === acc.id ? (
                    <>✓ Cuenta Copiada</>
                  ) : (
                    <>
                      <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar Número
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
