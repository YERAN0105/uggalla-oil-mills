import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { BannersManager } from "@/components/admin/banners/BannersManager";
import type { AdminBanner } from "@/types/admin";

export const metadata: Metadata = { title: "Banners" };

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function BannersPage() {
  const db = createAdminClient();
  const { data } = await db.from("banners").select("*").order("display_order", { ascending: true });
  const banners: AdminBanner[] = ((data as any[]) ?? []).map((b) => ({
    id: b.id,
    image_url: b.image_url,
    mobile_image_url: b.mobile_image_url ?? null,
    headline: b.headline,
    subheadline: b.subheadline,
    cta_text: b.cta_text,
    cta_link: b.cta_link,
    position: b.position,
    display_order: b.display_order,
    valid_from: b.valid_from,
    valid_until: b.valid_until,
    is_active: b.is_active,
  }));
  return <BannersManager banners={banners} />;
}
