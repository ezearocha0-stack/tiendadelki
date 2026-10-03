import { NextRequest, NextResponse } from "next/server";
import { handleApiError, ValidationError } from "@/lib/errors";
import { InventoryService } from "@/core/inventory/inventory-service";
import { requireAdminUser } from "@/core/auth/session";

export async function GET(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const { searchParams } = new URL(req.url);

    const query = {
      productId: searchParams.get("productId") || undefined,
      variantId: searchParams.get("variantId") || undefined,
      movementType: (searchParams.get("movementType") as any) || undefined,
      startDate: searchParams.get("startDate") || undefined,
      endDate: searchParams.get("endDate") || undefined,
      page: searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1,
      limit: searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 50,
    };

    const result = await InventoryService.getMovementsHistory(query);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return handleApiError(error, "InventoryAPI.GET");
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json();
    const userId = admin.userId;
    const movementType = body.movementType;

    let result;

    switch (movementType) {
      case "ENTRADA":
        result = await InventoryService.createStockEntry(body, userId);
        break;
      case "AJUSTE":
        result = await InventoryService.adjustStock(body, userId);
        break;
      case "DEVOLUCION":
        result = await InventoryService.recordReturn(body, userId);
        break;
      case "RESERVA":
        result = await InventoryService.reserveStock(body, userId);
        break;
      case "CANCELACION_RESERVA":
        result = await InventoryService.cancelReservation(body, userId);
        break;
      case "VENTA_FISICA":
        result = await InventoryService.quickPhysicalSale(body, userId);
        break;
      default:
        throw new ValidationError(`Tipo de movimiento no soportado vía este endpoint: ${movementType}`);
    }

    return NextResponse.json({
      success: true,
      message: `Movimiento de inventario '${movementType}' ejecutado exitosamente`,
      data: result,
    });
  } catch (error) {
    return handleApiError(error, "InventoryAPI.POST");
  }
}

