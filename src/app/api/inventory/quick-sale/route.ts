import { NextRequest, NextResponse } from "next/server";
import { handleApiError } from "@/lib/errors";
import { InventoryService } from "@/core/inventory/inventory-service";
import { requireAdminUser } from "@/core/auth/session";

/**
 * Endpoint de Venta Física Rápida ("Vendido Físicamente")
 * 
 * Reglas de Negocio Fundamentales:
 * 1. Descuenta stock de forma atómica en una transacción con bloqueo pesimista.
 * 2. Previene inventario negativo.
 * 3. Crea una traza inmutable en inventory_movements con tipo VENTA_FISICA.
 * 4. Cero creación de pedidos (orders).
 * 5. Cero creación de clientes o facturas.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser(req);
    const body = await req.json();

    const result = await InventoryService.quickPhysicalSale(body, admin.userId);

    return NextResponse.json({
      success: true,
      message: "Venta física procesada e inventario actualizado exitosamente",
      data: result,
    });
  } catch (error) {
    return handleApiError(error, "InventoryAPI.QuickSale");
  }
}

