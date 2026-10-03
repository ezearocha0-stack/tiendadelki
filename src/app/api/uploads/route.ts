import { NextRequest, NextResponse } from "next/server";
import { ImageProcessor } from "@/core/images/image-processor";
import { handleApiError, ValidationError } from "@/lib/errors";
import { requireAdminUser } from "@/core/auth/session";
import { validateFileBuffer, sanitizeFilename } from "@/lib/file-validator";

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    await requireAdminUser(req);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = sanitizeFilename((formData.get("folder") as string) || "products");

    if (!file) {
      throw new ValidationError("No se suministró ningún archivo");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new ValidationError("El tamaño de la imagen no puede exceder 10MB");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const validation = validateFileBuffer(
      buffer,
      ["image/jpeg", "image/png", "image/webp"],
      10 * 1024 * 1024
    );

    if (!validation.isValid) {
      throw new ValidationError(
        validation.error || "El archivo debe ser una imagen válida (JPEG, PNG, WebP)"
      );
    }

    const safeName = sanitizeFilename(file.name);
    const result = await ImageProcessor.processAndStore(buffer, safeName, folder);

    return NextResponse.json({
      success: true,
      message: "Imagen procesada y optimizada exitosamente en formato WebP",
      data: result,
    });
  } catch (error) {
    return handleApiError(error, "UploadsAPI.POST");
  }
}

