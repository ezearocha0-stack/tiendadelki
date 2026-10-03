import { NextRequest, NextResponse } from "next/server";
import { getAllSystemSettings, updateSystemSetting } from "@/core/settings/settings-service";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settingsMap = await getAllSystemSettings();

    return NextResponse.json(
      {
        success: true,
        data: settingsMap,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return handleApiError(error, "SettingsAPI.GET");
  }
}

const updateSettingsSchema = z.record(z.string());

export async function PATCH(req: NextRequest) {
  try {
    await requireAdminUser(req);
    const body = await req.json();
    const validated = updateSettingsSchema.parse(body);

    for (const [key, value] of Object.entries(validated)) {
      if (typeof value === "string") {
        await updateSystemSetting(key, value.trim());
      }
    }

    const updated = await getAllSystemSettings();

    return NextResponse.json({
      success: true,
      message: "Configuraciones actualizadas exitosamente.",
      data: updated,
    });
  } catch (error) {
    return handleApiError(error, "SettingsAPI.PATCH");
  }
}

