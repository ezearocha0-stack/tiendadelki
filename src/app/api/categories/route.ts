import { NextRequest, NextResponse } from "next/server";
import { CategoryService } from "@/core/catalog/category-service";
import { createCategorySchema } from "@/core/catalog/validation";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get("all") === "true";

    const categories = await CategoryService.listCategories(includeInactive);

    const headers: Record<string, string> = {};
    if (!includeInactive) {
      headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=300";
    }

    return NextResponse.json(
      {
        success: true,
        data: categories,
        count: categories.length,
      },
      { headers }
    );
  } catch (error) {
    return handleApiError(error, "CategoriesAPI.GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const body = await req.json();
    const validated = createCategorySchema.parse(body);

    const category = await CategoryService.createCategory(validated);

    return NextResponse.json(
      {
        success: true,
        message: "Categoría creada exitosamente",
        data: category,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "CategoriesAPI.POST");
  }
}

