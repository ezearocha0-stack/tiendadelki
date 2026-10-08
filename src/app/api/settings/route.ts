import { NextRequest, NextResponse } from "next/server";
import {
  getAllSystemSettings,
  getStoreSettings,
  updateStoreSettings,
  updateSystemSetting,
  StoreCommercialSettings,
} from "@/core/settings/settings-service";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireAdminUser, getAuthenticatedUser } from "@/core/auth/session";
import { ADMIN_ROLES } from "@/core/auth/jwt";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse>;
export async function GET(req: NextRequest | Request): Promise<NextResponse>;
export async function GET(req?: NextRequest | Request): Promise<NextResponse> {
  try {
    const user = req ? await getAuthenticatedUser(req) : null;
    const isAdmin = Boolean(user && ADMIN_ROLES.includes(user.role));

    const storeSettings = await getStoreSettings();

    // Si el usuario es administrador autenticado, se devuelve también el mapa completo de configuración técnica/sistema
    if (isAdmin) {
      const settingsMap = await getAllSystemSettings();
      return NextResponse.json(
        {
          success: true,
          data: settingsMap,
          storeSettings,
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // Acceso público / clientes: se devuelve ÚNICAMENTE la configuración comercial segura requerida por el frontend
    return NextResponse.json(
      {
        success: true,
        storeSettings,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "SettingsAPI.GET");
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const body = await req.json();

    if (!body || typeof body !== "object") {
      throw new ValidationError("Cuerpo de solicitud inválido.");
    }

    // 1. Extraer payload comercial (puede venir envuelto en { storeSettings: ... } o directo)
    const commercialPayload = (body.storeSettings && typeof body.storeSettings === "object")
      ? body.storeSettings
      : body;

    const commercialProps = [
      "storeName", "shortDescription", "description", "logoUrl",
      "phone", "secondaryPhone", "whatsapp", "email",
      "address", "sector", "city", "province", "country", "postalCode",
      "scheduleDays", "scheduleOpen", "scheduleClose", "scheduleText",
      "currency", "currencySymbol", "contactMessage", "deliveryMessage",
      "instagram", "facebook", "tiktok"
    ];

    const hasCommercialProps = Object.keys(commercialPayload).some((k) => commercialProps.includes(k));
    if (hasCommercialProps) {
      await updateStoreSettings(commercialPayload as Partial<StoreCommercialSettings>);
    }

    // 2. Si vienen claves directas en mayúsculas (STORE_PHONE, WHATSAPP_STORE_NUMBER, etc.)
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && (key.startsWith("STORE_") || key.includes("_"))) {
        await updateSystemSetting(key, value.trim());
      }
    }

    const [updatedMap, updatedStore] = await Promise.all([
      getAllSystemSettings(),
      getStoreSettings(),
    ]);

    return NextResponse.json({
      success: true,
      message: "Configuración de la tienda guardada exitosamente.",
      data: updatedMap,
      storeSettings: updatedStore,
    });
  } catch (error) {
    return handleApiError(error, "SettingsAPI.PATCH");
  }
}
