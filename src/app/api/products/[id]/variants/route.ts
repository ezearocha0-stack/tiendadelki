import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/core/catalog/product-service";
import { createVariantSchema } from "@/core/catalog/validation";
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
    const validated = createVariantSchema.parse(body);

    const variant = await ProductService.addVariant(id, validated);

    return NextResponse.json(
      {
        success: true,
        message: "Variante agregada exitosamente",
        data: variant,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "ProductVariantsAPI.POST");
  }
}

