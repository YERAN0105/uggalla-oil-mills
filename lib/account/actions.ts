"use server";

import { revalidatePath } from "next/cache";
import { addDays, format as formatDate } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reverseLoyaltyForOrder } from "@/lib/loyalty/engine";
import { isCancellable } from "@/lib/orders/status";
import { accountAddressSchema, profileSchema } from "@/lib/account/schema";
import { nowInColombo } from "@/lib/date";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const INTERVAL_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export async function saveAddress(input: unknown, id?: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Please sign in." };

  const parsed = accountAddressSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const admin = createAdminClient();

  const row = {
    label: d.label?.trim() || "Home",
    recipient: d.recipient,
    phone: d.phone,
    line1: d.line1,
    line2: d.line2 || null,
    city: d.city,
    postal_code: d.postal_code || null,
    delivery_zone_id: d.delivery_zone_id || null,
    is_default: !!d.is_default,
  };

  if (id) {
    // Ownership check.
    const { data: existing } = await admin
      .from("addresses")
      .select("id")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!existing) return { ok: false, error: "Address not found." };
    const { error } = await admin.from("addresses").update(row).eq("id", id);
    if (error) return { ok: false, error: "Could not update the address." };
  } else {
    const { error } = await admin.from("addresses").insert({ ...row, user_id: userId });
    if (error) return { ok: false, error: "Could not save the address." };
  }

  // Enforce a single default.
  if (row.is_default) {
    await admin
      .from("addresses")
      .update({ is_default: false })
      .eq("user_id", userId)
      .neq("id", id ?? "00000000-0000-0000-0000-000000000000");
    if (id) await admin.from("addresses").update({ is_default: true }).eq("id", id);
  }

  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();
  const { error } = await admin.from("addresses").delete().eq("id", id).eq("user_id", userId);
  if (error) return { ok: false, error: "Could not delete the address." };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("addresses")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Address not found." };
  await admin.from("addresses").update({ is_default: false }).eq("user_id", userId);
  await admin.from("addresses").update({ is_default: true }).eq("id", id);
  revalidatePath("/account/addresses");
  return { ok: true };
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

async function ownSubscription(admin: ReturnType<typeof createAdminClient>, userId: string, id: string) {
  const { data } = await admin
    .from("subscriptions")
    .select("id, interval, status")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function setSubscriptionStatus(
  id: string,
  status: "active" | "paused" | "cancelled"
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();
  const sub = await ownSubscription(admin, userId, id);
  if (!sub) return { ok: false, error: "Subscription not found." };

  const patch: Record<string, unknown> = { status };
  // Resuming refreshes the next reminder relative to today so it doesn't fire
  // immediately for a long-paused subscription.
  if (status === "active") {
    const days = INTERVAL_DAYS[sub.interval] ?? 30;
    patch.next_reminder_date = formatDate(addDays(nowInColombo(), days), "yyyy-MM-dd");
  }
  const { error } = await admin.from("subscriptions").update(patch).eq("id", id);
  if (error) return { ok: false, error: "Could not update the subscription." };
  revalidatePath("/account/subscriptions");
  return { ok: true };
}

export async function changeSubscriptionFrequency(
  id: string,
  interval: "weekly" | "biweekly" | "monthly"
): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();
  const sub = await ownSubscription(admin, userId, id);
  if (!sub) return { ok: false, error: "Subscription not found." };

  const days = INTERVAL_DAYS[interval] ?? 30;
  const next = formatDate(addDays(nowInColombo(), days), "yyyy-MM-dd");
  const { error } = await admin
    .from("subscriptions")
    .update({ interval, next_reminder_date: next })
    .eq("id", id);
  if (error) return { ok: false, error: "Could not change the frequency." };
  revalidatePath("/account/subscriptions");
  return { ok: true };
}

// ─── Cancel order ────────────────────────────────────────────────────────────

export async function cancelOrder(orderNumber: string, reason: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, payment_status, coupon_id, order_items(product_id, quantity)")
    .eq("order_number", orderNumber)
    .eq("user_id", userId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if (!isCancellable(order.status)) {
    return { ok: false, error: "This order can no longer be cancelled. Please contact support." };
  }

  // 1. Restore tracked stock.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (order.order_items ?? []) as any[];
  const productIds = [...new Set(items.map((i) => i.product_id).filter(Boolean))];
  if (productIds.length > 0) {
    const { data: products } = await admin
      .from("products")
      .select("id, stock_tracked, stock_quantity")
      .in("id", productIds);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const map = new Map((products ?? []).map((p: any) => [p.id, p]));
    for (const item of items) {
      const p = item.product_id ? map.get(item.product_id) : null;
      if (p?.stock_tracked) {
        await admin
          .from("products")
          .update({ stock_quantity: p.stock_quantity + item.quantity })
          .eq("id", p.id);
        // Keep the local copy in sync if the same product appears twice.
        map.set(p.id, { ...p, stock_quantity: p.stock_quantity + item.quantity });
      }
    }
  }

  // 2. Free the coupon usage.
  if (order.coupon_id) {
    await admin.from("coupon_usage").delete().eq("order_id", order.id);
  }

  // 3. Reverse loyalty (refund redeemed points; claw back any earned).
  await reverseLoyaltyForOrder(order.id);

  // 4. Cancel subscriptions created from this order.
  await admin
    .from("subscriptions")
    .update({ status: "cancelled" })
    .eq("created_from_order_id", order.id)
    .neq("status", "cancelled");

  // 5. Mark cancelled + record history. Only a paid order becomes "refunded";
  // unpaid (cod / pending / pending_transfer) orders keep their payment status.
  const cancelPatch: Record<string, unknown> = { status: "cancelled" };
  if (order.payment_status === "paid") cancelPatch.payment_status = "refunded";
  await admin.from("orders").update(cancelPatch).eq("id", order.id);
  await admin.from("order_status_history").insert({
    order_id: order.id,
    status: "cancelled",
    note: reason ? `Cancelled by customer — ${reason}` : "Cancelled by customer",
    changed_by: userId,
  });

  // TODO Phase 6: notify('order_cancelled', { orderId: order.id, reason })

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${orderNumber}`);
  return { ok: true };
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export type ProfileUpdateResult =
  | { ok: true; emailChanged: boolean }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export async function updateProfile(input: unknown): Promise<ProfileUpdateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;

  // Password change requires the current password.
  if (d.newPassword) {
    if (!d.currentPassword) {
      return {
        ok: false,
        error: "Enter your current password to set a new one.",
        fieldErrors: { currentPassword: ["Current password is required"] },
      };
    }
    const { error: reauthErr } = await supabase.auth.signInWithPassword({
      email: user.email ?? "",
      password: d.currentPassword,
    });
    if (reauthErr) {
      return {
        ok: false,
        error: "Your current password is incorrect.",
        fieldErrors: { currentPassword: ["Incorrect password"] },
      };
    }
  }

  // Update profile row (name + phone) via the service-role client.
  const admin = createAdminClient();
  await admin.from("users").update({ name: d.name, phone: d.phone }).eq("id", user.id);

  // Auth-managed fields.
  const authPatch: { email?: string; password?: string; data?: Record<string, unknown> } = {
    data: { name: d.name, phone: d.phone },
  };
  const emailChanged = d.email.toLowerCase() !== (user.email ?? "").toLowerCase();
  if (emailChanged) authPatch.email = d.email; // triggers Supabase re-verification
  if (d.newPassword) authPatch.password = d.newPassword;

  const { error: authErr } = await supabase.auth.updateUser(authPatch);
  if (authErr) return { ok: false, error: authErr.message };

  revalidatePath("/account/profile");
  revalidatePath("/account", "layout");
  return { ok: true, emailChanged };
}

export async function deleteAccount(password: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  // Re-authenticate before a destructive action.
  const { error: reauthErr } = await supabase.auth.signInWithPassword({
    email: user.email ?? "",
    password,
  });
  if (reauthErr) return { ok: false, error: "Your password is incorrect." };

  // Soft-delete: keep order/review references intact, block all further access.
  const admin = createAdminClient();
  await admin
    .from("users")
    .update({ blocked: true, deleted_at: new Date().toISOString() })
    .eq("id", user.id);

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { ok: true };
}
