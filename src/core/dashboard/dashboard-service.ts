import { prisma } from "@/lib/db";
import { OrderStatus } from "@prisma/client";
import { formatCurrency } from "@/lib/formatters";

export const CONFIRMED_SALES_STATUSES: OrderStatus[] = [
  "PAGADO",
  "PREPARANDO",
  "ENVIADO",
  "ENTREGADO",
  "COMPLETADO",
];

export interface DashboardMetricKpis {
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

export interface DaySalesPoint {
  date: string; // YYYY-MM-DD
  label: string; // "DD MMM"
  revenue: number;
  ordersCount: number;
}

export interface WeekSalesPoint {
  weekKey: string; // YYYY-Www
  label: string; // "Sem XX"
  revenue: number;
  ordersCount: number;
}

export interface MonthSalesPoint {
  monthKey: string; // YYYY-MM
  label: string; // "Mes YYYY"
  revenue: number;
  ordersCount: number;
}

export interface OrderStatusBreakdown {
  status: OrderStatus;
  label: string;
  count: number;
  color: string;
}

export interface TopProductItem {
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

export interface TopCategoryItem {
  categoryId: string;
  categoryName: string;
  unitsSold: number;
  totalRevenue: number;
  revenueFormatted: string;
  percentage: number;
}

export interface DashboardAlertItem {
  id: string;
  type: "warning" | "danger" | "info" | "neutral" | "success";
  icon: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  count: number;
}

export interface DashboardStatsResult {
  kpis: DashboardMetricKpis;
  charts: {
    ventasPorDia: DaySalesPoint[];
    ventasPorSemana: WeekSalesPoint[];
    ventasPorMes: MonthSalesPoint[];
    pedidosPorEstado: OrderStatusBreakdown[];
    productosMasVendidos: TopProductItem[];
    categoriasMasVendidas: TopCategoryItem[];
  };
  alertas: DashboardAlertItem[];
}

const MONTH_NAMES_ES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

const FULL_MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export class DashboardService {
  /**
   * Obtiene todas las métricas operativas y estratégicas del Dashboard.
   * IMPORTANTE: Las ventas monetarias corresponden única y exclusivamente
   * a pedidos online reales en estados confirmados.
   * Las ventas físicas no facturadas se reflejan en el inventario físico en tiempo real.
   */
  static async getDashboardStats(): Promise<DashboardStatsResult> {
    // 1. Concurrencia de consultas base
    const [
      salesAgg,
      totalOrders,
      completedOrdersCount,
      pendingOrdersCount,
      reviewOrdersCount,
      preparingOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
      canceledOrdersCount,
      products,
      confirmedOrderItems,
      allOrdersRecent,
    ] = await Promise.all([
      // Ventas online totales (únicamente pedidos confirmados)
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { in: CONFIRMED_SALES_STATUSES } },
      }),
      // Total pedidos
      prisma.order.count(),
      // Pedidos completados
      prisma.order.count({ where: { status: "COMPLETADO" } }),
      // Pedidos pendientes de pago
      prisma.order.count({ where: { status: "PENDIENTE_DE_PAGO" } }),
      // Pagos en revisión
      prisma.order.count({ where: { status: "PAGO_EN_REVISION" } }),
      // En preparación (listos para empaque/envío)
      prisma.order.count({ where: { status: "PREPARANDO" } }),
      // Enviados
      prisma.order.count({ where: { status: "ENVIADO" } }),
      // Entregados
      prisma.order.count({ where: { status: "ENTREGADO" } }),
      // Cancelados
      prisma.order.count({ where: { status: "CANCELADO" } }),
      // Inventario de productos y variantes activas (para stock bajo y agotado)
      prisma.product.findMany({
        where: { status: { not: "ARCHIVED" } },
        select: {
          id: true,
          name: true,
          slug: true,
          sku: true,
          stock: true,
          minStock: true,
          hasVariants: true,
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              title: true,
              sku: true,
              stock: true,
              minStock: true,
            },
          },
        },
      }),
      // Items de pedidos confirmados para análisis de productos y categorías más vendidas
      prisma.orderItem.findMany({
        where: {
          order: {
            status: { in: CONFIRMED_SALES_STATUSES },
          },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              category: { select: { id: true, name: true } },
              images: {
                where: { isPrimary: true },
                select: { thumbnailUrl: true, url: true },
                take: 1,
              },
            },
          },
        },
      }),
      // Pedidos de los últimos 6 meses para construcción de gráficos de ventas por día/semana/mes
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // últimos ~6 meses
          },
        },
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // 2. Cálculo de Stock Bajo y Agotados (Reflejo del inventario físico y online)
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      if (p.hasVariants) {
        const isOutOfStock = p.variants.length > 0 && p.variants.every((v) => v.stock === 0);
        const hasLowStock = p.variants.some((v) => v.stock > 0 && v.stock <= v.minStock);

        if (isOutOfStock) {
          outOfStockCount++;
        } else if (hasLowStock) {
          lowStockCount++;
        }
      } else {
        if (p.stock === 0) {
          outOfStockCount++;
        } else if (p.stock <= p.minStock) {
          lowStockCount++;
        }
      }
    }

    const totalRevenue = Number(salesAgg._sum.total ?? 0);

    // 3. KPIs consolidados
    const kpis: DashboardMetricKpis = {
      ventas: {
        totalRevenue,
        formatted: formatCurrency(totalRevenue),
        currency: "DOP",
      },
      pedidos: {
        totalOrders,
        completedOrders: completedOrdersCount,
      },
      pedidosPendientes: {
        count: pendingOrdersCount,
      },
      pagosEnRevision: {
        count: reviewOrdersCount,
      },
      productosStockBajo: {
        count: lowStockCount,
      },
      productosAgotados: {
        count: outOfStockCount,
      },
    };

    // 4. Series Temporales: Ventas y Pedidos por Día (últimos 14 días)
    const ventasPorDia: DaySalesPoint[] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateKey = `${year}-${month}-${day}`;
      const label = `${d.getDate()} ${MONTH_NAMES_ES[d.getMonth()]}`;

      // Filtrar pedidos que caen en este día (comparación de fecha local/UTC estándar)
      const dayOrders = allOrdersRecent.filter((o) => {
        const od = new Date(o.createdAt);
        return (
          od.getFullYear() === d.getFullYear() &&
          od.getMonth() === d.getMonth() &&
          od.getDate() === d.getDate()
        );
      });

      const dayRevenue = dayOrders
        .filter((o) => CONFIRMED_SALES_STATUSES.includes(o.status))
        .reduce((sum, o) => sum + Number(o.total), 0);

      ventasPorDia.push({
        date: dateKey,
        label,
        revenue: Math.round(dayRevenue * 100) / 100,
        ordersCount: dayOrders.length,
      });
    }

    // 5. Series Temporales: Ventas y Pedidos por Semana (últimas 8 semanas)
    const ventasPorSemana: WeekSalesPoint[] = [];
    for (let w = 7; w >= 0; w--) {
      const startOfWeek = new Date(now.getTime() - (w * 7 + 6) * 24 * 60 * 60 * 1000);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      endOfWeek.setHours(23, 59, 59, 999);

      const weekLabel = `Sem ${8 - w} (${startOfWeek.getDate()} ${MONTH_NAMES_ES[startOfWeek.getMonth()]})`;

      const weekOrders = allOrdersRecent.filter((o) => {
        const od = new Date(o.createdAt);
        return od >= startOfWeek && od <= endOfWeek;
      });

      const weekRevenue = weekOrders
        .filter((o) => CONFIRMED_SALES_STATUSES.includes(o.status))
        .reduce((sum, o) => sum + Number(o.total), 0);

      ventasPorSemana.push({
        weekKey: `W-${8 - w}`,
        label: weekLabel,
        revenue: Math.round(weekRevenue * 100) / 100,
        ordersCount: weekOrders.length,
      });
    }

    // 6. Series Temporales: Ventas y Pedidos por Mes (últimos 6 meses)
    const ventasPorMes: MonthSalesPoint[] = [];
    for (let m = 5; m >= 0; m--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const targetYear = monthDate.getFullYear();
      const targetMonth = monthDate.getMonth();
      const monthKey = `${targetYear}-${String(targetMonth + 1).padStart(2, "0")}`;
      const label = `${FULL_MONTH_NAMES_ES[targetMonth]} ${targetYear}`;

      const monthOrders = allOrdersRecent.filter((o) => {
        const od = new Date(o.createdAt);
        return od.getFullYear() === targetYear && od.getMonth() === targetMonth;
      });

      const monthRevenue = monthOrders
        .filter((o) => CONFIRMED_SALES_STATUSES.includes(o.status))
        .reduce((sum, o) => sum + Number(o.total), 0);

      ventasPorMes.push({
        monthKey,
        label,
        revenue: Math.round(monthRevenue * 100) / 100,
        ordersCount: monthOrders.length,
      });
    }

    // 7. Pedidos por Estado (Desglose para gráfico de distribución)
    const pedidosPorEstado: OrderStatusBreakdown[] = [
      { status: "PENDIENTE_DE_PAGO", label: "Pendiente de Pago", count: pendingOrdersCount, color: "#f59e0b" },
      { status: "PAGO_EN_REVISION", label: "Pago en Revisión", count: reviewOrdersCount, color: "#8b5cf6" },
      { status: "PAGADO", label: "Pagado", count: await prisma.order.count({ where: { status: "PAGADO" } }), color: "#10b981" },
      { status: "PREPARANDO", label: "En Preparación", count: preparingOrdersCount, color: "#3b82f6" },
      { status: "ENVIADO", label: "Enviado", count: shippedOrdersCount, color: "#06b6d4" },
      { status: "ENTREGADO", label: "Entregado", count: deliveredOrdersCount, color: "#14b8a6" },
      { status: "COMPLETADO", label: "Completado", count: completedOrdersCount, color: "#059669" },
      { status: "CANCELADO", label: "Cancelado", count: canceledOrdersCount, color: "#ef4444" },
    ];

    // 8. Productos más vendidos en órdenes online confirmadas
    const productSalesMap = new Map<
      string,
      {
        productId: string;
        name: string;
        slug: string;
        sku: string | null;
        categoryName: string;
        thumbnailUrl: string | null;
        unitsSold: number;
        totalRevenue: number;
      }
    >();

    for (const item of confirmedOrderItems) {
      const pid = item.productId;
      const existing = productSalesMap.get(pid);
      const units = item.quantity;
      const revenue = Number(item.totalPrice);

      if (existing) {
        existing.unitsSold += units;
        existing.totalRevenue += revenue;
      } else {
        productSalesMap.set(pid, {
          productId: pid,
          name: item.productTitle || item.product.name,
          slug: item.product.slug,
          sku: item.sku || null,
          categoryName: item.product.category?.name || "General",
          thumbnailUrl: item.product.images[0]?.thumbnailUrl || item.product.images[0]?.url || null,
          unitsSold: units,
          totalRevenue: revenue,
        });
      }
    }

    const productosMasVendidos: TopProductItem[] = Array.from(productSalesMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold || b.totalRevenue - a.totalRevenue)
      .slice(0, 5)
      .map((p) => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        revenueFormatted: formatCurrency(p.totalRevenue),
      }));

    // 9. Categorías más vendidas en órdenes online confirmadas
    const categorySalesMap = new Map<
      string,
      {
        categoryId: string;
        categoryName: string;
        unitsSold: number;
        totalRevenue: number;
      }
    >();

    for (const item of confirmedOrderItems) {
      const catId = item.product.category?.id || "uncategorized";
      const catName = item.product.category?.name || "Sin Categoría";
      const existing = categorySalesMap.get(catId);
      const units = item.quantity;
      const revenue = Number(item.totalPrice);

      if (existing) {
        existing.unitsSold += units;
        existing.totalRevenue += revenue;
      } else {
        categorySalesMap.set(catId, {
          categoryId: catId,
          categoryName: catName,
          unitsSold: units,
          totalRevenue: revenue,
        });
      }
    }

    const totalCatRevenue = Array.from(categorySalesMap.values()).reduce(
      (sum, c) => sum + c.totalRevenue,
      0
    );

    const categoriasMasVendidas: TopCategoryItem[] = Array.from(categorySalesMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.unitsSold - a.unitsSold)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        totalRevenue: Math.round(c.totalRevenue * 100) / 100,
        revenueFormatted: formatCurrency(c.totalRevenue),
        percentage: totalCatRevenue > 0 ? Math.round((c.totalRevenue / totalCatRevenue) * 100) : 0,
      }));

    // 10. Alertas Operativas Dinámicas
    const alertas: DashboardAlertItem[] = [];

    // Alerta 1: Pagos en revisión
    if (reviewOrdersCount > 0) {
      alertas.push({
        id: "alert_pagos_revision",
        type: "warning",
        icon: "💳",
        title: "Pagos por revisar",
        message: `${reviewOrdersCount} ${
          reviewOrdersCount === 1 ? "pedido espera" : "pedidos esperan"
        } confirmación de pago.`,
        actionLabel: "Revisar Pagos",
        actionUrl: "/admin/pedidos?status=PAGO_EN_REVISION",
        count: reviewOrdersCount,
      });
    }

    // Alerta 2: Pedidos listos para empaque/envío
    if (preparingOrdersCount > 0) {
      alertas.push({
        id: "alert_pedidos_preparando",
        type: "info",
        icon: "📦",
        title: "Listos para despacho",
        message: `${preparingOrdersCount} ${
          preparingOrdersCount === 1 ? "pedido está listo" : "pedidos están listos"
        } para empaque y envío.`,
        actionLabel: "Ver Pedidos en Preparación",
        actionUrl: "/admin/pedidos?status=PREPARANDO",
        count: preparingOrdersCount,
      });
    }

    // Alerta 3: Stock bajo
    if (lowStockCount > 0) {
      alertas.push({
        id: "alert_stock_bajo",
        type: "warning",
        icon: "⚠️",
        title: "Stock bajo",
        message: `${lowStockCount} ${
          lowStockCount === 1 ? "producto tiene" : "productos tienen"
        } stock bajo.`,
        actionLabel: "Revisar Inventario",
        actionUrl: "/admin/inventario?status=LOW_STOCK",
        count: lowStockCount,
      });
    }

    // Alerta 4: Productos agotados
    if (outOfStockCount > 0) {
      alertas.push({
        id: "alert_productos_agotados",
        type: "danger",
        icon: "🚫",
        title: "Productos agotados",
        message: `${outOfStockCount} ${
          outOfStockCount === 1 ? "producto está" : "productos están"
        } totalmente agotados.`,
        actionLabel: "Ver Agotados",
        actionUrl: "/admin/inventario?status=OUT_OF_STOCK",
        count: outOfStockCount,
      });
    }

    // Alerta 5: Pedidos pendientes de pago
    if (pendingOrdersCount > 0) {
      alertas.push({
        id: "alert_pedidos_pendientes",
        type: "neutral",
        icon: "⏳",
        title: "Pendientes de pago",
        message: `${pendingOrdersCount} ${
          pendingOrdersCount === 1 ? "pedido pendiente" : "pedidos pendientes"
        } de pago por el cliente.`,
        actionLabel: "Ver Pendientes",
        actionUrl: "/admin/pedidos?status=PENDIENTE_DE_PAGO",
        count: pendingOrdersCount,
      });
    }

    return {
      kpis,
      charts: {
        ventasPorDia,
        ventasPorSemana,
        ventasPorMes,
        pedidosPorEstado,
        productosMasVendidos,
        categoriasMasVendidas,
      },
      alertas,
    };
  }
}
