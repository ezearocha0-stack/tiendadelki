import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/core/catalog/product-service";
import { updateProductSchema } from "@/core/catalog/validation";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await ProductService.getProductByIdOrSlug(id);

    return NextResponse.json({
      success: true,
      data: product,
    });
  } catch (error) {
    return handleApiError(error, "ProductDetailAPI.GET");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser(req);
    const { id } = await params;
    const body = await req.json();
    const validated = updateProductSchema.parse(body);

    const updated = await ProductService.updateProduct(id, validated);

    return NextResponse.json({
      success: true,
      message: "Producto actualizado exitosamente",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, "ProductDetailAPI.PUT");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser(req);
    const { id } = await params;
    const result = await ProductService.deleteProduct(id);

    return NextResponse.json({
      success: true,
      message: "Producto eliminado o archivado exitosamente",
      data: result,
    });
  } catch (error) {
    return handleApiError(error, "ProductDetailAPI.DELETE");
  }
}

