import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";
import { ADMIN_ROLES } from "@/core/auth/jwt";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    if (!ADMIN_ROLES.includes(session.role)) {
      throw new ForbiddenError("Acceso denegado: se requieren permisos administrativos.");
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "25", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {
      role: "CUSTOMER",
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { whatsapp: { contains: search, mode: "insensitive" } },
      ];
    }

    const [totalCustomers, customers] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          whatsapp: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: { orders: true },
          },
          orders: {
            select: {
              total: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    // Mapear métricas sin exponer información sensible
    const mappedCustomers = customers.map((c) => {
      const ordersCount = c._count.orders;
      const totalSpent = c.orders.reduce((sum, o) => sum + Number(o.total), 0);
      return {
        id: c.id,
        name: `${c.firstName} ${c.lastName}`.trim(),
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        phone: c.phone,
        whatsapp: c.whatsapp,
        isActive: c.isActive,
        createdAt: c.createdAt,
        ordersCount,
        totalSpent,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        customers: mappedCustomers,
        pagination: {
          total: totalCustomers,
          page,
          limit,
          totalPages: Math.ceil(totalCustomers / limit),
        },
      },
    });
  } catch (error) {
    return handleApiError(error, "AdminCustomersAPI.GET");
  }
}
