import sharp from "sharp";
import { storageService } from "../storage/storage-service";

export interface ProcessedImageResult {
  url: string;
  thumbnailUrl: string;
  storageKey: string;
  thumbStorageKey: string;
  width: number;
  height: number;
  format: string;
  sizeBytes: number;
}

export class ImageProcessor {
  /**
   * Procesa una imagen de cualquier formato común (JPG, PNG, HEIC, TIFF):
   * 1. Redimensiona y optimiza a WebP de alta fidelidad (máx. 1200x1200px).
   * 2. Genera un thumbnail cuadrado optimizado (400x400px).
   * 3. Almacena ambos archivos mediante el adaptador de almacenamiento desacoplado.
   */
  static async processAndStore(
    inputBuffer: Buffer,
    baseName: string,
    folder = "products"
  ): Promise<ProcessedImageResult> {
    const cleanName = baseName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");

    // 1. Imagen Principal WebP
    const mainSharp = sharp(inputBuffer)
      .rotate() // Respeta orientación EXIF
      .resize(1200, 1200, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85, effort: 4 });

    const [mainBuffer, metadata] = await Promise.all([
      mainSharp.toBuffer(),
      mainSharp.metadata(),
    ]);

    // 2. Thumbnail WebP
    const thumbBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(400, 400, {
        fit: "cover",
        position: "centre",
      })
      .webp({ quality: 80, effort: 4 })
      .toBuffer();

    // 3. Almacenar mediante StorageService
    const [mainFile, thumbFile] = await Promise.all([
      storageService.uploadFile(mainBuffer, `${cleanName}.webp`, folder),
      storageService.uploadFile(thumbBuffer, `${cleanName}_thumb.webp`, `${folder}/thumbs`),
    ]);

    return {
      url: mainFile.url,
      thumbnailUrl: thumbFile.url,
      storageKey: mainFile.storageKey,
      thumbStorageKey: thumbFile.storageKey,
      width: metadata.width || 1200,
      height: metadata.height || 1200,
      format: "webp",
      sizeBytes: mainBuffer.length,
    };
  }

  /**
   * Elimina de forma segura la imagen principal y su miniatura asociada.
   */
  static async deleteStoredImage(storageKey: string): Promise<void> {
    if (!storageKey) return;

    // Eliminar archivo principal
    await storageService.deleteFile(storageKey);

    // Intentar deducir y eliminar el thumbnail correspondiente
    const parts = storageKey.split("/");
    const filename = parts.pop();
    if (filename) {
      const folder = parts.join("/");
      const thumbKey = `${folder}/thumbs/${filename.replace(".webp", "_thumb.webp")}`;
      await storageService.deleteFile(thumbKey);
    }
  }
}
