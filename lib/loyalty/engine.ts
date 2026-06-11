// Loyalty earn/reverse engine. Server-only — imported by server actions (order
// cancel here in Phase 4, admin order status updates in Phase 5). NOT a "use
// server" module, so it is never exposed as a callable action to the client.
//
// Rules (configurable via the `loyalty` setting):
//   • Earn: floor(order.total / earn_per_amount) * earn_rate points, credited
//     only when an order is DELIVERED. Points expire after `expiry_months`.
//   • Reverse: on cancellation/refund, refund any points the order REDEEMED at
//     checkout and claw back any points it EARNED. Idempotent — guarded by
//     marker transactions so re-running is a no-op.

import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLoyaltySettings } from "@/lib/settings";
import { addMonths } from "date-fns";

type Admin = SupabaseClient;

async function adjustBalance(
  admin: Admin,
  userId: string,
  delta: number,
  tx: { order_id: string | null; type: string; note: string; expires_at?: string | null }
): Promise<void> {
  const { data: profile } = await admin
    .from("users")
    .select("loyalty_points")
    .eq("id", userId)
    .single();
  const balance = profile?.loyalty_points ?? 0;
  const newBalance = Math.max(0, balance + delta);
  await admin.from("users").update({ loyalty_points: newBalance }).eq("id", userId);
  await admin.from("loyalty_transactions").insert({
    user_id: userId,
    order_id: tx.order_id,
    type: tx.type,
    points: delta,
    balance_after: newBalance,
    note: tx.note,
    expires_at: tx.expires_at ?? null,
  });
}

/**
 * Credit loyalty points for a delivered order. Safe to call more than once —
 * if an `earn` transaction already exists for the order it does nothing.
 */
export async function earnLoyaltyForOrder(orderId: string): Promise<number> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, total, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.user_id) return 0;

  const { data: existing } = await admin
    .from("loyalty_transactions")
    .select("id")
    .eq("order_id", orderId)
    .eq("type", "earn")
    .maybeSingle();
  if (existing) return 0;

  const loyalty = await getLoyaltySettings();
  const points = Math.floor(Number(order.total) / loyalty.earn_per_amount) * loyalty.earn_rate;
  if (points <= 0) return 0;

  const expiresAt = addMonths(new Date(), loyalty.expiry_months).toISOString();
  await adjustBalance(admin, order.user_id, points, {
    order_id: orderId,
    type: "earn",
    note: `Earned on delivered order ${order.order_number ?? ""}`.trim(),
    expires_at: expiresAt,
  });
  return points;
}

/**
 * Reverse loyalty effects when an order is cancelled/refunded:
 *   • refund points the order redeemed at checkout (if not already refunded);
 *   • claw back points the order earned on delivery (if any, not already clawed).
 * Idempotent via marker notes.
 */
export async function reverseLoyaltyForOrder(orderId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !order.user_id) return;

  const { data: txs } = await admin
    .from("loyalty_transactions")
    .select("type, points, note")
    .eq("order_id", orderId);
  const list = txs ?? [];

  const REFUND_NOTE = `Refund of redemption on order ${order.order_number}`;
  const CLAWBACK_NOTE = `Reversal of points earned on order ${order.order_number}`;

  // Refund redeemed points (original redeem tx has negative points).
  const redeem = list.find((t) => t.type === "redeem");
  const alreadyRefunded = list.some((t) => t.type === "adjust" && t.note === REFUND_NOTE);
  if (redeem && !alreadyRefunded) {
    const refund = Math.abs(redeem.points);
    if (refund > 0) {
      await adjustBalance(admin, order.user_id, refund, {
        order_id: orderId,
        type: "adjust",
        note: REFUND_NOTE,
      });
    }
  }

  // Claw back earned points.
  const earn = list.find((t) => t.type === "earn");
  const alreadyClawed = list.some((t) => t.type === "adjust" && t.note === CLAWBACK_NOTE);
  if (earn && !alreadyClawed && earn.points > 0) {
    await adjustBalance(admin, order.user_id, -earn.points, {
      order_id: orderId,
      type: "adjust",
      note: CLAWBACK_NOTE,
    });
  }
}
