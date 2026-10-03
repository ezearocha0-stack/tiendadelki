import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireAuthenticatedUser } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.userId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            basePrice: true,
            compareAtPrice: true,
            stock: true,
            hasVariants: true,
            category: { select: { id: true, name: true, slug: true } },
            images: {
              where: { isPrimary: true },
              select: { thumbnailUrl: true, url: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: favorites.map((f) => ({
        id: f.id,
        productId: f.productId,
        createdAt: f.createdAt,
        product: {
          ...f.product,
          basePrice: Number(f.product.basePrice),
          compareAtPrice: f.product.compareAtPrice ? Number(f.product.compareAtPrice) : null,
          thumbnailUrl: f.product.images[0]?.thumbnailUrl || f.product.images[0]?.url || null,
        },
      })),
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.GetFavorites");
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    const body = await req.json();
    const productId = body.productId;

    if (!productId || typeof productId !== "string") {
      throw new ValidationError("ID de producto inválido.");
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError("Producto no encontrado.");
    }

    const favorite = await prisma.favorite.upsert({
      where: {
        userId_productId: {
          userId: session.userId,
          productId,
        },
      },
      create: {
        userId: session.userId,
        productId,
      },
      update: {},
    });

    return NextResponse.json({
      success: true,
      message: "Producto agregado a favoritos",
      data: favorite,
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.AddFavorite");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuthenticatedUser(req);
    const { searchParams } = new URL(req.url);
    let productId = searchParams.get("productId");

    if (!productId) {
      try {
        const body = await req.json();
        productId = body.productId;
      } catch (e) {
        // Ignorar si no hay body
      }
    }

    if (!productId) {
      throw new ValidationError("ID de producto requerido para remover de favoritos.");
    }

    await prisma.favorite.deleteMany({
      where: {
        userId: session.userId,
        productId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Producto removido de favoritos",
    });
  } catch (error) {
    return handleApiError(error, "CustomerAPI.RemoveFavorite");
  }
}
