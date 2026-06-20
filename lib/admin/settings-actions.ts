"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { deleteReplacedImage } from "@/lib/admin/storage";
import type { ActionResult } from "@/types/admin";
import type {
  SubscriptionFrequencies,
  NotificationSettings,
  SeoSettings,
  MaintenanceSettings,
} from "@/types/admin";
import type { ShopInfo, TaxSettings, BankDetails, CodLimits } from "@/types/checkout";

async function upsert(key: string, value: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("settings").upsert({ key, value }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "settings.update", targetTable: "settings", metadata: { key } });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveShopInfo(value: ShopInfo & { logo_url?: string }): Promise<ActionResult> {
  const db = createAdminClient();
  const { data: prev } = await db.from("settings").select("value").eq("key", "shop_info").maybeSingle();
  const oldLogo = (prev?.value as { logo_url?: string } | null)?.logo_url ?? null;
  const res = await upsert("shop_info", value);
  if (res.ok) await deleteReplacedImage(oldLogo, value.logo_url ?? null);
  return res;
}

export async function saveTax(value: TaxSettings): Promise<ActionResult> {
  return upsert("tax", {
    rate: Number(value.rate) || 0,
    inclusive: !!value.inclusive,
    label: value.label || "Tax",
  });
}

export async function saveSubscriptionFrequencies(
  value: SubscriptionFrequencies
): Promise<ActionResult> {
  return upsert("subscription_frequencies", value);
}

export async function saveBankDetails(value: BankDetails): Promise<ActionResult> {
  return upsert("bank_details", value);
}

export async function saveCodLimits(value: CodLimits): Promise<ActionResult> {
  return upsert("cod_limits", {
    enabled: !!value.enabled,
    min_order_amount: value.min_order_amount === null ? null : Number(value.min_order_amount),
    max_order_amount: value.max_order_amount === null ? null : Number(value.max_order_amount),
  });
}

export async function saveNotifications(value: NotificationSettings): Promise<ActionResult> {
  return upsert("notifications", value);
}

export async function saveSeo(value: SeoSettings): Promise<ActionResult> {
  const db = createAdminClient();
  const { data: prev } = await db.from("settings").select("value").eq("key", "seo").maybeSingle();
  const oldOg = (prev?.value as { og_image_url?: string } | null)?.og_image_url ?? null;
  const res = await upsert("seo", value);
  if (res.ok) await deleteReplacedImage(oldOg, value.og_image_url ?? null);
  return res;
}

export async function saveMaintenance(value: MaintenanceSettings): Promise<ActionResult> {
  return upsert("maintenance", value);
}
