import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rastrear Pedido en Línea",
  description: "Consulta el estado en tiempo real y el número de guía de tu pedido en TiendaDelki República Dominicana.",
  alternates: {
    canonical: "/rastreo",
  },
};

export default function RastreoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
