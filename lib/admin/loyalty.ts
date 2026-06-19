"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { adjustLoyalty } from "@/lib/admin/customers";
import type { ActionResult } from "@/types/admin";
import type { LoyaltySettings } from "@/types/checkout";

export async function saveLoyaltySettings(input: LoyaltySettings): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const clean: LoyaltySettings = {
    earn_enabled: input.earn_enabled !== false,
    redeem_enabled: input.redeem_enabled !== false,
    earn_rate: Number(input.earn_rate) || 0,
    earn_per_amount: Number(input.earn_per_amount) || 1,
    redeem_rate: Number(input.redeem_rate) || 0,
    redeem_per_points: Number(input.redeem_per_points) || 1,
    max_redeem_percent: Number(input.max_redeem_percent) || 0,
    expiry_months: Number(input.expiry_months) || 12,
    first_order_bonus: Number(input.first_order_bonus) || 0,
    review_bonus: Number(input.review_bonus) || 0,
  };
  const { error } = await db.from("settings").upsert({ key: "loyalty", value: clean }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "settings.loyalty", targetTable: "settings" });
  revalidatePath("/admin/loyalty");
  return { ok: true };
}

/** Manual loyalty adjustment by customer email (goodwill / refunds). */
export async function adjustLoyaltyByEmail(
  email: string,
  points: number,
  reason: string
): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const match = (data?.users ?? []).find((u) => u.email?.toLowerCase() === email.trim().toLowerCase());
  if (!match) return { ok: false, error: "No customer with that email." };
  return adjustLoyalty(match.id, points, reason);
}
