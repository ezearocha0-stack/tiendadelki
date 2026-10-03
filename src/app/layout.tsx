import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import { ToastProvider } from "@/components/ui/toast-context";
import { FavoritesProvider } from "@/components/store/favorites-context";
import { CartProvider } from "@/components/store/cart-context";

export const viewport: Viewport = {
  themeColor: "#090d16",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "TiendaDelki - Tienda Física & E-Commerce en República Dominicana",
    template: "%s | TiendaDelki",
  },
  description: "Compra ropa, accesorios y artículos seleccionados con calidad garantizada. Venta física en Santo Domingo y envíos rápidos a todo el país.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "./",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_DO",
    url: "https://tiendadelki.com",
    siteName: "TiendaDelki",
    title: "TiendaDelki - Tienda Física & E-Commerce en República Dominicana",
    description: "Tienda online y física en Santo Domingo. Envíos garantizados a todo el país y pagos seguros por transferencia o WhatsApp.",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "TiendaDelki - Calidad y Moda en República Dominicana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TiendaDelki - Moda y Artículos Exclusivos en RD",
    description: "Venta física en Santo Domingo y envíos express a toda República Dominicana.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <FavoritesProvider>
            <CartProvider>{children}</CartProvider>
          </FavoritesProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
