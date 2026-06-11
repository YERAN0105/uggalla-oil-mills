import { createAdminClient } from "@/lib/supabase/admin";

export interface CouponLine {
  productId: string;
  lineTotal: number;
}

export interface EvaluatedCoupon {
  id: string;
  code: string;
  type: "percent_off" | "flat_off" | "free_delivery";
  value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  /** Discount on the subtotal (0 for free_delivery — that affects delivery_fee). */
  discount: number;
  freeDelivery: boolean;
}

export type CouponResult =
  | { ok: true; coupon: EvaluatedCoupon }
  | { ok: false; error: string };

interface AppliesTo {
  type: "all" | "categories" | "brands" | "products";
  ids?: string[];
}

/**
 * Validate a coupon code against the cart and (optionally) a user, computing the
 * discount. Authoritative — used both by the "Apply coupon" action and by
 * createOrder. Uses the admin client because the `coupons` table is admin-only
 * under RLS (customers can't browse coupons, only redeem a known code).
 */
export async function evaluateCoupon(
  rawCode: string,
  lines: CouponLine[],
  userId: string | null,
  deliveryFee: number
): Promise<CouponResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Enter a coupon code." };

  const admin = createAdminClient();
  const { data: coupon } = await admin
    .from("coupons")
    .select(
      "id, code, type, value, min_order_amount, max_discount, usage_limit_total, usage_limit_per_user, valid_from, valid_until, applies_to, is_active"
    )
    .ilike("code", code)
    .maybeSingle();

  if (!coupon || !coupon.is_active) return { ok: false, error: "Invalid coupon code." };

  const now = new Date();
  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    return { ok: false, error: "This coupon is not active yet." };
  }
  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return { ok: false, error: "This coupon has expired." };
  }

  // Usage limits.
  if (coupon.usage_limit_total != null) {
    const { count } = await admin
      .from("coupon_usage")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id);
    if ((count ?? 0) >= coupon.usage_limit_total) {
      return { ok: false, error: "This coupon has reached its usage limit." };
    }
  }
  if (coupon.usage_limit_per_user != null && userId) {
    const { count } = await admin
      .from("coupon_usage")
      .select("*", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("user_id", userId);
    if ((count ?? 0) >= coupon.usage_limit_per_user) {
      return { ok: false, error: "You've already used this coupon." };
    }
  }

  // Determine which lines the coupon applies to.
  const appliesTo = (coupon.applies_to ?? { type: "all" }) as AppliesTo;
  let eligibleLines = lines;
  if (appliesTo.type !== "all" && appliesTo.ids?.length) {
    const ids = new Set(appliesTo.ids);
    if (appliesTo.type === "products") {
      eligibleLines = lines.filter((l) => ids.has(l.productId));
    } else {
      // categories / brands — resolve the cart products' brand/category.
      const { data: products } = await admin
        .from("products")
        .select("id, brand_id, category_id")
        .in(
          "id",
          lines.map((l) => l.productId)
        );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const map = new Map((products ?? []).map((p: any) => [p.id, p]));
      eligibleLines = lines.filter((l) => {
        const p = map.get(l.productId);
        if (!p) return false;
        return appliesTo.type === "categories" ? ids.has(p.category_id) : ids.has(p.brand_id);
      });
    }
  }

  const eligibleSubtotal = Number(eligibleLines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));
  const cartSubtotal = Number(lines.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));

  if (coupon.min_order_amount && cartSubtotal < coupon.min_order_amount) {
    return {
      ok: false,
      error: `Minimum order of Rs. ${coupon.min_order_amount.toLocaleString()} required for this coupon.`,
    };
  }

  if (eligibleSubtotal <= 0 && coupon.type !== "free_delivery") {
    return { ok: false, error: "This coupon doesn't apply to the items in your cart." };
  }

  let discount = 0;
  let freeDelivery = false;
  if (coupon.type === "percent_off") {
    discount = (eligibleSubtotal * Number(coupon.value)) / 100;
  } else if (coupon.type === "flat_off") {
    discount = Number(coupon.value);
  } else if (coupon.type === "free_delivery") {
    freeDelivery = true;
    discount = 0;
  }

  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  discount = Number(Math.min(discount, eligibleSubtotal).toFixed(2));

  // free_delivery is meaningless without a delivery fee, but still valid (pickup → 0 saved).
  void deliveryFee;

  return {
    ok: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      min_order_amount: coupon.min_order_amount,
      max_discount: coupon.max_discount,
      discount,
      freeDelivery,
    },
  };
}
