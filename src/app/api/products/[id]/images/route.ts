import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/core/catalog/product-service";
import { productImageSchema } from "@/core/catalog/validation";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser(req);
    const { id } = await params;
    const body = await req.json();
    const validated = productImageSchema.parse(body);

    const image = await ProductService.addImage(id, validated);

    return NextResponse.json(
      {
        success: true,
        message: "Imagen agregada al producto exitosamente",
        data: image,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "ProductImagesAPI.POST");
  }
}

