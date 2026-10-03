import { prisma } from "@/lib/db";
import { StoreHeader } from "@/components/store/store-header";
import { StoreFooter } from "@/components/store/store-footer";
import { WhatsAppFloatingButton } from "@/components/store/whatsapp-floating-button";
import { CheckoutForm, ShippingMethodItem, BankAccountItem } from "@/components/store/checkout-form";
import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Finalizar Compra (Checkout) - TiendaDelki",
  description: "Completa tu pedido de forma segura en TiendaDelki. Envíos a todo Santo Domingo y el interior del país.",
};

export default async function CheckoutPage() {
  const [shippingMethodsDb, bankAccountsDb] = await Promise.all([
    prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const shippingMethods: ShippingMethodItem[] = shippingMethodsDb.map((m) => ({
    id: m.id,
    name: m.name,
    zoneDescription: m.zoneDescription,
    price: Number(m.price),
    freeShippingThreshold: m.freeShippingThreshold ? Number(m.freeShippingThreshold) : null,
    estimatedDays: m.estimatedDays,
  }));

  const bankAccounts: BankAccountItem[] = bankAccountsDb.map((a) => ({
    id: a.id,
    bankName: a.bankName,
    accountNumber: a.accountNumber,
    accountType: a.accountType,
    holderName: a.holderName,
    holderId: a.holderId,
    instructions: a.instructions,
  }));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-bg)" }}>
      <StoreHeader />

      <main style={{ flex: 1, padding: "2rem 1rem", maxWidth: "1200px", width: "100%", margin: "0 auto" }}>
        {/* Breadcrumb */}
        <nav style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Inicio</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <Link href="/carrito" style={{ color: "var(--color-text-muted)", textDecoration: "none" }}>Carrito</Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "var(--color-text-main)", fontWeight: 500 }}>Checkout Seguro</span>
        </nav>

        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "1.5rem" }}>
          Finalizar Compra
        </h1>

        <CheckoutForm
          shippingMethods={shippingMethods}
          bankAccounts={bankAccounts}
        />
      </main>

      <StoreFooter />
      <WhatsAppFloatingButton />
    </div>
  );
}
