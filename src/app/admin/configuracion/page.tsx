"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { invalidateStoreSettingsCache } from "@/hooks/use-store-settings";

interface StoreSettings {
  storeName: string;
  shortDescription: string;
  description: string;
  logoUrl: string;
  phone: string;
  secondaryPhone: string;
  whatsapp: string;
  email: string;
  address: string;
  sector: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  scheduleDays: string;
  scheduleOpen: string;
  scheduleClose: string;
  scheduleText: string;
  currency: string;
  currencySymbol: string;
  contactMessage: string;
  deliveryMessage: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  holderName: string;
  holderId: string;
  instructions: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function AdminConfiguracionPage() {
  const [activeTab, setActiveTab] = useState<"IDENTIDAD" | "CONTACTO_UBICACION" | "HORARIOS_REDES" | "PAGOS">("IDENTIDAD");
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<StoreSettings>({
    storeName: "TiendaDelki",
    shortDescription: "Tienda Física & Online – República Dominicana",
    description: "Tu tienda de confianza con inventario verificado y envíos a todas las provincias.",
    logoUrl: "",
    phone: "",
    secondaryPhone: "",
    whatsapp: "",
    email: "",
    address: "",
    sector: "Barrio El Albinal",
    city: "San Fernando de Monte Cristi",
    province: "Monte Cristi",
    country: "República Dominicana",
    postalCode: "",
    scheduleDays: "",
    scheduleOpen: "",
    scheduleClose: "",
    scheduleText: "",
    currency: "DOP",
    currencySymbol: "RD$",
    contactMessage: "¡Hola TiendaDelki! Deseo consultar sobre sus productos.",
    deliveryMessage: "Envíos a todo el país y entregas locales en Monte Cristi.",
    instagram: "",
    facebook: "",
    tiktok: "",
  });

  const [initialSettings, setInitialSettings] = useState<StoreSettings>(settings);

  // Bank Accounts State
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
  const [savingBank, setSavingBank] = useState(false);
  const [bankFormError, setBankFormError] = useState<string | null>(null);
  const [bankFormData, setBankFormData] = useState({
    bankName: "",
    accountNumber: "",
    accountType: "Cuenta de Ahorros (DOP)",
    holderName: "",
    holderId: "",
    instructions: "",
    sortOrder: 1,
    isActive: true,
  });

  useEffect(() => {
    loadAllData();
  }, []);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  async function loadAllData() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [settingsRes, banksRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/admin/bank-accounts"),
      ]);

      if (settingsRes.ok) {
        const sJson = await settingsRes.json();
        if (sJson.success && sJson.storeSettings) {
          setSettings(sJson.storeSettings);
          setInitialSettings(sJson.storeSettings);
        }
      }

      if (banksRes.ok) {
        const bJson = await banksRes.json();
        if (bJson.success && Array.isArray(bJson.data)) {
          setBankAccounts(bJson.data);
        }
      }
    } catch (err: any) {
      console.error("Error al cargar configuración:", err);
      setErrorMessage("No se pudieron cargar los datos de configuración.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeSettings: settings }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al guardar la configuración.");
      }

      setSettings(json.storeSettings);
      setInitialSettings(json.storeSettings);
      invalidateStoreSettingsCache(json.storeSettings);
      showToast("¡Configuración de la tienda guardada correctamente!");
    } catch (err: any) {
      setErrorMessage(err.message || "Error al actualizar la configuración.");
    } finally {
      setSavingSettings(false);
    }
  }

  function handleResetSettings() {
    setSettings(initialSettings);
    showToast("Cambios descartados.");
  }

  function openCreateBankModal() {
    setEditingBank(null);
    setBankFormData({
      bankName: "",
      accountNumber: "",
      accountType: "Cuenta de Ahorros (DOP)",
      holderName: "",
      holderId: "",
      instructions: "Favor de colocar el número de pedido en el concepto de la transferencia.",
      sortOrder: bankAccounts.length + 1,
      isActive: true,
    });
    setBankFormError(null);
    setBankModalOpen(true);
  }

  function openEditBankModal(acc: BankAccount) {
    setEditingBank(acc);
    setBankFormData({
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      accountType: acc.accountType,
      holderName: acc.holderName,
      holderId: acc.holderId,
      instructions: acc.instructions || "",
      sortOrder: acc.sortOrder,
      isActive: acc.isActive,
    });
    setBankFormError(null);
    setBankModalOpen(true);
  }

  async function handleSaveBank(e: React.FormEvent) {
    e.preventDefault();
    setSavingBank(true);
    setBankFormError(null);

    try {
      if (!bankFormData.bankName.trim() || !bankFormData.accountNumber.trim() || !bankFormData.holderName.trim()) {
        throw new Error("El banco, número de cuenta y titular son obligatorios.");
      }

      const url = editingBank
        ? `/api/admin/bank-accounts/${editingBank.id}`
        : "/api/admin/bank-accounts";
      const method = editingBank ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankFormData),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Error al procesar la cuenta bancaria.");
      }

      showToast(editingBank ? "Cuenta bancaria actualizada." : "Cuenta bancaria agregada exitosamente.");
      setBankModalOpen(false);

      const refreshRes = await fetch("/api/admin/bank-accounts");
      const refreshJson = await refreshRes.json();
      if (refreshJson.success) setBankAccounts(refreshJson.data);
    } catch (err: any) {
      setBankFormError(err.message || "Error al guardar la cuenta.");
    } finally {
      setSavingBank(false);
    }
  }

  async function handleToggleBankActive(acc: BankAccount) {
    try {
      const res = await fetch(`/api/admin/bank-accounts/${acc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !acc.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        showToast(acc.isActive ? "Cuenta desactivada." : "Cuenta activada para checkout.");
        setBankAccounts((prev) =>
          prev.map((item) => (item.id === acc.id ? { ...item, isActive: !acc.isActive } : item))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleDeleteBank(acc: BankAccount) {
    if (!confirm(`¿Eliminar la cuenta bancaria de ${acc.bankName} (${acc.accountNumber})?`)) return;
    try {
      const res = await fetch(`/api/admin/bank-accounts/${acc.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Cuenta bancaria eliminada.");
        setBankAccounts((prev) => prev.filter((item) => item.id !== acc.id));
      } else {
        alert(json.error?.message || "No se pudo eliminar.");
      }
    } catch (err) {
      alert("Error al eliminar cuenta bancaria.");
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <p style={{ fontSize: "1.1rem" }}>Cargando configuración de la tienda...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1080px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#059669",
            color: "#ffffff",
            padding: "0.85rem 1.5rem",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 9999,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>✓</span> {toastMessage}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "1.75rem" }}>⚙️</span>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0, color: "var(--text-primary)" }}>
            Información y Configuración de la Tienda
          </h1>
        </div>
        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.95rem" }}>
          Edita toda la información comercial de TiendaDelki (nombre, contacto, Monte Cristi, horarios, cuentas bancarias) sin tocar código.
        </p>
      </div>

      {errorMessage && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "8px",
            color: "#ef4444",
            marginBottom: "1.5rem",
            fontSize: "0.95rem",
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          borderBottom: "1px solid var(--border-subtle)",
          marginBottom: "1.5rem",
          overflowX: "auto",
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab("IDENTIDAD")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "IDENTIDAD" ? "3px solid var(--color-brand-primary)" : "3px solid transparent",
            fontWeight: activeTab === "IDENTIDAD" ? 700 : 500,
            color: activeTab === "IDENTIDAD" ? "var(--color-brand-primary)" : "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "0.95rem",
            transition: "all 0.15s ease",
          }}
        >
          🏪 Identidad
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CONTACTO_UBICACION")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "CONTACTO_UBICACION" ? "3px solid var(--color-brand-primary)" : "3px solid transparent",
            fontWeight: activeTab === "CONTACTO_UBICACION" ? 700 : 500,
            color: activeTab === "CONTACTO_UBICACION" ? "var(--color-brand-primary)" : "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "0.95rem",
            transition: "all 0.15s ease",
          }}
        >
          📍 Contacto & Ubicación
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("HORARIOS_REDES")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "HORARIOS_REDES" ? "3px solid var(--color-brand-primary)" : "3px solid transparent",
            fontWeight: activeTab === "HORARIOS_REDES" ? 700 : 500,
            color: activeTab === "HORARIOS_REDES" ? "var(--color-brand-primary)" : "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "0.95rem",
            transition: "all 0.15s ease",
          }}
        >
          ⏰ Horarios & Redes Sociales
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("PAGOS")}
          style={{
            padding: "0.75rem 1.25rem",
            background: "none",
            border: "none",
            borderBottom: activeTab === "PAGOS" ? "3px solid var(--color-brand-primary)" : "3px solid transparent",
            fontWeight: activeTab === "PAGOS" ? 700 : 500,
            color: activeTab === "PAGOS" ? "var(--color-brand-primary)" : "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "0.95rem",
            transition: "all 0.15s ease",
          }}
        >
          💳 Cuentas Bancarias de Depósito ({bankAccounts.length})
        </button>
      </div>

      {/* Tab 1: Identidad */}
      {activeTab === "IDENTIDAD" && (
        <form onSubmit={handleSaveSettings}>
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "clamp(1rem, 3vw, 1.75rem)",
              display: "flex",
              flexDirection: "column",
              gap: "1.25rem",
            }}
          >
            <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>Identidad Comercial</h2>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Nombre de la Tienda *
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                required
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "inherit",
                }}
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                Aparece en el encabezado, pie de página, checkout y comunicaciones.
              </span>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Descripción Corta (Lema / Tagline)
              </label>
              <input
                type="text"
                value={settings.shortDescription}
                onChange={(e) => setSettings({ ...settings, shortDescription: e.target.value })}
                placeholder="Ej. Tienda Física & Online – República Dominicana"
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "inherit",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                Descripción General de la Tienda
              </label>
              <textarea
                rows={3}
                value={settings.description}
                onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                placeholder="Descripción para pie de página y página informativa..."
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                URL del Logo (Opcional)
              </label>
              <input
                type="text"
                value={settings.logoUrl}
                onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                placeholder="https://... o ruta relativa /logo.png"
                style={{
                  width: "100%",
                  padding: "0.65rem 0.85rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-subtle)",
                  backgroundColor: "var(--bg-main)",
                  color: "inherit",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  padding: "0.75rem 1.75rem",
                  backgroundColor: "var(--color-brand-accent, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {savingSettings ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                type="button"
                onClick={handleResetSettings}
                style={{
                  padding: "0.75rem 1.25rem",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 2: Contacto y Ubicación */}
      {activeTab === "CONTACTO_UBICACION" && (
        <form onSubmit={handleSaveSettings}>
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "clamp(1rem, 3vw, 1.75rem)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Canales de Contacto</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Teléfono Principal *
                  </label>
                  <input
                    type="text"
                    value={settings.phone}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="Teléfono oficial de la tienda"
                    required
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    WhatsApp Oficial (sin guiones) *
                  </label>
                  <input
                    type="text"
                    value={settings.whatsapp}
                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                    placeholder="WhatsApp oficial de la tienda"
                    required
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    Se usa para los enlaces de WhatsApp en toda la tienda.
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Email Oficial de Contacto *
                  </label>
                  <input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                    placeholder="contacto@tiendadelki.com"
                    required
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Teléfono Secundario (Opcional)
                  </label>
                  <input
                    type="text"
                    value={settings.secondaryPhone}
                    onChange={(e) => setSettings({ ...settings, secondaryPhone: e.target.value })}
                    placeholder="Teléfono secundario (opcional)"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)" }} />

            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Ubicación Física</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Dirección / Calle
                  </label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    placeholder="Calle Principal"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Barrio / Sector
                  </label>
                  <input
                    type="text"
                    value={settings.sector}
                    onChange={(e) => setSettings({ ...settings, sector: e.target.value })}
                    placeholder="Barrio El Albinal"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Ciudad / Municipio
                  </label>
                  <input
                    type="text"
                    value={settings.city}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    placeholder="San Fernando de Monte Cristi"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Provincia
                  </label>
                  <input
                    type="text"
                    value={settings.province}
                    onChange={(e) => setSettings({ ...settings, province: e.target.value })}
                    placeholder="Monte Cristi"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    País
                  </label>
                  <input
                    type="text"
                    value={settings.country}
                    onChange={(e) => setSettings({ ...settings, country: e.target.value })}
                    placeholder="República Dominicana"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Código Postal
                  </label>
                  <input
                    type="text"
                    value={settings.postalCode}
                    onChange={(e) => setSettings({ ...settings, postalCode: e.target.value })}
                    placeholder="62000"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  padding: "0.75rem 1.75rem",
                  backgroundColor: "var(--color-brand-accent, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {savingSettings ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                type="button"
                onClick={handleResetSettings}
                style={{
                  padding: "0.75rem 1.25rem",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 3: Horarios y Redes */}
      {activeTab === "HORARIOS_REDES" && (
        <form onSubmit={handleSaveSettings}>
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "12px",
              padding: "clamp(1rem, 3vw, 1.75rem)",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Horarios de Atención</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Días de Atención
                  </label>
                  <input
                    type="text"
                    value={settings.scheduleDays}
                    onChange={(e) => setSettings({ ...settings, scheduleDays: e.target.value })}
                    placeholder="Lunes a Sábado"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Hora de Apertura
                  </label>
                  <input
                    type="text"
                    value={settings.scheduleOpen}
                    onChange={(e) => setSettings({ ...settings, scheduleOpen: e.target.value })}
                    placeholder="9:00 AM"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Hora de Cierre
                  </label>
                  <input
                    type="text"
                    value={settings.scheduleClose}
                    onChange={(e) => setSettings({ ...settings, scheduleClose: e.target.value })}
                    placeholder="7:00 PM"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Texto Adicional de Horario
                  </label>
                  <input
                    type="text"
                    value={settings.scheduleText}
                    onChange={(e) => setSettings({ ...settings, scheduleText: e.target.value })}
                    placeholder="Domingos y feriados: cerrado"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-subtle)" }} />

            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 1rem 0" }}>Redes Sociales y Mensajes</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={settings.instagram}
                    onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                    placeholder="https://instagram.com/tiendadelki"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={settings.facebook}
                    onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                    placeholder="https://facebook.com/tiendadelki"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    TikTok
                  </label>
                  <input
                    type="text"
                    value={settings.tiktok}
                    onChange={(e) => setSettings({ ...settings, tiktok: e.target.value })}
                    placeholder="https://tiktok.com/@tiendadelki"
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem" }}>
                    Mensaje de Entrega / Envíos
                  </label>
                  <input
                    type="text"
                    value={settings.deliveryMessage}
                    onChange={(e) => setSettings({ ...settings, deliveryMessage: e.target.value })}
                    placeholder="Envíos a todo el país y entregas locales en Monte Cristi."
                    style={{
                      width: "100%",
                      padding: "0.65rem 0.85rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border-subtle)",
                      backgroundColor: "var(--bg-main)",
                      color: "inherit",
                    }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button
                type="submit"
                disabled={savingSettings}
                style={{
                  padding: "0.75rem 1.75rem",
                  backgroundColor: "var(--color-brand-accent, #2563eb)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {savingSettings ? "Guardando..." : "Guardar Cambios"}
              </button>
              <button
                type="button"
                onClick={handleResetSettings}
                style={{
                  padding: "0.75rem 1.25rem",
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Tab 4: Cuentas Bancarias */}
      {activeTab === "PAGOS" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>Cuentas Bancarias para Depósito / Transferencia</h2>
              <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                Las cuentas activas se mostrarán automáticamente en el checkout cuando el cliente seleccione pago por transferencia.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateBankModal}
              className="btn btn-primary"
            >
              <span>+</span> Agregar Cuenta Bancaria
            </button>
          </div>

          {bankAccounts.length === 0 ? (
            <div
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px dashed var(--border-subtle)",
                borderRadius: "var(--radius-xl)",
                padding: "3.5rem 1.5rem",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏦</div>
              <p style={{ fontWeight: 600, margin: "0 0 0.5rem 0", color: "var(--text-primary)", fontSize: "1.05rem" }}>No hay cuentas bancarias configuradas</p>
              <p style={{ fontSize: "0.875rem", margin: "0 auto 1.5rem auto", maxWidth: "480px" }}>
                Agrega al menos una cuenta para que tus clientes puedan pagar por transferencia bancaria en el checkout.
              </p>
              <button
                type="button"
                onClick={openCreateBankModal}
                className="btn btn-primary"
              >
                Agregar Primera Cuenta
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: "1rem" }}>
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  style={{
                    backgroundColor: "var(--bg-card)",
                    border: acc.isActive ? "1.5px solid #10b981" : "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-xl)",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "1rem",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                      <div>
                        <span style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-secondary)", fontWeight: 600 }}>
                          {acc.accountType}
                        </span>
                        <h3 style={{ margin: "0.2rem 0 0 0", fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {acc.bankName}
                        </h3>
                      </div>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.25rem 0.6rem",
                          borderRadius: "9999px",
                          backgroundColor: acc.isActive ? "#ecfdf5" : "#f1f5f9",
                          color: acc.isActive ? "#059669" : "#64748b",
                          border: `1px solid ${acc.isActive ? "#a7f3d0" : "#e2e8f0"}`,
                        }}
                      >
                        {acc.isActive ? "ACTIVA EN CHECKOUT" : "INACTIVA"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.9rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Número: </span>
                        <strong style={{ letterSpacing: "0.05em", color: "var(--text-primary)" }}>{acc.accountNumber}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-secondary)" }}>Titular: </span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{acc.holderName}</span>
                      </div>
                      {acc.holderId && (
                        <div>
                          <span style={{ color: "var(--text-secondary)" }}>Cédula / RNC: </span>
                          <span style={{ color: "var(--text-primary)" }}>{acc.holderId}</span>
                        </div>
                      )}
                      {acc.instructions && (
                        <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.75rem", backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-md)", fontSize: "0.8rem", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                          <em>{acc.instructions}</em>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.85rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleToggleBankActive(acc)}
                      className="btn btn-sm btn-secondary"
                      style={{
                        flex: 1,
                        color: acc.isActive ? "#dc2626" : "#059669",
                        backgroundColor: acc.isActive ? "#fef2f2" : "#ecfdf5",
                        borderColor: acc.isActive ? "#fecaca" : "#a7f3d0",
                      }}
                    >
                      {acc.isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditBankModal(acc)}
                      className="btn btn-sm btn-secondary"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBank(acc)}
                      className="btn btn-sm btn-danger"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal Cuentas Bancarias */}
      {bankModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-dialog" style={{ maxWidth: "540px" }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBank ? "Editar Cuenta Bancaria" : "Nueva Cuenta Bancaria"}
              </h3>
              <button
                type="button"
                onClick={() => setBankModalOpen(false)}
                className="modal-close-btn"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {bankFormError && (
              <div style={{ padding: "0.75rem 1rem", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "var(--radius-md)", marginBottom: "1rem", fontSize: "0.875rem", border: "1px solid #fecaca" }}>
                {bankFormError}
              </div>
            )}

            <form onSubmit={handleSaveBank} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Banco *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Banco BHD, Banreservas, Banco Popular"
                  value={bankFormData.bankName}
                  onChange={(e) => setBankFormData({ ...bankFormData, bankName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Titular de la Cuenta *
                </label>
                <input
                  type="text"
                  placeholder="Nombre de la empresa o persona titular"
                  value={bankFormData.holderName}
                  onChange={(e) => setBankFormData({ ...bankFormData, holderName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Cédula o RNC del Titular
                </label>
                <input
                  type="text"
                  placeholder="Ej. 132-XXXXX-X o 402-XXXXXXX-X"
                  value={bankFormData.holderId}
                  onChange={(e) => setBankFormData({ ...bankFormData, holderId: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Tipo de Cuenta *
                </label>
                <input
                  type="text"
                  placeholder="Ej. Cuenta de Ahorros (DOP) o Cuenta Corriente"
                  value={bankFormData.accountType}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountType: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Número de Cuenta *
                </label>
                <input
                  type="text"
                  placeholder="Número de cuenta bancaria"
                  value={bankFormData.accountNumber}
                  onChange={(e) => setBankFormData({ ...bankFormData, accountNumber: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.35rem", color: "var(--text-primary)" }}>
                  Instrucciones para el Cliente (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Colocar el número de pedido en la descripción"
                  value={bankFormData.instructions}
                  onChange={(e) => setBankFormData({ ...bankFormData, instructions: e.target.value })}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0" }}>
                <input
                  type="checkbox"
                  id="bankIsActive"
                  checked={bankFormData.isActive}
                  onChange={(e) => setBankFormData({ ...bankFormData, isActive: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="bankIsActive" style={{ fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", color: "var(--text-primary)" }}>
                  Cuenta activa (mostrar en checkout para transferencias)
                </label>
              </div>

              <div className="modal-footer" style={{ marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setBankModalOpen(false)}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingBank}
                  className="btn btn-primary"
                >
                  {savingBank ? "Guardando..." : "Guardar Cuenta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
