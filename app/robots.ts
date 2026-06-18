import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private / transactional areas out of the index.
        disallow: ["/admin", "/account", "/checkout", "/api", "/order-success", "/orders", "/quote", "/reorder", "/login", "/register", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
