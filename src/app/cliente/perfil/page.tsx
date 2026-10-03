"use client";

import { useEffect, useState } from "react";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  whatsapp: string | null;
  role: string;
  createdAt: string;
}

export default function ClientePerfilPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Formulario de Información Personal
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    whatsapp: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario de Cambio de Contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/cliente/profile");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.data);
          setFormData({
            firstName: json.data.firstName || "",
            lastName: json.data.lastName || "",
            phone: json.data.phone || "",
            whatsapp: json.data.whatsapp || "",
          });
        }
      } catch (e) {
        console.error("Error cargando perfil:", e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);

    try {
      const res = await fetch("/api/cliente/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setProfileMsg({ type: "error", text: data.error?.message || "Error al actualizar perfil." });
      } else {
        setProfileMsg({ type: "success", text: "Tus datos personales fueron actualizados correctamente." });
        setProfile((prev) => (prev ? { ...prev, ...formData } : null));
      }
    } catch (e) {
      setProfileMsg({ type: "error", text: "Error de conexión al guardar cambios." });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las nuevas contraseñas no coinciden." });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordMsg({ type: "error", text: "La nueva contraseña debe tener al menos 8 caracteres." });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/cliente/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setPasswordMsg({ type: "error", text: data.error?.message || "Error al cambiar contraseña." });
      } else {
        setPasswordMsg({ type: "success", text: "Contraseña actualizada exitosamente." });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      }
    } catch (e) {
      setPasswordMsg({ type: "error", text: "Error de conexión al cambiar la contraseña." });
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return <div style={{ color: "var(--text-muted)" }}>Cargando información del perfil...</div>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
      {/* 1. Datos Personales */}
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
          👤 Datos Personales
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Información de contacto utilizada para tus compras y envíos
        </p>

        {profileMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              backgroundColor: profileMsg.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: profileMsg.type === "success" ? "#34d399" : "#f87171",
              border: `1px solid ${profileMsg.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleUpdateProfile} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Correo Electrónico (Solo Lectura)
            </label>
            <input
              type="email"
              disabled
              value={profile?.email || ""}
              style={{
                width: "100%",
                padding: "0.7rem 0.9rem",
                backgroundColor: "rgba(255, 255, 255, 0.04)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-muted)",
                fontSize: "0.9rem",
                cursor: "not-allowed",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                Teléfono *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.7rem 0.9rem",
                  backgroundColor: "var(--bg-app)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  color: "var(--text-primary)",
                  fontSize: "0.9rem",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem 1.25rem",
              backgroundColor: "var(--color-brand-accent)",
              color: "#ffffff",
              borderRadius: "var(--radius-md)",
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: savingProfile ? "not-allowed" : "pointer",
            }}
          >
            {savingProfile ? "Guardando..." : "Guardar Cambios"}
          </button>
        </form>
      </div>

      {/* 2. Seguridad y Contraseña */}
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-primary)" }}>
          🔒 Seguridad y Contraseña
        </h2>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          Actualiza tu clave de acceso con verificación de contraseña actual
        </p>

        {passwordMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
              backgroundColor: passwordMsg.type === "success" ? "rgba(16, 185, 129, 0.12)" : "rgba(239, 68, 68, 0.12)",
              color: passwordMsg.type === "success" ? "#34d399" : "#f87171",
              border: `1px solid ${passwordMsg.type === "success" ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)"}`,
            }}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Contraseña Actual *
            </label>
            <input
              type="password"
              required
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.7rem 0.9rem",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Nueva Contraseña (min 8 car.) *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.7rem 0.9rem",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "var(--text-secondary)", marginBottom: "0.35rem" }}>
              Confirmar Nueva Contraseña *
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              style={{
                width: "100%",
                padding: "0.7rem 0.9rem",
                backgroundColor: "var(--bg-app)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--radius-md)",
                color: "var(--text-primary)",
                fontSize: "0.9rem",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword}
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem 1.25rem",
              backgroundColor: "var(--bg-surface-elevated)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-md)",
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: savingPassword ? "not-allowed" : "pointer",
            }}
          >
            {savingPassword ? "Actualizando..." : "Cambiar Contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
