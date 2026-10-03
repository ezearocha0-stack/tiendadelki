import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    const body = await req.json();
    const productIds: string[] = body.productIds;

    if (!Array.isArray(productIds)) {
      throw new ValidationError("productIds debe ser un arreglo de IDs.");
    }

    const safeIds = productIds.slice(0, 50).filter((id) => typeof id === "string" && id.trim().length > 0);

    if (safeIds.length === 0) {
      return NextResponse.json({ success: true, count: 0 });
    }

    // Verificar que los productos existan y estén publicados
    const existingProducts = await prisma.product.findMany({
      where: {
        id: { in: safeIds },
        status: "PUBLISHED",
      },
      select: { id: true },
    });

    let syncedCount = 0;
    for (const prod of existingProducts) {
      await prisma.favorite.upsert({
        where: {
          userId_productId: {
            userId: session.userId,
            productId: prod.id,
          },
        },
        create: {
          userId: session.userId,
          productId: prod.id,
        },
        update: {},
      });
      syncedCount++;
    }

    return NextResponse.json({
      success: true,
      message: `${syncedCount} favoritos sincronizados a tu cuenta`,
      count: syncedCount,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.SyncFavorites");
  }
}
