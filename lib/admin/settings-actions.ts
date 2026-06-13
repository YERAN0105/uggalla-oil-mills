"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
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
  return upsert("shop_info", value);
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
  return upsert("seo", value);
}

export async function saveMaintenance(value: MaintenanceSettings): Promise<ActionResult> {
  return upsert("maintenance", value);
}
