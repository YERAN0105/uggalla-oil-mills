"use server";

import crypto from "crypto";
import { addDays, parseISO, format as formatDate } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPayHereEnabled } from "@/lib/integrations";
import { formatInColombo } from "@/lib/date";
import { brand } from "@/lib/brand";
import { signOrderToken } from "@/lib/orders/token";
import { notify } from "@/lib/notifications";
import { getCodLimits, getTaxSettings, getLoyaltySettings } from "@/lib/settings";
import { evaluateCoupon, type CouponLine } from "@/lib/checkout/coupon";
import { createOrderSchema, type CreateOrderInput } from "@/lib/checkout/schema";
import type { AddressSnapshot } from "@/types/checkout";

// ─── Coupon apply (used by cart + checkout) ──────────────────────────────────

export async function applyCouponAction(
  code: string,
  lines: CouponLine[]
): Promise<
  | { ok: true; coupon: import("@/lib/checkout/coupon").EvaluatedCoupon }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return evaluateCoupon(code, lines, user?.id ?? null, 0);
}

// ─── Email account check (soft nudge for guests) ─────────────────────────────

/**
 * Returns whether an account already exists for this email, so checkout can
 * gently suggest logging in. Non-blocking; uses a security-definer DB function
 * (migration 006) via the service-role client so auth.users is never exposed.
 */
export async function checkEmailHasAccount(email: string): Promise<boolean> {
  const trimmed = email.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed)) return false;
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("email_has_account", { p_email: trimmed });
  if (error) {
    console.error("[checkEmailHasAccount] rpc error:", error);
    return false;
  }
  return data === true;
}

// ─── Slot availability (used by checkout to disable full slots) ───────────────

export async function getSlotAvailabilityAction(date: string): Promise<Record<string, number>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return {};
  const { getSlotAvailability } = await import("@/lib/checkout/data");
  return getSlotAvailability(date);
}

// ─── Order placement ─────────────────────────────────────────────────────────

const INTERVAL_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };

function generateOrderNumber(): string {
  const stamp = formatInColombo(new Date(), "yyyyMMdd");
  const rand = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `UOM-${stamp}-${rand}`;
}

export type CreateOrderResult =
  | { ok: true; orderNumber: string; token: string; redirectUrl: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function createOrder(input: unknown): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data: CreateOrderInput = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? null;
  const admin = createAdminClient();

  // 1. Re-fetch every product + sizes; recompute prices server-side.
  const productIds = [...new Set(data.items.map((i) => i.productId))];
  const { data: products, error: prodErr } = await admin
    .from("products")
    .select(
      `id, slug, name, purchase_type, allows_subscription, allows_note, note_max_chars,
       base_price, stock_tracked, stock_quantity,
       brands:brand_id(name),
       product_images(url, is_primary, display_order),
       product_sizes(id, label, volume_ml, price)`
    )
    .in("id", productIds)
    .eq("is_published", true)
    .is("deleted_at", null);

  if (prodErr || !products) return { ok: false, error: "Could not verify your cart. Please try again." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

  interface ResolvedLine {
    productId: string;
    sizeId: string | null;
    quantity: number;
    note: string;
    isSubscription: boolean;
    subscriptionInterval: string | null;
    unitPrice: number;
    lineTotal: number;
    snapshot: { name: string; brand: string | null; slug: string; image: string | null };
    size: { id: string | null; label: string; volume_ml: number | null; price: number };
    stockTracked: boolean;
    stockQuantity: number;
  }

  const resolved: ResolvedLine[] = [];
  for (const item of data.items) {
    const p = productMap.get(item.productId);
    if (!p) return { ok: false, error: "One of your products is no longer available." };
    if (p.purchase_type !== "retail") {
      return { ok: false, error: "Bulk products cannot be checked out — request a quote instead." };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizes = (p.product_sizes ?? []) as any[];
    let size: ResolvedLine["size"];
    if (sizes.length > 0) {
      const match = item.sizeId ? sizes.find((s) => s.id === item.sizeId) : sizes[0];
      if (!match) return { ok: false, error: `A size for "${p.name}" is no longer available.` };
      size = { id: match.id, label: match.label, volume_ml: match.volume_ml, price: Number(match.price) };
    } else {
      size = { id: null, label: "Standard", volume_ml: null, price: Number(p.base_price) };
    }

    if (p.stock_tracked && p.stock_quantity < item.quantity) {
      return {
        ok: false,
        error:
          p.stock_quantity <= 0
            ? `"${p.name}" is out of stock. Please remove it from your cart.`
            : `Only ${p.stock_quantity} of "${p.name}" left. Please reduce the quantity.`,
      };
    }

    const unitPrice = size.price;
    const lineTotal = Number((unitPrice * item.quantity).toFixed(2));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = (p.product_images ?? []) as any[];
    const primary = images.find((im) => im.is_primary) ?? images[0];

    const isSub = item.isSubscription && p.allows_subscription && !!userId;
    const interval = isSub ? item.subscriptionInterval ?? "monthly" : null;

    resolved.push({
      productId: p.id,
      sizeId: size.id,
      quantity: item.quantity,
      note: p.allows_note ? (item.note ?? "").slice(0, p.note_max_chars) : "",
      isSubscription: isSub,
      subscriptionInterval: interval,
      unitPrice,
      lineTotal,
      snapshot: { name: p.name, brand: p.brands?.name ?? null, slug: p.slug, image: primary?.url ?? null },
      size,
      stockTracked: p.stock_tracked,
      stockQuantity: p.stock_quantity,
    });
  }

  const subtotal = Number(resolved.reduce((s, l) => s + l.lineTotal, 0).toFixed(2));

  // 2. Fulfillment + schedule validation (Asia/Colombo).
  const todayStr = formatInColombo(new Date(), "yyyy-MM-dd");
  const earliestStr = formatInColombo(new Date(Date.now() + brand.minLeadTimeHours * 3600_000), "yyyy-MM-dd");
  if (data.fulfillmentDate < earliestStr) {
    return {
      ok: false,
      error: `Please choose a date at least ${brand.minLeadTimeHours} hours from now.`,
      fieldErrors: { fulfillmentDate: ["Date is too soon"] },
    };
  }
  if (data.fulfillmentDate < todayStr) {
    return { ok: false, error: "The selected date is in the past." };
  }
  const { data: holiday } = await admin
    .from("holidays")
    .select("date")
    .eq("date", data.fulfillmentDate)
    .maybeSingle();
  if (holiday) return { ok: false, error: "We're closed on the selected date. Please pick another." };

  // 3. Validate time slot + capacity (count non-cancelled orders for slot+date).
  const { data: slot } = await admin
    .from("time_slots")
    .select("id, label, capacity, is_active")
    .eq("id", data.timeSlotId)
    .maybeSingle();
  if (!slot || !slot.is_active) return { ok: false, error: "The selected time slot is unavailable." };

  const { count: slotCount } = await admin
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("delivery_date", data.fulfillmentDate)
    .eq("time_slot_id", data.timeSlotId)
    .not("status", "in", "(cancelled,refunded)");
  if ((slotCount ?? 0) >= slot.capacity) {
    return {
      ok: false,
      error: "That time slot just filled up. Please choose another slot.",
      fieldErrors: { timeSlotId: ["Slot full"] },
    };
  }

  // 4. Delivery zone + fee.
  let deliveryFee = 0;
  let deliveryZoneId: string | null = null;
  let addressSnapshot: AddressSnapshot | null = null;

  if (data.fulfillmentType === "delivery") {
    if (!data.deliveryZoneId) return { ok: false, error: "Please select a delivery zone." };
    const { data: zone } = await admin
      .from("delivery_zones")
      .select("id, fee, min_order_amount, is_active")
      .eq("id", data.deliveryZoneId)
      .maybeSingle();
    if (!zone || !zone.is_active) return { ok: false, error: "The selected delivery zone is unavailable." };
    if (zone.min_order_amount && subtotal < Number(zone.min_order_amount)) {
      return {
        ok: false,
        error: `This delivery zone requires a minimum order of Rs. ${Number(zone.min_order_amount).toLocaleString()}.`,
      };
    }
    deliveryFee = Number(zone.fee);
    deliveryZoneId = zone.id;

    // Resolve address — saved or new.
    if (data.savedAddressId && userId) {
      const { data: addr } = await admin
        .from("addresses")
        .select("recipient, phone, line1, line2, city, postal_code")
        .eq("id", data.savedAddressId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!addr) return { ok: false, error: "The selected address could not be found." };
      addressSnapshot = addr as AddressSnapshot;
    } else if (data.address) {
      addressSnapshot = {
        recipient: data.address.recipient,
        phone: data.address.phone,
        line1: data.address.line1,
        line2: data.address.line2 || null,
        city: data.address.city,
        postal_code: data.address.postal_code || null,
      };
      // Save for logged-in customers who opted in (incl. the chosen zone).
      if (data.saveAddress && userId) {
        await admin.from("addresses").insert({
          user_id: userId,
          label: data.address.label?.trim() || "Home",
          recipient: data.address.recipient,
          phone: data.address.phone,
          line1: data.address.line1,
          line2: data.address.line2 || null,
          city: data.address.city,
          postal_code: data.address.postal_code || null,
          delivery_zone_id: deliveryZoneId,
        });
      }
    } else {
      return { ok: false, error: "Please provide a delivery address." };
    }
  }

  // 5. Coupon.
  let couponId: string | null = null;
  let discountAmount = 0;
  if (data.couponCode?.trim()) {
    const couponLines: CouponLine[] = resolved.map((l) => ({ productId: l.productId, lineTotal: l.lineTotal }));
    const result = await evaluateCoupon(data.couponCode, couponLines, userId, deliveryFee);
    if (!result.ok) return { ok: false, error: result.error, fieldErrors: { couponCode: [result.error] } };
    couponId = result.coupon.id;
    discountAmount = result.coupon.discount;
    if (result.coupon.freeDelivery) deliveryFee = 0;
  }

  // 6. Loyalty redemption (logged-in only).
  let loyaltyPointsUsed = 0;
  let loyaltyDiscount = 0;
  if (data.loyaltyPointsToRedeem > 0 && userId) {
    const loyalty = await getLoyaltySettings();
    const { data: profile } = await admin
      .from("users")
      .select("loyalty_points")
      .eq("id", userId)
      .single();
    const balance = profile?.loyalty_points ?? 0;
    const requested = Math.min(data.loyaltyPointsToRedeem, balance);
    if (requested > 0) {
      const afterDiscountSubtotal = Math.max(0, subtotal - discountAmount);
      const maxByPercent = (afterDiscountSubtotal * loyalty.max_redeem_percent) / 100;
      const perPoint = loyalty.redeem_rate / loyalty.redeem_per_points; // Rs per point
      let discount = requested * perPoint;
      discount = Math.min(discount, maxByPercent, afterDiscountSubtotal);
      // Round down to whole points actually consumed for the capped discount.
      const pointsConsumed = perPoint > 0 ? Math.ceil(discount / perPoint) : 0;
      loyaltyPointsUsed = Math.min(requested, pointsConsumed);
      loyaltyDiscount = Number(discount.toFixed(2));
    }
  }

  // 7. Tax (on the discounted subtotal when exclusive).
  const tax = await getTaxSettings();
  const taxableBase = Math.max(0, subtotal - discountAmount - loyaltyDiscount);
  const taxAmount =
    tax.rate > 0 && !tax.inclusive ? Number(((taxableBase * tax.rate) / 100).toFixed(2)) : 0;

  // 8. Total.
  const total = Number(
    Math.max(0, subtotal - discountAmount - loyaltyDiscount + deliveryFee + taxAmount).toFixed(2)
  );

  // 9. Payment method gating.
  if (data.paymentMethod === "payhere" && !isPayHereEnabled) {
    return { ok: false, error: "Online payment is currently unavailable. Please choose another method." };
  }
  if (data.paymentMethod === "cod") {
    // "cod" is cash on hand-over — Cash on Delivery for delivery orders, Pay at
    // Store for pickup. The same enabled flag + min/max limits gate both.
    const cashLabel = data.fulfillmentType === "pickup" ? "Pay at Store" : "Cash on Delivery";
    const cod = await getCodLimits();
    if (!cod.enabled) return { ok: false, error: `${cashLabel} is currently unavailable.` };
    if (cod.min_order_amount && total < cod.min_order_amount) {
      return { ok: false, error: `${cashLabel} requires a minimum of Rs. ${cod.min_order_amount.toLocaleString()}.` };
    }
    if (cod.max_order_amount && total > cod.max_order_amount) {
      return { ok: false, error: `${cashLabel} is not available for orders over Rs. ${cod.max_order_amount.toLocaleString()}.` };
    }
  }

  // 10. Status mapping.
  let paymentStatus: string;
  let orderStatus: string;
  if (data.paymentMethod === "payhere") {
    paymentStatus = "pending";
    orderStatus = "pending_confirmation";
  } else if (data.paymentMethod === "bank_transfer") {
    paymentStatus = "pending_transfer";
    orderStatus = "pending_confirmation";
  } else {
    paymentStatus = "cod";
    orderStatus = "pending_confirmation";
  }

  // 11. Insert order.
  const orderNumber = generateOrderNumber();
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: userId,
      guest_email: userId ? null : data.contactEmail,
      guest_phone: userId ? null : data.contactPhone,
      status: orderStatus,
      fulfillment_type: data.fulfillmentType,
      delivery_zone_id: deliveryZoneId,
      address_snapshot: addressSnapshot,
      delivery_date: data.fulfillmentDate,
      time_slot_id: data.timeSlotId,
      payment_method: data.paymentMethod,
      payment_status: paymentStatus,
      subtotal,
      delivery_fee: deliveryFee,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      loyalty_points_used: loyaltyPointsUsed,
      loyalty_discount: loyaltyDiscount,
      total,
      coupon_id: couponId,
      source: "storefront",
      notes: data.driverNote || null,
    })
    .select("id, order_number")
    .single();

  if (orderErr || !order) {
    console.error("[createOrder] order insert failed:", orderErr);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }

  // 12. Order items.
  const itemRows = resolved.map((l) => ({
    order_id: order.id,
    product_id: l.productId,
    product_snapshot: l.snapshot,
    options: {
      size: l.size,
      quantity: l.quantity,
      note: l.note,
      is_subscription: l.isSubscription,
      subscription_interval: l.subscriptionInterval,
    },
    quantity: l.quantity,
    unit_price: l.unitPrice,
    line_total: l.lineTotal,
  }));
  const { error: itemsErr } = await admin.from("order_items").insert(itemRows);
  if (itemsErr) {
    // Roll back the order so we don't leave an empty shell.
    await admin.from("orders").delete().eq("id", order.id);
    console.error("[createOrder] order_items insert failed:", itemsErr);
    return { ok: false, error: "We couldn't save your order items. Please try again." };
  }

  // 13. Status history (initial).
  await admin.from("order_status_history").insert({
    order_id: order.id,
    status: orderStatus,
    note: "Order placed",
    changed_by: userId,
  });

  // 14. Coupon usage.
  if (couponId) {
    await admin.from("coupon_usage").insert({
      coupon_id: couponId,
      order_id: order.id,
      user_id: userId,
    });
  }

  // 15. Loyalty redemption — reserve points now (reversed on cancellation in Phase 5).
  if (loyaltyPointsUsed > 0 && userId) {
    const { data: profile } = await admin
      .from("users")
      .select("loyalty_points")
      .eq("id", userId)
      .single();
    const balance = profile?.loyalty_points ?? 0;
    const newBalance = Math.max(0, balance - loyaltyPointsUsed);
    await admin.from("users").update({ loyalty_points: newBalance }).eq("id", userId);
    await admin.from("loyalty_transactions").insert({
      user_id: userId,
      order_id: order.id,
      type: "redeem",
      points: -loyaltyPointsUsed,
      balance_after: newBalance,
      note: `Redeemed on order ${orderNumber}`,
    });
  }

  // 16. Subscriptions (reminder-only — never auto-charge).
  const subItems = resolved.filter((l) => l.isSubscription && userId);
  for (const l of subItems) {
    const days = INTERVAL_DAYS[l.subscriptionInterval ?? "monthly"] ?? 30;
    const nextReminder = formatDate(addDays(parseISO(data.fulfillmentDate), days), "yyyy-MM-dd");
    await admin.from("subscriptions").insert({
      user_id: userId,
      product_id: l.productId,
      size_id: l.sizeId,
      quantity: l.quantity,
      interval: l.subscriptionInterval,
      next_reminder_date: nextReminder,
      status: "active",
      created_from_order_id: order.id,
    });
  }

  // 17. Decrement tracked stock.
  for (const l of resolved) {
    if (l.stockTracked) {
      const newQty = Math.max(0, l.stockQuantity - l.quantity);
      await admin.from("products").update({ stock_quantity: newQty }).eq("id", l.productId);
    }
  }

  const token = signOrderToken(orderNumber);

  // Immediate order-placed confirmation — first touch, NOT debounced. Best-effort:
  // a failed email must never fail the order. (pending_confirmation is excluded
  // from the debounced dispatcher, so this is the only "order placed" email.)
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    await notify("order_placed", {
      orderNumber,
      status: "pending_confirmation",
      email: data.contactEmail ?? null,
      phone: data.contactPhone ?? null,
      recipientName: addressSnapshot?.recipient ?? null,
      items: resolved.map((l) => ({
        name: l.snapshot?.name ?? "Item",
        sizeLabel: l.size?.label ?? null,
        quantity: l.quantity,
        lineTotal: l.lineTotal,
      })),
      subtotal,
      deliveryFee,
      discount: discountAmount,
      loyaltyDiscount,
      tax: taxAmount,
      total,
      fulfillmentType: data.fulfillmentType,
      deliveryDate: data.fulfillmentDate ?? null,
      viewOrderUrl: `${base}/orders/${encodeURIComponent(orderNumber)}?t=${token}`,
    });
  } catch (err) {
    console.error("[createOrder] order-placed notify failed:", err);
  }

  const redirectUrl =
    data.paymentMethod === "payhere"
      ? `/checkout/pay/${orderNumber}`
      : `/order-success/${orderNumber}?t=${token}`;

  return { ok: true, orderNumber, token, redirectUrl };
}
