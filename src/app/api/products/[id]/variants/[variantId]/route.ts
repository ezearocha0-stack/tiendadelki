import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/core/catalog/product-service";
import { createVariantSchema } from "@/core/catalog/validation";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    await requireAdminUser(req);
    const { variantId } = await params;
    const body = await req.json();
    const validated = createVariantSchema.partial().parse(body);

    const updated = await ProductService.updateVariant(variantId, validated);

    return NextResponse.json({
      success: true,
      message: "Variante actualizada exitosamente",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, "ProductVariantDetailAPI.PUT");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> }
) {
  try {
    await requireAdminUser(req);
    const { variantId } = await params;
    await ProductService.deleteVariant(variantId);

    return NextResponse.json({
      success: true,
      message: "Variante eliminada exitosamente",
    });
  } catch (error) {
    return handleApiError(error, "ProductVariantDetailAPI.DELETE");
  }
}

