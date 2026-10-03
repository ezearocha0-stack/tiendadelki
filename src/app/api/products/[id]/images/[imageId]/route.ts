import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/core/catalog/product-service";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    await requireAdminUser(req);
    const { id, imageId } = await params;
    const body = await req.json();

    if (body.isPrimary) {
      await ProductService.setPrimaryImage(id, imageId);
    }

    return NextResponse.json({
      success: true,
      message: "Imagen actualizada exitosamente",
    });
  } catch (error) {
    return handleApiError(error, "ProductImageDetailAPI.PATCH");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  try {
    await requireAdminUser(req);
    const { imageId } = await params;
    await ProductService.deleteImage(imageId);

    return NextResponse.json({
      success: true,
      message: "Imagen eliminada de la base de datos y del almacenamiento exitosamente",
    });
  } catch (error) {
    return handleApiError(error, "ProductImageDetailAPI.DELETE");
  }
}

