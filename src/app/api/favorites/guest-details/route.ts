import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productIds: string[] = body.productIds;

    if (!Array.isArray(productIds)) {
      throw new ValidationError("productIds debe ser un arreglo de IDs.");
    }

    if (productIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Limitar a máximo 50 productos para seguridad
    const safeIds = productIds.slice(0, 50).filter((id) => typeof id === "string" && id.trim().length > 0);

    const products = await prisma.product.findMany({
      where: {
        id: { in: safeIds },
        status: "PUBLISHED",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        compareAtPrice: true,
        stock: true,
        hasVariants: true,
        isNew: true,
        isFeatured: true,
        category: { select: { id: true, name: true, slug: true } },
        images: {
          where: { isPrimary: true },
          select: { thumbnailUrl: true, url: true },
          take: 1,
        },
        variants: {
          where: { isActive: true },
          select: { id: true, stock: true },
        },
      },
    });

    const formatted = products.map((p) => {
      let isOutOfStock = false;
      if (p.hasVariants) {
        isOutOfStock = p.variants.length > 0 && p.variants.every((v) => v.stock === 0);
      } else {
        isOutOfStock = p.stock === 0;
      }

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        basePrice: Number(p.basePrice),
        compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        stock: p.stock,
        hasVariants: p.hasVariants,
        isNew: p.isNew,
        isFeatured: p.isFeatured,
        isOutOfStock,
        categoryName: p.category.name,
        thumbnailUrl: p.images[0]?.thumbnailUrl || p.images[0]?.url || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    return handleApiError(error, "FavoritesGuestDetails.POST");
  }
}
