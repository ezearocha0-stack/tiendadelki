import { prisma } from "@/lib/db";

export interface StoreCommercialSettings {
  storeName: string;
  shortDescription: string;
  description: string;
  logoUrl: string;
  phone: string;
  secondaryPhone: string;
  whatsapp: string;
  email: string;
  address: string;
  sector: string;
  city: string;
  province: string;
  country: string;
  postalCode: string;
  scheduleDays: string;
  scheduleOpen: string;
  scheduleClose: string;
  scheduleText: string;
  currency: string;
  currencySymbol: string;
  contactMessage: string;
  deliveryMessage: string;
  instagram: string;
  facebook: string;
  tiktok: string;
}

export const DEFAULT_SETTINGS: Record<string, string> = {
  STORE_NAME: "TiendaDelki",
  STORE_SHORT_DESC: "Tienda Física & Online – República Dominicana",
  STORE_DESCRIPTION: "Tu tienda de confianza con inventario verificado y envíos a todas las provincias de República Dominicana.",
  STORE_LOGO_URL: "",
  STORE_PHONE: "(809) 555-0100",
  STORE_PHONE_SECONDARY: "",
  STORE_WHATSAPP: "8296734710",
  WHATSAPP_STORE_NUMBER: "8296734710",
  STORE_EMAIL: "contacto@tiendadelki.com",
  STORE_ADDRESS: "Calle Principal",
  STORE_SECTOR: "Barrio El Albinal",
  STORE_CITY: "San Fernando de Monte Cristi",
  STORE_PROVINCE: "Monte Cristi",
  STORE_COUNTRY: "República Dominicana",
  STORE_POSTAL_CODE: "62000",
  STORE_SCHEDULE_DAYS: "Lunes a Sábado",
  STORE_SCHEDULE_OPEN: "9:00 AM",
  STORE_SCHEDULE_CLOSE: "7:00 PM",
  STORE_SCHEDULE_TEXT: "Domingos y feriados: cerrado",
  STORE_CURRENCY: "DOP",
  CURRENCY_SYMBOL: "RD$",
  STORE_CONTACT_MESSAGE: "¡Hola TiendaDelki! Deseo consultar sobre sus productos y catálogo disponible.",
  STORE_DELIVERY_MESSAGE: "Envíos a todo el país y entregas locales en Monte Cristi.",
  STORE_SOCIAL_INSTAGRAM: "https://instagram.com/tiendadelki",
  STORE_SOCIAL_FACEBOOK: "https://facebook.com/tiendadelki",
  STORE_SOCIAL_TIKTOK: "https://tiktok.com/@tiendadelki",
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
    return setting?.value !== undefined && setting?.value !== null
      ? setting.value
      : defaultValue !== undefined
      ? defaultValue
      : DEFAULT_SETTINGS[key] || "";
  } catch (error) {
    console.error(`Error al obtener setting ${key}:`, error);
    return defaultValue !== undefined ? defaultValue : DEFAULT_SETTINGS[key] || "";
  }
}

/**
 * Obtiene todas las configuraciones del sistema como un diccionario clave-valor.
 * Los valores guardados en la base de datos SIEMPRE tienen precedencia sobre los defaults.
 */
export async function getAllSystemSettings(): Promise<Record<string, string>> {
  try {
    const settings = await prisma.systemSetting.findMany({
      select: { key: true, value: true },
    });

    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    settings.forEach((s) => {
      // El valor guardado por el usuario en BD sobrescribe el fallback por defecto
      result[s.key] = s.value;
    });

    return result;
  } catch (error) {
    console.error("Error al obtener todas las configuraciones:", error);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Actualiza o inserta una configuración del sistema en PostgreSQL
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
 * Obtiene la configuración comercial completa estructurada de la tienda.
 * Si un campo fue guardado por el usuario (incluso si lo dejó en blanco intencionalmente),
 * se respeta el valor de la base de datos sin forzar el fallback por defecto.
 */
export async function getStoreSettings(): Promise<StoreCommercialSettings> {
  const map = await getAllSystemSettings();

  const getField = (key: string, fallback: string = ""): string => {
    if (map[key] !== undefined && map[key] !== null) {
      return map[key];
    }
    return fallback;
  };

  // Un valor guardado (incluso vacío) SIEMPRE se respeta; el default solo aplica si la clave no existe.
  const whatsapp =
    map.STORE_WHATSAPP !== undefined && map.STORE_WHATSAPP !== null
      ? map.STORE_WHATSAPP
      : map.WHATSAPP_STORE_NUMBER ?? DEFAULT_SETTINGS.STORE_WHATSAPP;

  return {
    storeName: getField("STORE_NAME", DEFAULT_SETTINGS.STORE_NAME),
    shortDescription: getField("STORE_SHORT_DESC", DEFAULT_SETTINGS.STORE_SHORT_DESC),
    description: getField("STORE_DESCRIPTION", DEFAULT_SETTINGS.STORE_DESCRIPTION),
    logoUrl: getField("STORE_LOGO_URL", ""),
    phone: getField("STORE_PHONE", DEFAULT_SETTINGS.STORE_PHONE),
    secondaryPhone: getField("STORE_PHONE_SECONDARY", ""),
    whatsapp,
    email: getField("STORE_EMAIL", DEFAULT_SETTINGS.STORE_EMAIL),
    address: getField("STORE_ADDRESS", DEFAULT_SETTINGS.STORE_ADDRESS),
    sector: getField("STORE_SECTOR", DEFAULT_SETTINGS.STORE_SECTOR),
    city: getField("STORE_CITY", DEFAULT_SETTINGS.STORE_CITY),
    province: getField("STORE_PROVINCE", DEFAULT_SETTINGS.STORE_PROVINCE),
    country: getField("STORE_COUNTRY", DEFAULT_SETTINGS.STORE_COUNTRY),
    postalCode: getField("STORE_POSTAL_CODE", DEFAULT_SETTINGS.STORE_POSTAL_CODE),
    scheduleDays: getField("STORE_SCHEDULE_DAYS", DEFAULT_SETTINGS.STORE_SCHEDULE_DAYS),
    scheduleOpen: getField("STORE_SCHEDULE_OPEN", DEFAULT_SETTINGS.STORE_SCHEDULE_OPEN),
    scheduleClose: getField("STORE_SCHEDULE_CLOSE", DEFAULT_SETTINGS.STORE_SCHEDULE_CLOSE),
    scheduleText: getField("STORE_SCHEDULE_TEXT", DEFAULT_SETTINGS.STORE_SCHEDULE_TEXT),
    currency: getField("STORE_CURRENCY", DEFAULT_SETTINGS.STORE_CURRENCY),
    currencySymbol: getField("CURRENCY_SYMBOL", DEFAULT_SETTINGS.CURRENCY_SYMBOL),
    contactMessage: getField("STORE_CONTACT_MESSAGE", DEFAULT_SETTINGS.STORE_CONTACT_MESSAGE),
    deliveryMessage: getField("STORE_DELIVERY_MESSAGE", DEFAULT_SETTINGS.STORE_DELIVERY_MESSAGE),
    instagram: getField("STORE_SOCIAL_INSTAGRAM", ""),
    facebook: getField("STORE_SOCIAL_FACEBOOK", ""),
    tiktok: getField("STORE_SOCIAL_TIKTOK", ""),
  };
}

/**
 * Actualiza la configuración comercial estructurada de la tienda
 */
export async function updateStoreSettings(
  partial: Partial<StoreCommercialSettings>
): Promise<StoreCommercialSettings> {
  const keyMap: Record<keyof StoreCommercialSettings, string> = {
    storeName: "STORE_NAME",
    shortDescription: "STORE_SHORT_DESC",
    description: "STORE_DESCRIPTION",
    logoUrl: "STORE_LOGO_URL",
    phone: "STORE_PHONE",
    secondaryPhone: "STORE_PHONE_SECONDARY",
    whatsapp: "STORE_WHATSAPP",
    email: "STORE_EMAIL",
    address: "STORE_ADDRESS",
    sector: "STORE_SECTOR",
    city: "STORE_CITY",
    province: "STORE_PROVINCE",
    country: "STORE_COUNTRY",
    postalCode: "STORE_POSTAL_CODE",
    scheduleDays: "STORE_SCHEDULE_DAYS",
    scheduleOpen: "STORE_SCHEDULE_OPEN",
    scheduleClose: "STORE_SCHEDULE_CLOSE",
    scheduleText: "STORE_SCHEDULE_TEXT",
    currency: "STORE_CURRENCY",
    currencySymbol: "CURRENCY_SYMBOL",
    contactMessage: "STORE_CONTACT_MESSAGE",
    deliveryMessage: "STORE_DELIVERY_MESSAGE",
    instagram: "STORE_SOCIAL_INSTAGRAM",
    facebook: "STORE_SOCIAL_FACEBOOK",
    tiktok: "STORE_SOCIAL_TIKTOK",
  };

  for (const [prop, val] of Object.entries(partial)) {
    const key = keyMap[prop as keyof StoreCommercialSettings];
    if (key && typeof val === "string") {
      await updateSystemSetting(key, val.trim());
      if (key === "STORE_WHATSAPP") {
        await updateSystemSetting("WHATSAPP_STORE_NUMBER", val.trim());
      }
      if (key === "STORE_NAME") {
        // Sincronizar el nombre en la tabla Store
        await prisma.store.updateMany({
          where: { isDefault: true },
          data: { name: val.trim() },
        });
      }
    }
  }

  return getStoreSettings();
}

/**
 * Obtiene el número de WhatsApp oficial configurado en el sistema administrativo
 */
export async function getWhatsAppStoreNumber(): Promise<string> {
  const settings = await getStoreSettings();
  return settings.whatsapp;
}
