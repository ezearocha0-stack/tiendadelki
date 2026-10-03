import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/errors";
import { z } from "zod";

const validateCartSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string().min(1),
      variantId: z.string().optional().nullable(),
      quantity: z.number().int().positive(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = validateCartSchema.parse(body);

    const validatedItems = [];
    const issues = [];
    let isValid = true;

    for (const item of items) {
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
          include: {
            product: {
              select: { id: true, name: true, slug: true, status: true },
            },
          },
        });

        if (!variant || !variant.isActive || variant.product.status !== "PUBLISHED") {
          isValid = false;
          issues.push({
            productId: item.productId,
            variantId: item.variantId,
            message: "La variante seleccionada ya no está disponible.",
            type: "UNAVAILABLE",
          });
          continue;
        }

        const currentPrice = Number(variant.price);
        const currentStock = variant.stock;

        if (currentStock === 0) {
          isValid = false;
          issues.push({
            productId: item.productId,
            variantId: item.variantId,
            productTitle: `${variant.product.name} (${variant.title})`,
            message: `El producto ${variant.product.name} (${variant.title}) se encuentra agotado.`,
            type: "OUT_OF_STOCK",
            availableStock: 0,
          });
        } else if (currentStock < item.quantity) {
          isValid = false;
          issues.push({
            productId: item.productId,
            variantId: item.variantId,
            productTitle: `${variant.product.name} (${variant.title})`,
            message: `Solo quedan ${currentStock} unidades disponibles de ${variant.product.name} (${variant.title}).`,
            type: "STOCK_REDUCED",
            availableStock: currentStock,
          });
        }

        validatedItems.push({
          productId: variant.productId,
          variantId: variant.id,
          productTitle: variant.product.name,
          variantTitle: variant.title,
          sku: variant.sku,
          price: currentPrice,
          compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : null,
          maxStock: currentStock,
          isAvailable: currentStock > 0,
        });
      } else {
        const product = await prisma.product.findUnique({
          where: { id: item.productId },
        });

        if (!product || product.status !== "PUBLISHED") {
          isValid = false;
          issues.push({
            productId: item.productId,
            variantId: null,
            message: "El producto seleccionado ya no está disponible.",
            type: "UNAVAILABLE",
          });
          continue;
        }

        const currentPrice = Number(product.basePrice);
        const currentStock = product.stock;

        if (currentStock === 0) {
          isValid = false;
          issues.push({
            productId: item.productId,
            variantId: null,
            productTitle: product.name,
            message: `El producto ${product.name} se encuentra agotado.`,
            type: "OUT_OF_STOCK",
            availableStock: 0,
          });
        } else if (currentStock < item.quantity) {
          isValid = false;
          issues.push({
            productId: item.productId,
            variantId: null,
            productTitle: product.name,
            message: `Solo quedan ${currentStock} unidades disponibles de ${product.name}.`,
            type: "STOCK_REDUCED",
            availableStock: currentStock,
          });
        }

        validatedItems.push({
          productId: product.id,
          variantId: null,
          productTitle: product.name,
          variantTitle: null,
          sku: product.sku || "GEN-SKU",
          price: currentPrice,
          compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
          maxStock: currentStock,
          isAvailable: currentStock > 0,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isValid,
        items: validatedItems,
        issues,
      },
    });
  } catch (error) {
    return handleApiError(error, "CartValidationAPI.POST");
  }
}
