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
    default: "TiendaDelki - Tienda Física en San Fernando de Montecristi",
    template: "%s | TiendaDelki",
  },
  description: "Compra ropa, accesorios y artículos seleccionados con calidad garantizada. Venta física y catálogo en tiempo real en San Fernando de Montecristi, República Dominicana.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
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
    title: "TiendaDelki - Tienda Física en San Fernando de Montecristi",
    description: "Tienda física en San Fernando de Montecristi, República Dominicana. Catálogo con inventario en tiempo real, ventas locales y pagos seguros por transferencia.",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "TiendaDelki - Calidad y Moda en San Fernando de Montecristi",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TiendaDelki - Tienda Física en San Fernando de Montecristi",
    description: "Venta física en San Fernando de Montecristi, República Dominicana y catálogo con stock en tiempo real.",
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
