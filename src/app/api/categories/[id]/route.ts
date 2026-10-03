import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/core/catalog/category-service";
import { updateCategorySchema } from "@/core/catalog/validation";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const category = await CategoryService.getCategoryById(id);

    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    return handleApiError(error, "CategoryDetailAPI.GET");
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
    const validated = updateCategorySchema.parse(body);

    const updated = await CategoryService.updateCategory(id, validated);

    return NextResponse.json({
      success: true,
      message: "Categoría actualizada exitosamente",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, "CategoryDetailAPI.PUT");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser(req);
    const { id } = await params;
    await CategoryService.deleteCategory(id);

    return NextResponse.json({
      success: true,
      message: "Categoría eliminada exitosamente",
    });
  } catch (error) {
    return handleApiError(error, "CategoryDetailAPI.DELETE");
  }
}

