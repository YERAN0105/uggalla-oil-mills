import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminCoupon, CouponAppliesTo } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function listCoupons(): Promise<AdminCoupon[]> {
  const db = createAdminClient();
  const { data } = await db.from("coupons").select("*").order("created_at", { ascending: false });

  // Usage counts per coupon.
  const { data: usage } = await db.from("coupon_usage").select("coupon_id");
  const counts = new Map<string, number>();
  for (const u of (usage as any[]) ?? []) counts.set(u.coupon_id, (counts.get(u.coupon_id) ?? 0) + 1);

  return ((data as any[]) ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    type: c.type,
    value: Number(c.value) || 0,
    min_order_amount: c.min_order_amount != null ? Number(c.min_order_amount) : null,
    max_discount: c.max_discount != null ? Number(c.max_discount) : null,
    usage_limit_total: c.usage_limit_total,
    usage_limit_per_user: c.usage_limit_per_user,
    valid_from: c.valid_from,
    valid_until: c.valid_until,
    applies_to: (c.applies_to ?? { type: "all" }) as CouponAppliesTo,
    is_active: c.is_active,
    usage_count: counts.get(c.id) ?? 0,
  }));
}
