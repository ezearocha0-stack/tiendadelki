/**
 * Utilidades para la integración con WhatsApp en TiendaDelki
 * Garantiza formato compatible móvil/desktop y mensajes estructurados y limpios.
 */

export interface CartWhatsAppItem {
  productTitle: string;
  variantTitle?: string | null;
  sku?: string | null;
  quantity: number;
  price: number;
}

export interface ProductInquiryData {
  name: string;
  variantTitle?: string | null;
  sku?: string | null;
  price: number;
  productUrl?: string;
}

/**
 * Normaliza un número telefónico dominicano o internacional para la URL de WhatsApp (wa.me)
 * Elimina caracteres no numéricos y antepone el código de país '1' si se suministran 10 dígitos locales.
 */
export function formatWhatsAppPhone(rawPhone: string): string {
  if (!rawPhone) return "18296734710"; // Fallback seguro
  const digits = rawPhone.replace(/\D/g, "");

  // Si tiene 10 dígitos (ej: 8296734710), es número local dominicano/norteamericano sin código de país
  if (digits.length === 10) {
    return `1${digits}`;
  }

  // Si tiene 11 dígitos y empieza con 1 (ej: 18296734710), ya tiene el código
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits;
  }

  // Si es un número internacional mayor a 7 dígitos
  if (digits.length >= 8) {
    return digits;
  }

  return "18296734710";
}

/**
 * Formatea montos en pesos dominicanos sin decimales si son enteros, con estilo RD$1,500
 */
export function formatWhatsAppPrice(amount: number): string {
  const isInteger = Number.isInteger(amount);
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: isInteger ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `RD$${formatted}`;
}

/**
 * Construye el mensaje organizado para "Comprar por WhatsApp" desde el carrito
 * Formato conceptual:
 * 
 * Hola, quiero realizar este pedido:
 * 
 * 1. Camisa negra
 *    Talla: M
 *    Cantidad: 1
 *    Precio: RD$1,500
 * 
 * 2. Jean azul
 *    Talla: 32
 *    Cantidad: 1
 *    Precio: RD$2,000
 * 
 * Subtotal: RD$3,500
 * 
 * Quiero coordinar el envío.
 */
export function buildCartWhatsAppMessage(
  items: CartWhatsAppItem[],
  subtotal: number
): string {
  if (!items || items.length === 0) {
    return "Hola, tengo una consulta sobre sus productos en TiendaDelki.";
  }

  const lines: string[] = ["Hola, quiero realizar este pedido:", ""];

  items.forEach((item, index) => {
    const itemNum = index + 1;
    lines.push(`${itemNum}. ${item.productTitle}`);

    // Procesar variante/atributos
    if (item.variantTitle && item.variantTitle.trim()) {
      const vTitle = item.variantTitle.trim();
      // Si contiene pares clave-valor como "Talla: M / Color: Azul" o "Talla: M"
      if (vTitle.includes(":")) {
        const parts = vTitle.split(/\s*[/,]\s*/);
        parts.forEach((p) => {
          if (p.trim()) lines.push(`   ${p.trim()}`);
        });
      } else if (vTitle.includes("/")) {
        // Formato como "Azul / M"
        lines.push(`   Variante: ${vTitle}`);
      } else {
        lines.push(`   ${vTitle}`);
      }
    }

    lines.push(`   Cantidad: ${item.quantity}`);
    const totalPrice = item.price * item.quantity;
    lines.push(`   Precio: ${formatWhatsAppPrice(totalPrice)}`);
    lines.push(""); // Separador entre ítems
  });

  lines.push(`Subtotal: ${formatWhatsAppPrice(subtotal)}`);
  lines.push("");
  lines.push("Quiero coordinar el envío.");

  return lines.join("\n");
}

/**
 * Construye el mensaje para "Consultar por WhatsApp" desde la ficha de producto
 */
export function buildProductInquiryMessage(product: ProductInquiryData): string {
  const lines: string[] = [
    "Hola, quiero consultar sobre este producto:",
    "",
    `📌 *${product.name}*`,
  ];

  if (product.variantTitle && product.variantTitle.trim()) {
    lines.push(`   Variante: ${product.variantTitle.trim()}`);
  }

  if (product.sku && product.sku.trim()) {
    lines.push(`   SKU: ${product.sku.trim()}`);
  }

  lines.push(`   Precio: ${formatWhatsAppPrice(product.price)}`);

  if (product.productUrl) {
    lines.push(`   Enlace: ${product.productUrl}`);
  }

  lines.push("");
  lines.push("¿Tienen disponibilidad para coordinar la compra?");

  return lines.join("\n");
}

/**
 * Genera la URL completa de WhatsApp universal (wa.me)
 * Funciona de inmediato tanto en móviles (app nativa) como en computadoras (WhatsApp Web).
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const cleanPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
