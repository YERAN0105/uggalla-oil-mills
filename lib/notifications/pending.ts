// Debounce buffer helpers (Phase 6, Part A).
//
// Every order status-write site calls `enqueueOrderNotification` instead of
// notifying directly. It UPSERTs one row per order into
// `pending_order_notifications`; a rapid second change overwrites the pending row
// and pushes `dispatch_after` out again — that overwrite IS the debounce.
//
// Writes go through the SERVICE-ROLE client so the call works from every context
// — admin actions, the customer cancel flow, and the PayHere webhook — against an
// RLS-locked table with no public policies.

import { createAdminClient } from "@/lib/supabase/admin";
import { statusStepIndex } from "@/lib/orders/status";

/** Cool-off before a buffered notification is eligible to send. Tunable. */
export const COOL_OFF_MS = 3 * 60 * 1000; // 3 minutes

/** Give up (and flag for review) after this many failed send attempts. Tunable. */
export const MAX_ATTEMPTS = 5;

/** Statuses that sit on the forward progression ladder (rank via statusStepIndex). */
const PROGRESSION = new Set([
  "pending_confirmation",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
]);

/** Terminal statuses — notified once, reachable from any state. */
export const TERMINAL = new Set(["cancelled", "refunded"]);

export function isProgression(status: string): boolean {
  return PROGRESSION.has(status);
}

export function isTerminal(status: string): boolean {
  return TERMINAL.has(status);
}

/** Forward-only rank for a progression status (terminal → -1). */
export function progressionRank(status: string): number {
  return isProgression(status) ? statusStepIndex(status) : -1;
}

/**
 * Buffer (or re-buffer) a status-change notification for an order. Idempotent at
 * the row level: one row per order, keyed by `order_id`. Each call resets the
 * cool-off window and the attempt counter. Fire-and-forget — never throws into
 * the caller's transaction; logs and swallows on failure.
 */
export async function enqueueOrderNotification(
  orderId: string,
  targetStatus: string
): Promise<void> {
  try {
    const db = createAdminClient();
    const dispatchAfter = new Date(Date.now() + COOL_OFF_MS).toISOString();
    const { error } = await db
      .from("pending_order_notifications")
      .upsert(
        {
          order_id: orderId,
          target_status: targetStatus,
          dispatch_after: dispatchAfter,
          attempts: 0,
          last_error: null,
        },
        { onConflict: "order_id" }
      );
    if (error) console.error("[enqueueOrderNotification] upsert failed:", error.message);
  } catch (err) {
    console.error("[enqueueOrderNotification] unexpected error:", err);
  }
}

export type ReceiptOutcome = "approved" | "rejected" | "reverted";

/**
 * Buffer (or re-buffer) a bank-receipt decision notification. Same debounce model
 * as order notifications but on its OWN one-row-per-order table, so receipt churn
 * never overwrites a pending status email and vice-versa. `reverted` (an admin
 * undo) overwrites any pending approve/reject and is dropped by the dispatcher —
 * so an undo within the window silently cancels the email. Service-role write, so
 * it works from every admin action context.
 */
export async function enqueueReceiptNotification(
  orderId: string,
  outcome: ReceiptOutcome,
  receiptId: string | null
): Promise<void> {
  try {
    const db = createAdminClient();
    const dispatchAfter = new Date(Date.now() + COOL_OFF_MS).toISOString();
    const { error } = await db
      .from("pending_receipt_notifications")
      .upsert(
        {
          order_id: orderId,
          outcome,
          receipt_id: receiptId,
          dispatch_after: dispatchAfter,
          attempts: 0,
          last_error: null,
        },
        { onConflict: "order_id" }
      );
    if (error) console.error("[enqueueReceiptNotification] upsert failed:", error.message);
  } catch (err) {
    console.error("[enqueueReceiptNotification] unexpected error:", err);
  }
}
