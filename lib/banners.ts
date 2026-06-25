import { createClient } from "@/lib/supabase/server";

/** The bits of a banner the homepage hero needs. */
export interface HeroBanner {
  id: string;
  image_url: string | null;
  /** Optional tall/portrait crop shown only on phones; null → use image_url. */
  mobile_image_url: string | null;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

/**
 * All active hero banners for the homepage slideshow, ordered by `display_order`.
 * Empty array → the homepage falls back to its built-in default hero.
 *
 * RLS ("Public can read active banners") already limits non-admin visitors to
 * active banners inside their valid date window. We additionally filter
 * `is_active = true` so an admin browsing the homepage never sees a hidden one.
 */
export async function getHeroBanners(): Promise<HeroBanner[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("banners")
    .select("id, image_url, mobile_image_url, headline, subheadline, cta_text, cta_link")
    .eq("position", "hero")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return (data as HeroBanner[] | null) ?? [];
}

/** The bits of a banner the top promo strip needs. */
export interface PromoBanner {
  id: string;
  headline: string | null;
  cta_text: string | null;
  cta_link: string | null;
}

/**
 * The promo strip to show in the top bar, or `null` to fall back to the built-in
 * default message. Active `promo`-position banner with the lowest `display_order`.
 */
export async function getPromoBanner(): Promise<PromoBanner | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("banners")
    .select("id, headline, cta_text, cta_link")
    .eq("position", "promo")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as PromoBanner | null) ?? null;
}
