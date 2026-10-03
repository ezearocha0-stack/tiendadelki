import { prisma } from "@/lib/db";

const DEFAULT_SETTINGS: Record<string, string> = {
  STORE_NAME: "TiendaDelki",
  WHATSAPP_STORE_NUMBER: "8296734710",
  CURRENCY_SYMBOL: "RD$",
  ORDER_EXPIRATION_HOURS: "48",
};

/**
 * Obtiene el valor de una configuración del sistema por clave
 */
export async function getSystemSetting(key: string, defaultValue?: string): Promise<string> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
    return setting?.value || defaultValue || DEFAULT_SETTINGS[key] || "";
  } catch (error) {
    console.error(`Error al obtener setting ${key}:`, error);
    return defaultValue || DEFAULT_SETTINGS[key] || "";
  }
}

/**
 * Obtiene todas las configuraciones del sistema como un diccionario clave-valor
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany({
      select: { key: true, value: true },
    });

    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      result[s.key] = s.value;
    });

    return result;
  } catch (error) {
    console.error("Error al obtener todas las configuraciones:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Actualiza o inserta una configuración del sistema
 */
export async function updateSystemSetting(
  key: string,
  value: string,
  description?: string
): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    update: {
      value,
      ...(description ? { description } : {}),
    },
    create: {
      key,
      value,
      description: description || null,
    },
  });
}

/**
 * Obtiene el número de WhatsApp oficial configurado en el sistema administrativo
 */
export async function getWhatsAppStoreNumber(): Promise<string> {
  return getSystemSetting("WHATSAPP_STORE_NUMBER", "8296734710");
}
