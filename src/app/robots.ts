import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://tiendadelki.com";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/admin/",
          "/api/orders/",
          "/api/customer/",
          "/cliente/",
          "/checkout",
          "/pedido/confirmacion/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
