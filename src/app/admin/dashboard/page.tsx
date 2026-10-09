"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatters";

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface DashboardKPIs {
  ventas: {
    totalRevenue: number;
    formatted: string;
    currency: string;
  };
  pedidos: {
    totalOrders: number;
    completedOrders: number;
  };
  pedidosPendientes: {
    count: number;
  };
  pagosEnRevision: {
    count: number;
  };
  productosStockBajo: {
    count: number;
  };
  productosAgotados: {
    count: number;
  };
}

interface DayPoint {
  date: string;
  label: string;
  revenue: number;
  ordersCount: number;
}

interface WeekPoint {
  weekKey: string;
  label: string;
  revenue: number;
  ordersCount: number;
}

interface MonthPoint {
  monthKey: string;
  label: string;
  revenue: number;
  ordersCount: number;
}

interface OrderStatusBreakdown {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface TopProductItem {
  productId: string;
  name: string;
  slug: string;
  sku: string | null;
  categoryName: string;
  thumbnailUrl: string | null;
  unitsSold: number;
  totalRevenue: number;
  revenueFormatted: string;
}

interface TopCategoryItem {
  categoryId: string;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  revenueFormatted: string;
  percentage: number;
}

interface AlertItem {
  id: string;
  type: "warning" | "danger" | "info" | "neutral" | "success";
  icon: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  count: number;
}

interface DashboardData {
  adminInfo: {
    userId: string | null;
    role: string | null;
  };
  kpis: DashboardKPIs;
  charts: {
    ventasPorDia: DayPoint[];
    ventasPorSemana: WeekPoint[];
    ventasPorMes: MonthPoint[];
    pedidosPorEstado: OrderStatusBreakdown[];
    productosMasVendidos: TopProductItem[];
    categoriasMasVendidas: TopCategoryItem[];
  };
  alertas: AlertItem[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selector de período de gráficos (Día / Semana / Mes)
  const [chartPeriod, setChartPeriod] = useState<"DIA" | "SEMANA" | "MES">("DIA");
  // Métrica activa en gráfico principal (Ventas en RD$ o Pedidos)
  const [chartMetric, setChartMetric] = useState<"REVENUE" | "ORDERS">("REVENUE");
  // Tooltip hover en gráfico
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  async function loadDashboardData(isRefresh = false) {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [userRes, statsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/admin/dashboard-stats"),
      ]);

      if (!userRes.ok || !statsRes.ok) {
        if (userRes.status === 401 || statsRes.status === 401) {
          router.push("/admin/login");
          return;
        }
      }

      const userData = await userRes.json();
      const statsData = await statsRes.json();

      if (userData.success) setUser(userData.data);
      if (statsData.success) setData(statsData.data);
    } catch (err) {
      console.error("Error cargando dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Datos actuales según el período seleccionado
  const currentChartSeries = useMemo(() => {
    if (!data) return [];
    if (chartPeriod === "DIA") {
      return data.charts.ventasPorDia.map((d) => ({
        label: d.label,
        value: chartMetric === "REVENUE" ? d.revenue : d.ordersCount,
        revenue: d.revenue,
        orders: d.ordersCount,
      }));
    }
    if (chartPeriod === "SEMANA") {
      return data.charts.ventasPorSemana.map((w) => ({
        label: w.label,
        value: chartMetric === "REVENUE" ? w.revenue : w.ordersCount,
        revenue: w.revenue,
        orders: w.ordersCount,
      }));
    }
    return data.charts.ventasPorMes.map((m) => ({
      label: m.label,
      value: chartMetric === "REVENUE" ? m.revenue : m.ordersCount,
      revenue: m.revenue,
      orders: m.ordersCount,
    }));
  }, [data, chartPeriod, chartMetric]);

  const maxChartValue = useMemo(() => {
    if (!currentChartSeries.length) return 100;
    const max = Math.max(...currentChartSeries.map((s) => s.value));
    return max <= 0 ? 100 : max * 1.15; // 15% de holgura superior
  }, [currentChartSeries]);

  // Total de pedidos calculados para porcentajes de estado
  const totalOrdersCount = useMemo(() => {
    if (!data) return 0;
    return data.charts.pedidosPorEstado.reduce((sum, item) => sum + item.count, 0);
  }, [data]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", paddingTop: "6rem", paddingBottom: "6rem" }}>
        <div
          style={{
            display: "inline-block",
            width: "48px",
            height: "48px",
            border: "4px solid rgba(79, 70, 229, 0.2)",
            borderTopColor: "var(--color-brand-primary)",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: "1rem",
          }}
        />
        <p style={{ color: "var(--text-secondary)", fontSize: "1.05rem", fontWeight: "600" }}>
          Cargando métricas y análisis de TiendaDelki...
        </p>
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const kpis = data?.kpis;
  const alertas = data?.alertas || [];

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "3rem" }}>
      {/* 1. ENCABEZADO PRINCIPAL */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.25rem",
          marginBottom: "2rem",
          paddingBottom: "1.25rem",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.35rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.2rem 0.65rem",
                borderRadius: "9999px",
                backgroundColor: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #a7f3d0",
                fontWeight: "700",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>
              En Línea ({user?.role || "ADMIN"})
            </span>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Sincronizado: {new Date().toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "800", letterSpacing: "-0.025em", color: "var(--text-primary)" }}>
            Panel de Control Ejecutivo
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.925rem", margin: "0.2rem 0 0 0" }}>
            Métricas consolidadas de ventas online, control de pedidos y existencias en almacén físico.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="btn btn-secondary"
            style={{
              padding: "0.55rem 1rem",
              fontSize: "0.85rem",
              cursor: refreshing ? "not-allowed" : "pointer",
            }}
          >
            <span style={{ display: "inline-block", transform: refreshing ? "rotate(180deg)" : "none", transition: "transform 0.4s ease" }}>
              🔄
            </span>
            <span>{refreshing ? "Actualizando..." : "Actualizar Datos"}</span>
          </button>

          <Link
            href="/"
            target="_blank"
            className="btn btn-primary"
            style={{
              padding: "0.55rem 1.1rem",
              fontSize: "0.85rem",
            }}
          >
            <span>Ver Tienda Online</span>
            <span>↗</span>
          </Link>
        </div>
      </header>

      {/* 2. ACCESOS RÁPIDOS OPERATIVOS */}
      <section style={{ marginBottom: "2rem" }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            marginBottom: "0.75rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          <span>⚡ ACCIONES RÁPIDAS FRECUENTES</span>
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
            gap: "0.85rem",
          }}
        >
          {/* Acceso 1: Nuevo producto */}
          <Link
            href="/admin/productos/nuevo"
            className="card card-interactive"
            style={{
              padding: "1rem 1.15rem",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#eef2ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #c7d2fe",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 5v14M5 12h14"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "0.925rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Nuevo Producto</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>Crear y publicar en catálogo</p>
            </div>
          </Link>

          {/* Acceso 2: Vendido físicamente */}
          <Link
            href="/admin/inventario?action=quick_sale"
            className="card card-interactive"
            style={{
              padding: "1rem 1.15rem",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              textDecoration: "none",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #86efac",
              }}
            >
              <span style={{ fontSize: "1.2rem" }}>⚡</span>
            </div>
            <div>
              <h3 style={{ fontSize: "0.925rem", fontWeight: "700", color: "#15803d", margin: 0 }}>Venta Física</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0.15rem 0 0 0" }}>Descontar stock en mostrador</p>
            </div>
          </Link>

          {/* Acceso 3: Ver pedidos */}
          <Link
            href="/admin/pedidos"
            className="card card-interactive"
            style={{
              padding: "1rem 1.15rem",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #bfdbfe",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "0.925rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Ver Pedidos</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>Despachos y estados</p>
            </div>
          </Link>

          {/* Acceso 4: Revisar pagos */}
          <Link
            href="/admin/pedidos?status=PAGO_EN_REVISION"
            className="card card-interactive"
            style={{
              padding: "1rem 1.15rem",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              textDecoration: "none",
              backgroundColor: (kpis?.pagosEnRevision.count ?? 0) > 0 ? "#fdf4ff" : "var(--bg-surface)",
              border: (kpis?.pagosEnRevision.count ?? 0) > 0 ? "1px solid #f0abfc" : "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#f5f3ff",
                color: "#7c3aed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #ddd6fe",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "0.925rem", fontWeight: "700", color: "#7c3aed", margin: 0 }}>Revisar Pagos</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>Validar comprobantes</p>
            </div>
          </Link>

          {/* Acceso 5: Inventario */}
          <Link
            href="/admin/inventario"
            className="card card-interactive"
            style={{
              padding: "1rem 1.15rem",
              display: "flex",
              alignItems: "center",
              gap: "0.85rem",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                backgroundColor: "#f0f9ff",
                color: "#0284c7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                border: "1px solid #bae6fd",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
            </div>
            <div>
              <h3 style={{ fontSize: "0.925rem", fontWeight: "700", color: "var(--text-primary)", margin: 0 }}>Almacén & Stock</h3>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.15rem 0 0 0" }}>Control de existencias</p>
            </div>
          </Link>
        </div>
      </section>

      {/* 3. SECCIÓN DE ALERTAS OPERATIVAS */}
      <section style={{ marginBottom: "2.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <h2
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span>🔔 ESTADO OPERATIVO DEL NEGOCIO</span>
            {alertas.length > 0 && (
              <span
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  borderRadius: "9999px",
                  fontSize: "0.7rem",
                  padding: "0.1rem 0.55rem",
                  fontWeight: "800",
                  border: "1px solid #fecaca",
                }}
              >
                {alertas.length} acción(es) requerida(s)
              </span>
            )}
          </h2>
        </div>

        {alertas.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "1.25rem 1.5rem",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              alignItems: "center",
              gap: "1.25rem",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: "#dcfce7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#16a34a",
                fontSize: "1.25rem",
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div>
              <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#15803d", margin: 0 }}>
                Operaciones al día en TiendaDelki
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#166534", margin: "0.2rem 0 0 0" }}>
                No hay pagos pendientes de validación, alertas críticas de stock ni órdenes retrasadas.
              </p>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {alertas.map((al) => {
              let bg = "var(--bg-surface)";
              let border = "var(--border-subtle)";
              let titleColor = "var(--text-primary)";
              let btnClass = "btn btn-secondary";

              if (al.type === "danger") {
                bg = "#fef2f2";
                border = "#fecaca";
                titleColor = "#991b1b";
                btnClass = "btn btn-danger";
              } else if (al.type === "warning") {
                bg = "#fffbeb";
                border = "#fde68a";
                titleColor = "#92400e";
              } else if (al.type === "info") {
                bg = "#eff6ff";
                border = "#bfdbfe";
                titleColor = "#1e40af";
              }

              return (
                <div
                  key={al.id}
                  className="card"
                  style={{
                    padding: "1rem 1.4rem",
                    backgroundColor: bg,
                    borderColor: border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "1rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.9rem" }}>
                    <span style={{ fontSize: "1.4rem" }}>{al.icon}</span>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: titleColor, margin: 0 }}>
                          {al.title}
                        </h3>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            padding: "0.1rem 0.45rem",
                            borderRadius: "9999px",
                            backgroundColor: border,
                            color: titleColor,
                            fontWeight: "800",
                          }}
                        >
                          {al.count}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.2rem 0 0 0" }}>
                        {al.message}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={al.actionUrl}
                    className={btnClass}
                    style={{
                      padding: "0.45rem 0.95rem",
                      fontSize: "0.825rem",
                      fontWeight: "700",
                    }}
                  >
                    {al.actionLabel} →
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. TARJETAS DE MÉTRICAS CLAVE (6 KPIS PRINCIPALES CON DISEÑO SAAS MODERNO) */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            marginBottom: "0.85rem",
          }}
        >
          📊 MÉTRICAS DE RENDIMIENTO (KPIs)
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "1.1rem",
          }}
        >
          {/* KPI 1: VENTAS (Online Reales) */}
          <div className="card card-interactive" style={{ padding: "1.35rem 1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Ventas Online
              </span>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#ecfdf5",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #a7f3d0",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="12" y1="1" x2="12" y2="23"></line>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#065f46", letterSpacing: "-0.025em" }}>
              {kpis?.ventas.formatted || "RD$ 0.00"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <span style={{ color: "#10b981", fontWeight: "700" }}>✓</span>
              <span>Pedidos online reales confirmados</span>
            </div>
          </div>

          {/* KPI 2: PEDIDOS REGISTRADOS */}
          <div className="card card-interactive" style={{ padding: "1.35rem 1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Pedidos Registrados
              </span>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #c7d2fe",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#3730a3", letterSpacing: "-0.025em" }}>
              {kpis?.pedidos.totalOrders ?? 0}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              <span style={{ color: "#4f46e5", fontWeight: "700" }}>{kpis?.pedidos.completedOrders ?? 0}</span> completados satisfactoriamente
            </div>
          </div>

          {/* KPI 3: PEDIDOS PENDIENTES DE PAGO */}
          <div className="card card-interactive" style={{ padding: "1.35rem 1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Pendientes de Pago
              </span>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#fffbeb",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #fde68a",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#92400e", letterSpacing: "-0.025em" }}>
              {kpis?.pedidosPendientes.count ?? 0}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              En espera de confirmación de transferencia
            </div>
          </div>

          {/* KPI 4: PAGOS EN REVISIÓN */}
          <div className="card card-interactive" style={{ padding: "1.35rem 1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Pagos en Revisión
                </span>
                {(kpis?.pagosEnRevision.count ?? 0) > 0 && (
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#8b5cf6",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#f5f3ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ddd6fe",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#5b21b6", letterSpacing: "-0.025em" }}>
              {kpis?.pagosEnRevision.count ?? 0}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Comprobantes bancarios por validar
            </div>
          </div>

          {/* KPI 5: STOCK BAJO */}
          <div className="card card-interactive" style={{ padding: "1.35rem 1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Stock Bajo
              </span>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#fff7ed",
                  color: "#ea580c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #ffedd5",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#9a3412", letterSpacing: "-0.025em" }}>
              {kpis?.productosStockBajo.count ?? 0}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Cerca del límite mínimo en almacén
            </div>
          </div>

          {/* KPI 6: PRODUCTOS AGOTADOS */}
          <div className="card card-interactive" style={{ padding: "1.35rem 1.4rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Productos Agotados
              </span>
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  backgroundColor: "#fef2f2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #fecaca",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
              </div>
            </div>
            <div style={{ fontSize: "1.9rem", fontWeight: "800", color: "#991b1b", letterSpacing: "-0.025em" }}>
              {kpis?.productosAgotados.count ?? 0}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
              Sin unidades disponibles (0 en stock)
            </div>
          </div>
        </div>
      </section>

      {/* 5. GRÁFICOS PRINCIPALES: EVOLUCIÓN DE VENTAS Y PEDIDOS */}
      <section style={{ marginBottom: "2.5rem" }}>
        <div className="card" style={{ padding: "clamp(1rem, 2.5vw, 1.75rem)" }}>
          {/* Barra superior de controles del gráfico */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1rem",
              marginBottom: "1.75rem",
              paddingBottom: "1.25rem",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
                Evolución de Ventas y Pedidos
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "0.25rem", margin: 0 }}>
                {chartMetric === "REVENUE"
                  ? "Facturación monetaria online confirmada en pesos dominicanos (RD$)"
                  : "Volumen de pedidos recibidos en la tienda"}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              {/* Selector de Métrica */}
              <div
                style={{
                  display: "flex",
                  backgroundColor: "var(--bg-app)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.25rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  onClick={() => setChartMetric("REVENUE")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "calc(var(--radius-md) - 2px)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    backgroundColor: chartMetric === "REVENUE" ? "#ffffff" : "transparent",
                    color: chartMetric === "REVENUE" ? "#15803d" : "var(--text-muted)",
                    boxShadow: chartMetric === "REVENUE" ? "var(--shadow-xs)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  Ventas (RD$)
                </button>
                <button
                  onClick={() => setChartMetric("ORDERS")}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "calc(var(--radius-md) - 2px)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    backgroundColor: chartMetric === "ORDERS" ? "#ffffff" : "transparent",
                    color: chartMetric === "ORDERS" ? "var(--color-brand-primary)" : "var(--text-muted)",
                    boxShadow: chartMetric === "ORDERS" ? "var(--shadow-xs)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  Pedidos (#)
                </button>
              </div>

              {/* Selector de Período (Día / Semana / Mes) */}
              <div
                style={{
                  display: "flex",
                  backgroundColor: "var(--bg-app)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.25rem",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {(["DIA", "SEMANA", "MES"] as const).map((p) => {
                  const labels = { DIA: "Por Día", SEMANA: "Por Semana", MES: "Por Mes" };
                  const isSelected = chartPeriod === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      style={{
                        padding: "0.4rem 0.85rem",
                        borderRadius: "calc(var(--radius-md) - 2px)",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        backgroundColor: isSelected ? "var(--color-brand-primary)" : "transparent",
                        color: isSelected ? "#ffffff" : "var(--text-muted)",
                        boxShadow: isSelected ? "0 1px 3px rgba(79, 70, 229, 0.3)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {labels[p]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Gráfico SVG Interactivo */}
          <div style={{ width: "100%", overflowX: "auto" }}>
            <div style={{ minWidth: "620px", height: "290px", position: "relative" }}>
              <svg width="100%" height="100%" viewBox="0 0 800 290" preserveAspectRatio="none" style={{ overflow: "visible" }}>
                <defs>
                  <linearGradient id="chart-emerald-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                  <linearGradient id="chart-indigo-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>

                {/* Líneas de guía horizontales */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const y = 230 - p * 190;
                  const val = maxChartValue * p;
                  return (
                    <g key={idx}>
                      <line
                        x1="45"
                        y1={y}
                        x2="780"
                        y2={y}
                        stroke="rgba(226, 232, 240, 0.8)"
                        strokeDasharray={idx === 0 ? "none" : "3,3"}
                        strokeWidth="1"
                      />
                      <text
                        x="38"
                        y={y + 4}
                        fill="var(--text-muted)"
                        fontSize="10"
                        textAnchor="end"
                        fontFamily="sans-serif"
                        fontWeight="600"
                      >
                        {chartMetric === "REVENUE"
                          ? val >= 1000
                            ? `RD$${Math.round(val / 1000)}k`
                            : `RD$${Math.round(val)}`
                          : Math.round(val)}
                      </text>
                    </g>
                  );
                })}

                {/* Barras interactivas */}
                {currentChartSeries.map((item, idx) => {
                  const barWidth = Math.max(14, Math.min(38, (720 / currentChartSeries.length) * 0.65));
                  const step = (740 - 50) / currentChartSeries.length;
                  const x = 55 + idx * step + (step - barWidth) / 2;
                  const normalizedHeight = maxChartValue > 0 ? (item.value / maxChartValue) * 190 : 0;
                  const barHeight = Math.max(4, normalizedHeight);
                  const y = 230 - barHeight;
                  const isHovered = hoveredIndex === idx;

                  const fillGradient = chartMetric === "REVENUE" ? "url(#chart-emerald-grad)" : "url(#chart-indigo-grad)";

                  return (
                    <g
                      key={idx}
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Fondo de columna para hover */}
                      <rect
                        x={55 + idx * step}
                        y="20"
                        width={step}
                        height={220}
                        fill={isHovered ? "rgba(79, 70, 229, 0.05)" : "transparent"}
                        rx="6"
                      />

                      {/* Barra */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        rx="5"
                        fill={fillGradient}
                        opacity={isHovered ? 1 : 0.88}
                        style={{ transition: "all 0.15s ease" }}
                      />

                      {/* Etiqueta inferior del eje X */}
                      <text
                        x={x + barWidth / 2}
                        y="255"
                        fill={isHovered ? "var(--text-primary)" : "var(--text-muted)"}
                        fontSize="10"
                        fontWeight={isHovered ? "700" : "500"}
                        textAnchor="middle"
                        fontFamily="sans-serif"
                      >
                        {item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Tooltip dinámico sobre la barra activa */}
              {hoveredIndex !== null && currentChartSeries[hoveredIndex] && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "15px",
                    backgroundColor: "var(--bg-surface-elevated)",
                    border: "1px solid var(--border-subtle)",
                    padding: "0.65rem 1rem",
                    borderRadius: "var(--radius-md)",
                    boxShadow: "var(--shadow-lg)",
                    pointerEvents: "none",
                    zIndex: 10,
                  }}
                >
                  <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase" }}>
                    {currentChartSeries[hoveredIndex].label}
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "800", color: "#15803d", marginTop: "0.15rem" }}>
                    {formatCurrency(currentChartSeries[hoveredIndex].revenue)}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-brand-primary)", fontWeight: "600", marginTop: "0.1rem" }}>
                    {currentChartSeries[hoveredIndex].orders} pedido(s)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. ANÁLISIS COMPLEMENTARIOS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* GRÁFICO 1: DISTRIBUCIÓN DE PEDIDOS POR ESTADO */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
              Pedidos por Estado
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
              Distribución total de {totalOrdersCount} pedidos registrados
            </p>
          </div>

          {/* Barra de Progreso Multi-color */}
          <div
            style={{
              display: "flex",
              height: "12px",
              width: "100%",
              borderRadius: "9999px",
              overflow: "hidden",
              backgroundColor: "var(--bg-app)",
              marginBottom: "1.5rem",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {data?.charts.pedidosPorEstado.map((st) => {
              const pct = totalOrdersCount > 0 ? (st.count / totalOrdersCount) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={st.status}
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    backgroundColor: st.color,
                  }}
                  title={`${st.label}: ${st.count} (${Math.round(pct)}%)`}
                />
              );
            })}
          </div>

          {/* Lista detallada de estados */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", flex: 1 }}>
            {data?.charts.pedidosPorEstado.map((st) => {
              const pct = totalOrdersCount > 0 ? Math.round((st.count / totalOrdersCount) * 100) : 0;
              return (
                <Link
                  key={st.status}
                  href={`/admin/pedidos?status=${st.status}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.55rem 0.75rem",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    backgroundColor: "transparent",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-subtle)")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span
                      style={{
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        backgroundColor: st.color,
                      }}
                    />
                    <span style={{ fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: "500" }}>{st.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--text-primary)" }}>
                      {st.count}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: "32px", textAlign: "right" }}>
                      {pct}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* GRÁFICO 2: PRODUCTOS MÁS VENDIDOS */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
              Productos Más Vendidos
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
              Ranking en órdenes online reales confirmadas
            </p>
          </div>

          {(!data?.charts.productosMasVendidos || data.charts.productosMasVendidos.length === 0) ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: "0.85rem" }}>No hay ventas confirmadas registradas aún.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flex: 1 }}>
              {data.charts.productosMasVendidos.map((prod, idx) => (
                <div
                  key={prod.productId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.65rem 0.85rem",
                    backgroundColor: "var(--bg-app)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    gap: "0.75rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                    {/* Badge de Ranking */}
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        backgroundColor: idx === 0 ? "#f59e0b" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "#e2e8f0",
                        color: idx <= 2 ? "#ffffff" : "var(--text-secondary)",
                        fontWeight: "800",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Miniatura si existe */}
                    {prod.thumbnailUrl ? (
                      <img
                        src={prod.thumbnailUrl}
                        alt={prod.name}
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "var(--radius-sm)",
                          objectFit: "cover",
                          flexShrink: 0,
                          border: "1px solid var(--border-subtle)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "var(--radius-sm)",
                          backgroundColor: "#e2e8f0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1rem",
                          flexShrink: 0,
                        }}
                      >
                        🏷️
                      </div>
                    )}

                    <div style={{ minWidth: 0 }}>
                      <h4
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: "700",
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          margin: 0,
                        }}
                      >
                        {prod.name}
                      </h4>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0.1rem 0 0 0" }}>
                        {prod.categoryName}
                      </p>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: "800", color: "#15803d" }}>
                      {prod.revenueFormatted}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {prod.unitsSold} {prod.unitsSold === 1 ? "ud." : "uds."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GRÁFICO 3: CATEGORÍAS MÁS VENDIDAS */}
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: "800", color: "var(--text-primary)", margin: 0 }}>
              Categorías Más Vendidas
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0 0" }}>
              Participación porcentual y facturación online
            </p>
          </div>

          {(!data?.charts.categoriasMasVendidas || data.charts.categoriasMasVendidas.length === 0) ? (
            <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ fontSize: "0.85rem" }}>No hay ventas clasificadas por categoría aún.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", flex: 1 }}>
              {data.charts.categoriasMasVendidas.map((cat) => (
                <div key={cat.categoryId} style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text-primary)" }}>
                      {cat.categoryName}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#15803d" }}>
                        {cat.revenueFormatted}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", width: "35px", textAlign: "right" }}>
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso de la categoría */}
                  <div
                    style={{
                      height: "8px",
                      width: "100%",
                      backgroundColor: "var(--bg-app)",
                      borderRadius: "9999px",
                      overflow: "hidden",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${Math.max(4, cat.percentage)}%`,
                        backgroundColor: "var(--color-brand-primary)",
                        borderRadius: "9999px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>

                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {cat.unitsSold} {cat.unitsSold === 1 ? "artículo vendido" : "artículos vendidos"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
