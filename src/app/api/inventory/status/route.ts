import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { InventoryService } from "@/core/inventory/inventory-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const query = {
      search: searchParams.get("search") || undefined,
      categoryId: searchParams.get("categoryId") || undefined,
      status: (searchParams.get("status") as any) || "ALL",
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50,
    };

    const result = await InventoryService.getInventoryStatus(query);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleApiError(error, "InventoryAPI.Status");
  }
}
