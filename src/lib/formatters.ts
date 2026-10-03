export function formatCurrency(amount: number | string | { toString: () => string }): string {
  const num = typeof amount === "number" ? amount : parseFloat(amount.toString());
  if (isNaN(num)) return "RD$ 0.00";

  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: "DOP",
    minimumFractionDigits: 2,
  })
    .format(num)
    .replace("DOP", "RD$");
}

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TK-${year}${month}-${random}`;
}

export function generateSku(prefix: string, variantSuffix?: string): string {
  const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  if (variantSuffix) {
    const cleanSuffix = variantSuffix.trim().toUpperCase().replace(/[^A-Z0-9]/g, "-");
    return `${cleanPrefix}-${randomPart}-${cleanSuffix}`;
  }
  return `${cleanPrefix}-${randomPart}`;
}
