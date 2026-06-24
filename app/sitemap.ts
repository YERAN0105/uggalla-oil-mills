import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Dynamic sitemap: static marketing/legal pages + every published product and
 * active category. Excludes account/admin/checkout/auth (non-indexable).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPaths = [
    "",
    "/shop",
    "/bulk-request",
    "/about",
    "/contact",
    "/faq",
    "/delivery-info",
    "/terms",
    "/refund-policy",
    "/privacy",
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map((p) => ({
    url: `${BASE}${p}`,
    lastModified: new Date(),
    changeFrequency: p === "" || p === "/shop" ? "daily" : "monthly",
    priority: p === "" ? 1 : 0.7,
  }));

  try {
    const db = createAdminClient();
    const [{ data: products }, { data: categories }] = await Promise.all([
      db
        .from("products")
        .select("slug, updated_at")
        .eq("is_published", true)
        .is("deleted_at", null),
      db.from("categories").select("slug, updated_at").eq("is_active", true),
    ]);

    for (const p of (products as any[]) ?? []) {
      entries.push({
        url: `${BASE}/shop/${p.slug}`,
        lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
    for (const c of (categories as any[]) ?? []) {
      entries.push({
        url: `${BASE}/shop/category/${c.slug}`,
        lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("[sitemap] failed to load dynamic entries:", err);
  }

  return entries;
}
