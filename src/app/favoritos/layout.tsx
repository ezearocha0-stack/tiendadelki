import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mis Favoritos",
  description: "Revisa tus artículos y prendas favoritas guardadas en TiendaDelki.",
  alternates: {
    canonical: "/favoritos",
  },
};

export default function FavoritosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
