import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { env } from "@/config/env";
import { logger } from "@/lib/logger";

export interface UploadResult {
  url: string;
  storageKey: string;
}

export interface IStorageService {
  uploadFile(buffer: Buffer, filename: string, folder?: string): Promise<UploadResult>;
  deleteFile(storageKey: string): Promise<void>;
  uploadPrivateFile(
    buffer: Buffer,
    filename: string,
    folder?: string
  ): Promise<{ relativePath: string; absolutePath?: string }>;
  readPrivateFile(relativePath: string): Promise<Buffer>;
  deletePrivateFile(relativePath: string): Promise<void>;
}

/**
 * Proveedor de Almacenamiento Local
 * Diseñado para entornos locales y servidores dedicados o contenedores con volumen persistente montado.
 */
class LocalStorageService implements IStorageService {
  private baseDir: string;
  private privateBaseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    this.privateBaseDir = path.resolve(process.cwd(), env.PRIVATE_STORAGE_DIR);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (e) {
      // Ignorar si ya existe
    }
  }

  async uploadFile(buffer: Buffer, filename: string, folder = "products"): Promise<UploadResult> {
    const targetDir = path.join(this.baseDir, folder);
    await this.ensureDirectory(targetDir);

    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(targetDir, safeFilename);

    await fs.writeFile(filePath, buffer);

    const storageKey = path.posix.join(folder, safeFilename);
    const url = `/uploads/${storageKey}`;

    return { url, storageKey };
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      const filePath = path.join(this.baseDir, storageKey);
      await fs.unlink(filePath);
    } catch (error) {
      // Si el archivo no existe, ignorar silenciosamente
    }
  }

  async uploadPrivateFile(
    buffer: Buffer,
    filename: string,
    folder = "receipts"
  ): Promise<{ relativePath: string; absolutePath: string }> {
    const targetDir = path.join(this.privateBaseDir, folder);
    await this.ensureDirectory(targetDir);

    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(targetDir, safeFilename);

    await fs.writeFile(filePath, buffer);

    const relativePath = path.posix.join(folder, safeFilename);
    return { relativePath, absolutePath: filePath };
  }

  async readPrivateFile(relativePath: string): Promise<Buffer> {
    const resolvedPath = path.resolve(this.privateBaseDir, relativePath);
    const rel = path.relative(this.privateBaseDir, resolvedPath);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error("Acceso denegado: intento de path traversal detectado en almacenamiento privado.");
    }
    return await fs.readFile(resolvedPath);
  }

  async deletePrivateFile(relativePath: string): Promise<void> {
    try {
      const resolvedPath = path.resolve(this.privateBaseDir, relativePath);
      const rel = path.relative(this.privateBaseDir, resolvedPath);
      if (rel.startsWith("..") || path.isAbsolute(rel)) {
        throw new Error("Acceso denegado: intento de path traversal detectado en almacenamiento privado.");
      }
      await fs.unlink(resolvedPath);
    } catch (error) {
      // Si el archivo no existe o error, no propagar
    }
  }
}

/**
 * Proveedor de Almacenamiento en la Nube compatible con S3 / Cloudflare R2
 * Diseñado para despliegues en plataformas de hosting sin filesystem persistente (Railway, Render, Fly.io, Vercel).
 */
class S3StorageService implements IStorageService {
  private bucket: string;
  private endpoint: string;
  private publicUrl: string;
  private accessKey: string;
  private secretKey: string;
  private region: string;

  constructor() {
    this.bucket = env.S3_BUCKET || "tiendadelki-assets";
    this.endpoint = env.S3_ENDPOINT || `https://${this.bucket}.s3.amazonaws.com`;
    this.publicUrl = env.S3_PUBLIC_URL || `${this.endpoint}/${this.bucket}`;
    this.accessKey = env.S3_ACCESS_KEY_ID || "";
    this.secretKey = env.S3_SECRET_ACCESS_KEY || "";
    this.region = env.S3_REGION || "auto";
  }

  private getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string) {
    const kDate = crypto.createHmac("sha256", "AWS4" + key).update(dateStamp).digest();
    const kRegion = crypto.createHmac("sha256", kDate).update(regionName).digest();
    const kService = crypto.createHmac("sha256", kRegion).update(serviceName).digest();
    const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
    return kSigning;
  }

  private async s3Request(
    method: "PUT" | "GET" | "DELETE",
    key: string,
    body?: Buffer,
    contentType = "application/octet-stream"
  ): Promise<Response> {
    const host = new URL(this.endpoint).host;
    const url = `${this.endpoint.replace(/\/$/, "")}/${this.bucket}/${key}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = crypto.createHash("sha256").update(body || "").digest("hex");

    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = [
      method,
      `/${this.bucket}/${key}`,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");

    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      algorithm,
      amzDate,
      credentialScope,
      crypto.createHash("sha256").update(canonicalRequest).digest("hex"),
    ].join("\n");

    const signingKey = this.getSignatureKey(this.secretKey, dateStamp, this.region, "s3");
    const signature = crypto.createHmac("sha256", signingKey).update(stringToSign).digest("hex");

    const authorizationHeader = `${algorithm} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const headers: Record<string, string> = {
      Host: host,
      "x-amz-date": amzDate,
      "x-amz-content-sha256": payloadHash,
      Authorization: authorizationHeader,
    };

    if (body) {
      headers["Content-Type"] = contentType;
      headers["Content-Length"] = body.length.toString();
    }

    return fetch(url, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
    });
  }


  async uploadFile(buffer: Buffer, filename: string, folder = "products"): Promise<UploadResult> {
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storageKey = `public/${folder}/${safeFilename}`;

    const res = await this.s3Request("PUT", storageKey, buffer, "image/webp");
    if (!res.ok) {
      const errText = await res.text();
      logger.error(`Error subiendo archivo a S3/R2 (${res.status}): ${errText}`, undefined, "StorageService.S3");
      throw new Error(`Fallo en almacenamiento en la nube: HTTP ${res.status}`);
    }

    const url = `${this.publicUrl.replace(/\/$/, "")}/${storageKey}`;
    return { url, storageKey };
  }

  async deleteFile(storageKey: string): Promise<void> {
    try {
      await this.s3Request("DELETE", storageKey);
    } catch (e) {
      logger.warn(`Error eliminando archivo en S3: ${storageKey}`, "StorageService.S3");
    }
  }

  async uploadPrivateFile(
    buffer: Buffer,
    filename: string,
    folder = "receipts"
  ): Promise<{ relativePath: string }> {
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storageKey = `private/${folder}/${safeFilename}`;

    const res = await this.s3Request("PUT", storageKey, buffer, "application/octet-stream");
    if (!res.ok) {
      const errText = await res.text();
      logger.error(`Error subiendo comprobante privado a S3/R2 (${res.status}): ${errText}`, undefined, "StorageService.S3");
      throw new Error(`Fallo al almacenar comprobante en la nube: HTTP ${res.status}`);
    }

    return { relativePath: storageKey };
  }

  async readPrivateFile(relativePath: string): Promise<Buffer> {
    const res = await this.s3Request("GET", relativePath);
    if (!res.ok) {
      throw new Error(`No se pudo descargar el archivo privado desde S3: HTTP ${res.status}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async deletePrivateFile(relativePath: string): Promise<void> {
    try {
      await this.s3Request("DELETE", relativePath);
    } catch (e) {
      // Ignore
    }
  }
}

function initStorageService(): IStorageService {
  if (env.STORAGE_PROVIDER === "s3" || env.STORAGE_PROVIDER === "r2") {
    logger.info(`Iniciando servicio de almacenamiento con proveedor: ${env.STORAGE_PROVIDER.toUpperCase()}`, "StorageService");
    return new S3StorageService();
  }
  return new LocalStorageService();
}

// Singleton de almacenamiento desacoplado
export const storageService: IStorageService = initStorageService();
