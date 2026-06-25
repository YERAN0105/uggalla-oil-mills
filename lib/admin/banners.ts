"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { bannerSchema } from "@/lib/admin/schemas";
import { deletePublicImage, deleteReplacedImage } from "@/lib/admin/storage";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidate() {
  revalidatePath("/admin/banners");
  revalidatePath("/");
}

export async function saveBanner(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = bannerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();
  const row = {
    image_url: d.image_url || null,
    mobile_image_url: d.mobile_image_url || null,
    headline: d.headline || null,
    subheadline: d.subheadline || null,
    cta_text: d.cta_text || null,
    cta_link: d.cta_link || null,
    position: d.position,
    display_order: d.display_order,
    valid_from: d.valid_from || null,
    valid_until: d.valid_until || null,
    is_active: d.is_active,
  };

  if (id) {
    const { data: prev } = await db
      .from("banners")
      .select("image_url, mobile_image_url")
      .eq("id", id)
      .maybeSingle();
    const { error } = await db.from("banners").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    const prevRow = prev as { image_url: string | null; mobile_image_url: string | null } | null;
    await deleteReplacedImage(prevRow?.image_url, row.image_url);
    await deleteReplacedImage(prevRow?.mobile_image_url, row.mobile_image_url);
    await logActivity(admin.id, { action: "banner.update", targetTable: "banners", targetId: id });
    revalidate();
    return { ok: true, data: { id } };
  }
  const { data, error } = await db.from("banners").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "banner.create", targetTable: "banners", targetId: (data as any).id });
  revalidate();
  return { ok: true, data: { id: (data as any).id } };
}

export async function deleteBanner(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: existing } = await db
    .from("banners")
    .select("image_url, mobile_image_url")
    .eq("id", id)
    .maybeSingle();
  const { error } = await db.from("banners").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  const existingRow = existing as { image_url: string | null; mobile_image_url: string | null } | null;
  await deletePublicImage(existingRow?.image_url);
  await deletePublicImage(existingRow?.mobile_image_url);
  await logActivity(admin.id, { action: "banner.delete", targetTable: "banners", targetId: id });
  revalidate();
  return { ok: true };
}

export async function reorderBanners(orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  await Promise.all(orderedIds.map((id, i) => db.from("banners").update({ display_order: i }).eq("id", id)));
  revalidate();
  return { ok: true };
}

export async function toggleBannerActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("banners").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "banner.toggle", targetTable: "banners", targetId: id, metadata: { is_active: isActive } });
  revalidate();
  return { ok: true };
}
