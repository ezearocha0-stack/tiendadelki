import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { DashboardService } from "@/core/dashboard/dashboard-service";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const adminUserId = req.headers.get("x-user-id");
    const adminUserRole = req.headers.get("x-user-role");

    const [stats, totalProducts, totalCategories] = await Promise.all([
      DashboardService.getDashboardStats(),
      prisma.product.count({ where: { status: { not: "ARCHIVED" } } }),
      prisma.category.count({ where: { isActive: true } }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        adminInfo: {
          userId: adminUserId,
          role: adminUserRole,
        },
        kpis: stats.kpis,
        charts: stats.charts,
        alertas: stats.alertas,
        metrics: {
          totalProducts,
          totalCategories,
          totalOrders: stats.kpis.pedidos.totalOrders,
          pendingOrders: stats.kpis.pedidosPendientes.count,
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "AdminAPI.DashboardStats");
  }
}
