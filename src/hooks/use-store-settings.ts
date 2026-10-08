"use client";

import { useState, useEffect } from "react";

export interface StoreSettings {
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

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeName: "TiendaDelki",
  shortDescription: "Tienda Física & Online – República Dominicana",
  description: "Tu tienda de confianza con inventario verificado y envíos a todas las provincias de República Dominicana.",
  logoUrl: "",
  phone: "(809) 555-0100",
  secondaryPhone: "",
  whatsapp: "8296734710",
  email: "contacto@tiendadelki.com",
  address: "Calle Principal",
  sector: "Barrio El Albinal",
  city: "San Fernando de Monte Cristi",
  province: "Monte Cristi",
  country: "República Dominicana",
  postalCode: "62000",
  scheduleDays: "Lunes a Sábado",
  scheduleOpen: "9:00 AM",
  scheduleClose: "7:00 PM",
  scheduleText: "Domingos y feriados: cerrado",
  currency: "DOP",
  currencySymbol: "RD$",
  contactMessage: "¡Hola TiendaDelki! Deseo consultar sobre sus productos y catálogo disponible.",
  deliveryMessage: "Envíos a todo el país y entregas locales en Monte Cristi.",
  instagram: "https://instagram.com/tiendadelki",
  facebook: "https://facebook.com/tiendadelki",
  tiktok: "https://tiktok.com/@tiendadelki",
};

let cachedSettings: StoreSettings | null = null;
let fetchPromise: Promise<StoreSettings> | null = null;

export function invalidateStoreSettingsCache(newSettings?: StoreSettings) {
  cachedSettings = newSettings || null;
}

async function fetchSettingsOnce(): Promise<StoreSettings> {
  if (cachedSettings) return cachedSettings;
  if (!fetchPromise) {
    fetchPromise = fetch("/api/settings")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.storeSettings) {
          cachedSettings = json.storeSettings;
          return json.storeSettings;
        }
        return DEFAULT_STORE_SETTINGS;
      })
      .catch((err) => {
        console.error("Error al cargar configuraciones de tienda:", err);
        return DEFAULT_STORE_SETTINGS;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }
  return fetchPromise;
}

export function useStoreSettings() {
  const [settings, setSettings] = useState<StoreSettings>(cachedSettings || DEFAULT_STORE_SETTINGS);
  const [loading, setLoading] = useState<boolean>(!cachedSettings);

  useEffect(() => {
    let isMounted = true;
    fetchSettingsOnce().then((data) => {
      if (isMounted) {
        setSettings(data);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    settings,
    loading,
    fullAddress: `${settings.address ? settings.address + ', ' : ''}${settings.sector ? settings.sector + ', ' : ''}${settings.city}, ${settings.province}, ${settings.country}`,
    scheduleSummary: `${settings.scheduleDays}: ${settings.scheduleOpen} - ${settings.scheduleClose}`,
  };
}
