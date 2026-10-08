"use client";

import { useState, useEffect } from "react";
import {
  CartWhatsAppItem,
  ProductInquiryData,
  buildCartWhatsAppMessage,
  buildProductInquiryMessage,
  formatWhatsAppPhone,
  generateWhatsAppUrl,
} from "@/core/whatsapp/whatsapp-helper";

// Fallback por defecto configurado
const FALLBACK_PHONE = "8296734710";

export function useWhatsApp(initialPhone?: string) {
  const [phone, setPhone] = useState<string>(initialPhone || FALLBACK_PHONE);
  const [loading, setLoading] = useState<boolean>(!initialPhone);

  useEffect(() => {
    let isMounted = true;

    async function fetchStoreSettings() {
      try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        const storePhone = json.storeSettings?.whatsapp || json.data?.WHATSAPP_STORE_NUMBER;
        if (json.success && storePhone) {
          if (isMounted) {
            setPhone(storePhone);
          }
        }
      } catch (err) {
        console.error("Error al obtener número de WhatsApp de la tienda:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchStoreSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedPhone = formatWhatsAppPhone(phone);

  function openCartWhatsApp(items: CartWhatsAppItem[], subtotal: number) {
    const message = buildCartWhatsAppMessage(items, subtotal);
    const url = generateWhatsAppUrl(phone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openProductWhatsApp(product: ProductInquiryData) {
    const message = buildProductInquiryMessage(product);
    const url = generateWhatsAppUrl(phone, message);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openDirectWhatsApp(customText?: string) {
    const defaultMsg = "¡Hola TiendaDelki! Deseo consultar sobre sus productos y catálogo disponible.";
    const url = generateWhatsAppUrl(phone, customText || defaultMsg);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return {
    phone,
    formattedPhone,
    loading,
    openCartWhatsApp,
    openProductWhatsApp,
    openDirectWhatsApp,
    getCartWhatsAppUrl: (items: CartWhatsAppItem[], subtotal: number) =>
      generateWhatsAppUrl(phone, buildCartWhatsAppMessage(items, subtotal)),
    getProductWhatsAppUrl: (product: ProductInquiryData) =>
      generateWhatsAppUrl(phone, buildProductInquiryMessage(product)),
  };
}
