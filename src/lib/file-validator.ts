/**
 * Utilidades de validación criptográfica y firmas de cabecera (Magic Bytes)
 * Previene la subida de ejecutables, scripts o archivos maliciosos camuflados.
 */

export interface FileValidationResult {
  isValid: boolean;
  detectedMime: string | null;
  detectedExt: string | null;
  error?: string;
}

const MAGIC_BYTES: Array<{
  mime: string;
  ext: string;
  matches: (buf: Buffer) => boolean;
}> = [
  // JPEG / JPG: FF D8 FF
  {
    mime: "image/jpeg",
    ext: "jpg",
    matches: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  {
    mime: "image/png",
    ext: "png",
    matches: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  // WebP: RIFF .... WEBP
  {
    mime: "image/webp",
    ext: "webp",
    matches: (buf) =>
      buf.length >= 12 &&
      buf[0] === 0x52 && // R
      buf[1] === 0x49 && // I
      buf[2] === 0x46 && // F
      buf[3] === 0x46 && // F
      buf[8] === 0x57 && // W
      buf[9] === 0x45 && // E
      buf[10] === 0x42 && // B
      buf[11] === 0x50, // P
  },
  // PDF: %PDF- (25 50 44 46 2D)
  {
    mime: "application/pdf",
    ext: "pdf",
    matches: (buf) =>
      buf.length >= 5 &&
      buf[0] === 0x25 && // %
      buf[1] === 0x50 && // P
      buf[2] === 0x44 && // D
      buf[3] === 0x46 && // F
      buf[4] === 0x2d, // -
  },
];

/**
 * Detecta el tipo MIME real inspeccionando los primeros bytes del buffer en lugar de confiar en el cliente.
 */
export function detectFileMime(buffer: Buffer): { mime: string; ext: string } | null {
  if (!buffer || buffer.length < 4) return null;

  for (const entry of MAGIC_BYTES) {
    if (entry.matches(buffer)) {
      return { mime: entry.mime, ext: entry.ext };
    }
  }

  return null;
}

/**
 * Valida un archivo contra una lista blanca de tipos MIME permitidos comprobando tanto el buffer real
 * como las restricciones de tamaño y nombre seguro.
 */
export function validateFileBuffer(
  buffer: Buffer,
  allowedMimes: string[],
  maxSizeBytes = 10 * 1024 * 1024
): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    return { isValid: false, detectedMime: null, detectedExt: null, error: "El archivo está vacío." };
  }

  if (buffer.length > maxSizeBytes) {
    return {
      isValid: false,
      detectedMime: null,
      detectedExt: null,
      error: `El archivo supera el tamaño máximo permitido de ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB.`,
    };
  }

  const detected = detectFileMime(buffer);
  if (!detected) {
    return {
      isValid: false,
      detectedMime: null,
      detectedExt: null,
      error: "Tipo de archivo no reconocido o cabecera binaria inválida.",
    };
  }

  if (!allowedMimes.includes(detected.mime)) {
    return {
      isValid: false,
      detectedMime: detected.mime,
      detectedExt: detected.ext,
      error: `Formato de archivo no permitido (${detected.mime}). Formatos aceptados: ${allowedMimes.join(", ")}`,
    };
  }

  return {
    isValid: true,
    detectedMime: detected.mime,
    detectedExt: detected.ext,
  };
}

/**
 * Limpia y normaliza un nombre de archivo para evitar Directory Traversal (../) y caracteres peligrosos.
 */
export function sanitizeFilename(filename: string): string {
  // Eliminar rutas completas o relativas
  const basename = filename.split(/[\\/]/).pop() || "upload";
  // Conservar solo caracteres seguros alfanuméricos, guiones y puntos
  const clean = basename.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Evitar nombres ocultos o dobles extensiones sospechosas
  return clean.replace(/^\.+/, "").substring(0, 100);
}
