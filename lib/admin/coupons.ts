"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { couponSchema } from "@/lib/admin/schemas";
import type { ActionResult, CouponAppliesTo } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidate() {
  revalidatePath("/admin/coupons");
}

function buildAppliesTo(type: string, ids: string[]): CouponAppliesTo {
  if (type === "all") return { type: "all" };
  return { type: type as "categories" | "brands" | "products", ids };
}

export async function saveCoupon(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();

  const row = {
    code: d.code,
    type: d.type,
    value: d.type === "free_delivery" ? 0 : d.value,
    min_order_amount: d.min_order_amount ?? null,
    max_discount: d.max_discount ?? null,
    usage_limit_total: d.usage_limit_total ?? null,
    usage_limit_per_user: d.usage_limit_per_user ?? null,
    valid_from: d.valid_from || null,
    valid_until: d.valid_until || null,
    applies_to: buildAppliesTo(d.applies_to_type, d.applies_to_ids),
    is_active: d.is_active,
  };

  if (id) {
    const { error } = await db.from("coupons").update(row).eq("id", id);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "That coupon code already exists." };
      return { ok: false, error: error.message };
    }
    await logActivity(admin.id, { action: "coupon.update", targetTable: "coupons", targetId: id, metadata: { code: d.code } });
    revalidate();
    return { ok: true, data: { id } };
  }

  const { data, error } = await db.from("coupons").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That coupon code already exists." };
    return { ok: false, error: error.message };
  }
  await logActivity(admin.id, { action: "coupon.create", targetTable: "coupons", targetId: (data as any).id, metadata: { code: d.code } });
  revalidate();
  return { ok: true, data: { id: (data as any).id } };
}

export async function deleteCoupon(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("coupons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "coupon.delete", targetTable: "coupons", targetId: id });
  revalidate();
  return { ok: true };
}

export async function toggleCouponActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("coupons").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "coupon.toggle", targetTable: "coupons", targetId: id, metadata: { is_active: isActive } });
  revalidate();
  return { ok: true };
}
