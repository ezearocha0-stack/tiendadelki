import { NextRequest, NextResponse } from "next/server";
import { ProductService } from "@/core/catalog/product-service";
import { createProductSchema } from "@/core/catalog/validation";
import { handleApiError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const categoryId = searchParams.get("categoryId") || undefined;
    const categorySlug = searchParams.get("categorySlug") || searchParams.get("category") || undefined;
    const status = searchParams.get("status") || undefined;
    const isFeatured = searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined;
    const isNew = searchParams.has("isNew") ? searchParams.get("isNew") === "true" : undefined;
    const deals = searchParams.has("deals") ? searchParams.get("deals") === "true" : undefined;
    const minPrice = searchParams.has("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const maxPrice = searchParams.has("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const inStock = searchParams.has("inStock") ? searchParams.get("inStock") === "true" : undefined;
    const sort = searchParams.get("sort") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const result = await ProductService.listProducts({
      search,
      categoryId,
      categorySlug,
      status,
      isFeatured,
      isNew,
      deals,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page,
      limit,
    });

    const headers: Record<string, string> = {};
    if (!status || status === "PUBLISHED") {
      headers["Cache-Control"] = "public, s-maxage=30, stale-while-revalidate=120";
    }

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        pagination: result.pagination,
        count: result.data.length,
      },
      { headers }
    );
  } catch (error) {
    return handleApiError(error, "ProductsAPI.GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json();
    const validated = createProductSchema.parse(body);

    const product = await ProductService.createProduct(validated, admin.userId);

    return NextResponse.json(
      {
        success: true,
        message: "Producto creado exitosamente",
        data: product,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "ProductsAPI.POST");
  }
}

