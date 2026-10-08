"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "./cart-context";
import { formatCurrency } from "@/lib/formatters";

export interface ShippingMethodItem {
  id: string;
  name: string;
  zoneDescription: string | null;
  price: number;
  freeShippingThreshold: number | null;
  estimatedDays: string | null;
}

export interface BankAccountItem {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  holderName: string;
  holderId: string;
  instructions: string | null;
}

interface CheckoutFormProps {
  shippingMethods: ShippingMethodItem[];
  bankAccounts: BankAccountItem[];
}

export function CheckoutForm({ shippingMethods, bankAccounts }: CheckoutFormProps) {
  const router = useRouter();
  const { items, subtotal, itemCount, clearCart } = useCart();

  // Selected shipping method
  const [selectedShippingId, setSelectedShippingId] = useState<string>(
    shippingMethods[0]?.id || ""
  );

  // Form Fields
  const [formData, setFormData] = useState({
    guestName: "",
    guestPhone: "",
    guestWhatsapp: "",
    guestEmail: "",
    streetAddress: "",
    sectorOrNeighborhood: "",
    city: "Santo Domingo",
    provinceOrState: "Distrito Nacional",
    deliveryNotes: "",
    customerNotes: "",
  });

  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Integración de cliente y direcciones guardadas
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState("");

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [idempotencyKey] = useState(() =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idemp_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  useEffect(() => {
    async function loadAuthAndAddresses() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.success && meData.data) {
            const u = meData.data;
            setCurrentUser(u);
            setFormData((prev) => ({
              ...prev,
              guestName: prev.guestName || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
              guestPhone: prev.guestPhone || u.phone || "",
              guestWhatsapp: prev.guestWhatsapp || u.whatsapp || u.phone || "",
              guestEmail: prev.guestEmail || u.email || "",
            }));

            // Cargar direcciones guardadas del cliente
            const addrRes = await fetch("/api/cliente/addresses");
            if (addrRes.ok) {
              const addrData = await addrRes.json();
              if (addrData.success && addrData.data?.length > 0) {
                setSavedAddresses(addrData.data);
                const defaultAddr = addrData.data.find((a: any) => a.isDefault) || addrData.data[0];
                if (defaultAddr) {
                  setSelectedAddressId(defaultAddr.id);
                  setFormData((prev) => ({
                    ...prev,
                    streetAddress: defaultAddr.streetAddress || prev.streetAddress,
                    sectorOrNeighborhood: defaultAddr.sectorOrNeighborhood || prev.sectorOrNeighborhood,
                    city: defaultAddr.city || prev.city,
                    provinceOrState: defaultAddr.provinceOrState || prev.provinceOrState,
                    deliveryNotes: defaultAddr.deliveryNotes || prev.deliveryNotes,
                  }));
                }
              }
            }
          }
        }
      } catch (err) {
        // Compra de invitado continúa normalmente
      }
    }
    loadAuthAndAddresses();
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage("El comprobante no debe superar los 10MB");
        return;
      }
      setProofFile(file);
      if (file.type.startsWith("image/")) {
        setProofPreview(URL.createObjectURL(file));
      } else {
        setProofPreview(null);
      }
    }
  }

  // Calculate chosen shipping cost
  const chosenMethod = shippingMethods.find((m) => m.id === selectedShippingId);
  const isFreeShipping =
    chosenMethod &&
    chosenMethod.freeShippingThreshold !== null &&
    subtotal >= chosenMethod.freeShippingThreshold;

  const shippingCost = chosenMethod ? (isFreeShipping ? 0 : chosenMethod.price) : 0;
  const orderTotal = subtotal + shippingCost;

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedAccount(id);
    setTimeout(() => setCopiedAccount(null), 2500);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (items.length === 0) {
      setErrorMessage("Tu carrito está vacío. Agrega productos antes de continuar.");
      return;
    }

    if (!selectedShippingId) {
      setErrorMessage("Por favor selecciona un método de entrega.");
      return;
    }

    if (!formData.guestName.trim()) {
      setErrorMessage("Por favor ingresa tu nombre completo.");
      return;
    }

    if (!formData.guestPhone.trim() || !formData.guestWhatsapp.trim()) {
      setErrorMessage("Por favor proporciona teléfono y WhatsApp de contacto.");
      return;
    }

    if (!formData.streetAddress.trim() || !formData.sectorOrNeighborhood.trim()) {
      setErrorMessage("Por favor completa la dirección de entrega (calle y sector).");
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedProofUrl: string | null = null;
      if (proofFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", proofFile);
        uploadFormData.append("folder", "receipts");

        const uploadRes = await fetch("/api/uploads", {
          method: "POST",
          body: uploadFormData,
        });

        const uploadJson = await uploadRes.json();
        if (uploadRes.ok && uploadJson.success) {
          uploadedProofUrl = uploadJson.data?.url || null;
        }
      }

      const payload = {
        guestName: formData.guestName.trim(),
        guestPhone: formData.guestPhone.trim(),
        guestWhatsapp: formData.guestWhatsapp.trim(),
        guestEmail: formData.guestEmail.trim() || null,
        shippingMethodId: selectedShippingId,
        shippingAddress: {
          streetAddress: formData.streetAddress.trim(),
          sectorOrNeighborhood: formData.sectorOrNeighborhood.trim(),
          city: formData.city.trim(),
          provinceOrState: formData.provinceOrState.trim(),
          deliveryNotes: formData.deliveryNotes.trim() || null,
        },
        customerNotes: formData.customerNotes.trim() || null,
        proofOfPaymentUrl: uploadedProofUrl,
        idempotencyKey,
        items: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || null,
          quantity: it.quantity,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Ocurrió un error al procesar el pedido.");
      }

      const orderNumber = json.data?.orderNumber;
            if (!orderNumber) {
        throw new Error("No se recibió el número de confirmación del pedido.");
      }

      // Si el cliente no autenticado eligió crear cuenta opcional, registrarlo automáticamente
      if (!currentUser && createAccount && accountPassword.length >= 8 && formData.guestEmail) {
        try {
          const names = formData.guestName.trim().split(" ");
          const firstName = names[0] || "Cliente";
          const lastName = names.slice(1).join(" ") || "General";
          await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              firstName,
              lastName,
              email: formData.guestEmail.trim(),
              phone: formData.guestPhone.trim(),
              whatsapp: formData.guestWhatsapp.trim() || formData.guestPhone.trim(),
              password: accountPassword,
            }),
          });
        } catch (regErr) {
          console.warn("No se pudo registrar la cuenta opcional automáticamente:", regErr);
        }
      }

      // Clear cart
      clearCart();

      // Redirect to confirmation page (URL limpia protegida por cookie HttpOnly)
      router.push(`/pedido/confirmacion/${orderNumber}`);
    } catch (err: any) {
      console.error("Error creating order:", err);
      setErrorMessage(err.message || "Error de conexión. Inténtalo nuevamente.");
      setIsSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: "var(--radius-lg, 16px)",
          padding: "4rem 2rem",
          textAlign: "center",
          border: "1px solid var(--color-border)",
          boxShadow: "var(--shadow-sm)",
          margin: "3rem auto",
          maxWidth: "540px",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          No hay artículos en tu carrito
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
          Para realizar un checkout, primero debes agregar al menos un producto a tu carrito.
        </p>
        <Link
          href="/tienda"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.875rem 2rem",
            fontSize: "1rem",
            fontWeight: 600,
            borderRadius: "var(--radius-md, 8px)",
            textDecoration: "none",
            backgroundColor: "var(--color-primary, #2563eb)",
            color: "#ffffff",
          }}
        >
          Ir a la Tienda
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "2.5rem",
        }}
        className="checkout-grid"
      >
        {/* Left Column: Form Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {errorMessage && (
            <div
              style={{
                backgroundColor: "#fef2f2",
                color: "#b91c1c",
                border: "1px solid #f87171",
                padding: "1rem 1.25rem",
                borderRadius: "var(--radius-md, 8px)",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Banner de Invitado / Cuenta Opcional */}
          {!currentUser && (
            <div
              style={{
                padding: "0.85rem 1.15rem",
                borderRadius: "var(--radius-md, 12px)",
                backgroundColor: "rgba(37, 99, 235, 0.08)",
                border: "1px solid rgba(37, 99, 235, 0.25)",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "0.75rem",
              }}
            >
              <div>
                <span style={{ color: "#60a5fa", fontWeight: "700" }}>¿Ya tienes cuenta? </span>
                <span>Inicia sesión para usar tus direcciones guardadas. O continúa tu compra como invitado a continuación.</span>
              </div>
              <Link
                href="/login?callbackUrl=/checkout"
                style={{
                  padding: "0.35rem 0.75rem",
                  backgroundColor: "var(--color-brand-accent)",
                  color: "#ffffff",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: "700",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Iniciar Sesión
              </Link>
            </div>
          )}

          {/* 1. Datos Personales & Contacto */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--color-primary, #2563eb)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                1
              </span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Datos de Contacto
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }} className="form-row-2">
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Nombre y Apellidos *
                </label>
                <input
                  type="text"
                  name="guestName"
                  required
                  placeholder="Ej. Juan Pérez"
                  value={formData.guestName}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                    background: "var(--color-bg)",
                    color: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  name="guestEmail"
                  placeholder="juan@ejemplo.com"
                  value={formData.guestEmail}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                    background: "var(--color-bg)",
                    color: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginTop: "1rem" }} className="form-row-2">
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Teléfono Móvil *
                </label>
                <input
                  type="tel"
                  name="guestPhone"
                  required
                  placeholder="809-000-0000"
                  value={formData.guestPhone}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                    background: "var(--color-bg)",
                    color: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  WhatsApp para Confirmación *
                </label>
                <input
                  type="tel"
                  name="guestWhatsapp"
                  required
                  placeholder="809-000-0000"
                  value={formData.guestWhatsapp}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                    background: "var(--color-bg)",
                    color: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            {/* Opción de Crear Cuenta de Cliente Opcional */}
            {!currentUser && (
              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer", color: "var(--text-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                  />
                  <span>¿Deseas crear una cuenta con este pedido? (Opcional - para rastrear tus compras)</span>
                </label>

                {createAccount && (
                  <div style={{ marginTop: "0.75rem", padding: "0.85rem", backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
                      Contraseña para tu nueva cuenta (mínimo 8 caracteres) *
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      minLength={8}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "0.65rem 0.85rem",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-bg)",
                        color: "inherit",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Dirección de Entrega */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--color-primary, #2563eb)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                2
              </span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Dirección de Entrega
              </h2>
            </div>

            {/* Selector de Dirección Guardada para clientes */}
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: "1.25rem", padding: "0.85rem", backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "700", color: "#60a5fa", marginBottom: "0.4rem" }}>
                  📍 Seleccionar de mis Direcciones Guardadas
                </label>
                <select
                  value={selectedAddressId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedAddressId(id);
                    const found = savedAddresses.find((a) => a.id === id);
                    if (found) {
                      setFormData((prev) => ({
                        ...prev,
                        streetAddress: found.streetAddress || "",
                        sectorOrNeighborhood: found.sectorOrNeighborhood || "",
                        city: found.city || "Santo Domingo",
                        provinceOrState: found.provinceOrState || "Distrito Nacional",
                        deliveryNotes: found.deliveryNotes || "",
                      }));
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--bg-surface-elevated)",
                    color: "var(--text-primary)",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="">-- Ingresar dirección manualmente --</option>
                  {savedAddresses.map((addr) => (
                    <option key={addr.id} value={addr.id}>
                      {addr.label}: {addr.streetAddress}, {addr.sectorOrNeighborhood} {addr.isDefault ? "(Predeterminada)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                  Calle, Número y Apartamento/Edificio *
                </label>
                <input
                  type="text"
                  name="streetAddress"
                  required
                  placeholder="Ej. Av. Winston Churchill #105, Torre Blue, Apto 4B"
                  value={formData.streetAddress}
                  onChange={handleInputChange}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm, 6px)",
                    border: "1px solid var(--color-border)",
                    fontSize: "0.95rem",
                    background: "var(--color-bg)",
                    color: "inherit",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }} className="form-row-2">
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Sector o Barrio *
                  </label>
                  <input
                    type="text"
                    name="sectorOrNeighborhood"
                    required
                    placeholder="Ej. Piantini, Bella Vista, Alma Rosa..."
                    value={formData.sectorOrNeighborhood}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      color: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Ciudad o Municipio *
                  </label>
                  <input
                    type="text"
                    name="city"
                    required
                    placeholder="Ej. Santo Domingo, Santiago, La Vega..."
                    value={formData.city}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      color: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }} className="form-row-2">
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Provincia *
                  </label>
                  <select
                    name="provinceOrState"
                    value={formData.provinceOrState}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      color: "inherit",
                      boxSizing: "border-box",
                    }}
                  >
                    <option value="Distrito Nacional">Distrito Nacional</option>
                    <option value="Santo Domingo">Santo Domingo (Este/Norte/Oeste)</option>
                    <option value="Santiago">Santiago</option>
                    <option value="La Vega">La Vega</option>
                    <option value="Puerto Plata">Puerto Plata</option>
                    <option value="San Cristóbal">San Cristóbal</option>
                    <option value="La Romana">La Romana</option>
                    <option value="San Pedro de Macorís">San Pedro de Macorís</option>
                    <option value="Duarte (San Fco.)">Duarte (San Fco.)</option>
                    <option value="Espaillat (Moca)">Espaillat (Moca)</option>
                    <option value="La Altagracia (Higüey/Punta Cana)">La Altagracia (Higüey/Punta Cana)</option>
                    <option value="Otra Provincia">Otra Provincia</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Punto de Referencia / Notas de Entrega
                  </label>
                  <input
                    type="text"
                    name="deliveryNotes"
                    placeholder="Ej. Casa verde con rejas blancas, frente a la farmacia"
                    value={formData.deliveryNotes}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "var(--radius-sm, 6px)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.95rem",
                      background: "var(--color-bg)",
                      color: "inherit",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Método de Envío */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--color-primary, #2563eb)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                3
              </span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Método de Envío
              </h2>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {shippingMethods.map((method) => {
                const methodIsFree =
                  method.freeShippingThreshold !== null &&
                  subtotal >= method.freeShippingThreshold;

                const isSelected = selectedShippingId === method.id;

                return (
                  <label
                    key={method.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "1rem",
                      borderRadius: "var(--radius-sm, 8px)",
                      border: isSelected
                        ? "2px solid var(--color-primary, #2563eb)"
                        : "1px solid var(--color-border)",
                      background: isSelected
                        ? "var(--color-primary-light, rgba(37,99,235,0.04))"
                        : "var(--color-bg)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                      <input
                        type="radio"
                        name="shippingMethodId"
                        value={method.id}
                        checked={isSelected}
                        onChange={() => setSelectedShippingId(method.id)}
                        style={{ width: "18px", height: "18px", accentColor: "var(--color-primary, #2563eb)" }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                          {method.name}
                        </div>
                        {method.zoneDescription && (
                          <div style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>
                            {method.zoneDescription}
                          </div>
                        )}
                        {method.estimatedDays && (
                          <div style={{ fontSize: "0.75rem", color: "#10b981", fontWeight: 500, marginTop: "0.15rem" }}>
                            ⏱ Tiempo estimado: {method.estimatedDays}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {methodIsFree ? (
                        <div>
                          <span style={{ textDecoration: "line-through", color: "var(--color-text-muted)", fontSize: "0.8rem", marginRight: "0.4rem" }}>
                            {formatCurrency(method.price)}
                          </span>
                          <span style={{ color: "#10b981", fontWeight: 700, fontSize: "0.95rem" }}>
                            GRATIS
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {method.price === 0 ? "GRATIS" : formatCurrency(method.price)}
                        </div>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 4. Forma de Pago & Cuentas Bancarias */}
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-md, 12px)",
              border: "1px solid var(--color-border)",
              padding: "1.5rem",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <span
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "var(--color-primary, #2563eb)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                }}
              >
                4
              </span>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Método de Pago: Transferencia o Depósito Bancario
              </h2>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
              Al completar el pedido, este quedará registrado como <strong>PENDIENTE DE PAGO</strong>. Podrás transferir el monto total a cualquiera de nuestras cuentas oficiales y enviar el comprobante por WhatsApp:
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.75rem" }}>
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    background: "var(--color-bg)",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-sm, 8px)",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-main)" }}>
                      {acc.bankName}
                    </div>
                    <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                      {acc.accountType} • {acc.accountNumber}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                      Titular: {acc.holderName} (RNC: {acc.holderId})
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(acc.accountNumber, acc.id)}
                    style={{
                      border: "1px solid var(--color-border)",
                      background: "var(--color-surface)",
                      borderRadius: "var(--radius-sm, 6px)",
                      padding: "0.35rem 0.65rem",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontWeight: 600,
                    }}
                  >
                    {copiedAccount === acc.id ? "¡Copiado!" : "Copiar"}
                  </button>
                </div>
              ))}
            </div>

            {/* Subir Comprobante (Opcional) */}
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.25rem",
                borderRadius: "var(--radius-sm, 8px)",
                border: "1px dashed var(--color-border)",
                background: "var(--color-bg)",
              }}
            >
              <label style={{ display: "block", fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.35rem" }}>
                📎 Adjuntar Comprobante de Depósito / Transferencia (Opcional)
              </label>
              <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", margin: "0 0 0.75rem" }}>
                Si ya transferiste a una de nuestras cuentas, adjunta la foto o captura aquí. Tu pedido pasará directamente a <strong>PAGO EN REVISIÓN</strong>. (Si aún no has transferido, podrás subirlo más tarde en la confirmación o enviarlo por WhatsApp).
              </p>

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                style={{
                  display: "block",
                  width: "100%",
                  fontSize: "0.875rem",
                  color: "inherit",
                }}
              />

              {proofPreview && (
                <div style={{ marginTop: "0.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <img
                    src={proofPreview}
                    alt="Vista previa del comprobante"
                    style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--color-border)" }}
                  />
                  <span style={{ fontSize: "0.8125rem", color: "#10b981", fontWeight: 600 }}>
                    ✓ Comprobante cargado. El pedido se enviará en estado PAGO EN REVISIÓN.
                  </span>
                </div>
              )}
            </div>

            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Comentarios Adicionales del Pedido (Opcional)
              </label>
              <textarea
                name="customerNotes"
                rows={2}
                placeholder="Instrucciones especiales para el paquete o entrega..."
                value={formData.customerNotes}
                onChange={handleInputChange}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-sm, 6px)",
                  border: "1px solid var(--color-border)",
                  fontSize: "0.95rem",
                  background: "var(--color-bg)",
                  color: "inherit",
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Order Review */}
        <div>
          <div
            style={{
              background: "var(--color-surface)",
              borderRadius: "var(--radius-lg, 16px)",
              border: "1px solid var(--color-border)",
              padding: "1.75rem",
              boxShadow: "var(--shadow-md)",
              position: "sticky",
              top: "90px",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1.25rem" }}>
              Tu Pedido ({itemCount} productos)
            </h2>

            {/* Items Mini-list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                maxHeight: "240px",
                overflowY: "auto",
                marginBottom: "1.25rem",
                paddingRight: "0.25rem",
              }}
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    fontSize: "0.875rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "4px",
                        overflow: "hidden",
                        background: "#f1f5f9",
                        flexShrink: 0,
                      }}
                    >
                      <img
                        src={item.thumbnailUrl || "/logo.png"}
                        alt={item.productTitle}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{item.productTitle}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                        {item.variantTitle ? `${item.variantTitle} • ` : ""}Cant: {item.quantity}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ height: "1px", background: "var(--color-border)", margin: "1rem 0" }} />

            {/* Calculations */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Subtotal</span>
                <span style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95rem" }}>
                <span style={{ color: "var(--color-text-muted)" }}>Envío ({chosenMethod?.name || "Seleccione"})</span>
                <span style={{ fontWeight: 600, color: shippingCost === 0 ? "#10b981" : "inherit" }}>
                  {shippingCost === 0 ? "GRATIS" : formatCurrency(shippingCost)}
                </span>
              </div>

              <div style={{ height: "1px", background: "var(--color-border)", margin: "0.5rem 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.25rem", fontWeight: 800 }}>
                <span>Total a Pagar</span>
                <span style={{ color: "var(--color-primary, #2563eb)" }}>{formatCurrency(orderTotal)}</span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                width: "100%",
                padding: "0.95rem 1.25rem",
                backgroundColor: isSubmitting ? "var(--color-text-muted)" : "var(--color-brand-primary)",
                color: "#ffffff",
                borderRadius: "var(--radius-md)",
                fontWeight: 600,
                fontSize: "1rem",
                border: "none",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                boxShadow: "var(--shadow-xs)",
                transition: "background-color 0.15s ease",
                minHeight: "48px",
              }}
              onMouseOver={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = "var(--color-brand-primary-hover)";
              }}
              onMouseOut={(e) => {
                if (!isSubmitting) e.currentTarget.style.backgroundColor = "var(--color-brand-primary)";
              }}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  Procesando Pedido...
                </>
              ) : (
                <>
                  Confirmar y Crear Pedido
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>

            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center", marginTop: "1rem" }}>
              🔒 Compra protegida por TiendaDelki. Tus datos de contacto son confidenciales y solo se usarán para procesar tu entrega.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (min-width: 768px) {
          .form-row-2 {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (min-width: 960px) {
          .checkout-grid {
            grid-template-columns: 1fr 400px !important;
          }
        }
      `}</style>
    </form>
  );
}
