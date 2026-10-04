import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { env } from "@/config/env";

export const dynamic = "force-dynamic";

interface RouteProps {
  params: Promise<{ path: string[] }>;
}

/**
 * GET /uploads/[...path]
 * Sirve dinámicamente archivos públicos desde env.UPLOAD_DIR.
 * Esto garantiza que los archivos almacenados en un Persistent Disk de Render
 * (por ejemplo en /data/tiendadelki/uploads) se sirvan correctamente sin depender
 * de que Next.js los tenga dentro de la carpeta ./public empaquetada en el build.
 */
export async function GET(req: NextRequest, { params }: RouteProps) {
  try {
    const { path: segments } = await params;
    if (!segments || segments.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Prevención matemática estricta de Path Traversal
    const uploadBaseDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    const resolvedPath = path.resolve(uploadBaseDir, segments.join(path.sep));
    const relative = path.relative(uploadBaseDir, resolvedPath);

    // Asegurar que la ruta resuelta permanezca estrictamente dentro del directorio de uploads
    if (relative.startsWith("..") || path.isAbsolute(relative) || relative === "") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const targetFilePath = resolvedPath;

    const fileBuffer = await fs.readFile(targetFilePath);
    const ext = path.extname(targetFilePath).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".webp": "image/webp",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
    };

    const contentType = mimeTypes[ext] || "application/octet-stream";

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error: any) {
    return new NextResponse("Not Found", { status: 404 });
  }
}
