// Debounced order-status notification dispatcher (Phase 6, Part A).
//
// Drains due rows from `pending_order_notifications` and sends each via notify(),
// enforcing forward-only / idempotency rules against `order_notification_ledger`.
//
// SECURITY: requires `Authorization: Bearer <CRON_SECRET>`.
//
// SCHEDULING: in production this is called every minute by a Supabase pg_cron job
// (via pg_net) — but ONLY when rows are due, so idle minutes make no HTTP call.
// That schedule is created POST-DEPLOY (Supabase cloud cannot reach localhost).
// See docs/POST_DEPLOY_STEPS.md. Locally, invoke it by hand with curl (see same).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  notify,
  eventForStatus,
  type OrderNotificationPayload,
  type NotifyChannelResult,
} from "@/lib/notifications";
import {
  MAX_ATTEMPTS,
  isTerminal,
  isProgression,
  progressionRank,
} from "@/lib/notifications/pending";
import { signOrderToken } from "@/lib/orders/token";
import type { OrderStatus } from "@/lib/orders/status";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Process at most this many rows per tick (keeps each run cheap on the free tier).
const BATCH = 50;

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[dispatch-notifications] CRON_SECRET is not set");
    return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) return unauthorized();

  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: rows, error } = await db
    .from("pending_order_notifications")
    .select("order_id, target_status, dispatch_after, attempts")
    .lte("dispatch_after", nowIso)
    .lt("attempts", MAX_ATTEMPTS)
    .order("dispatch_after", { ascending: true })
    .limit(BATCH);

  if (error) {
    console.error("[dispatch-notifications] query failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of (rows as any[]) ?? []) {
    const orderId = row.order_id as string;
    const targetStatus = row.target_status as string;
    const capturedDispatchAfter = row.dispatch_after as string;
    const attempts = Number(row.attempts);

    // Conditional delete: only removes the row if it hasn't been re-scheduled
    // (overwritten by a fresh enqueue) since we read it.
    const conditionalDelete = () =>
      db
        .from("pending_order_notifications")
        .delete()
        .eq("order_id", orderId)
        .eq("dispatch_after", capturedDispatchAfter);

    const event = eventForStatus(targetStatus);
    if (!event) {
      // Not a notifiable status (e.g. pending_confirmation slipped in) — drop it.
      await conditionalDelete();
      skipped += 1;
      continue;
    }

    // ── Forward-only / idempotency decision (ledger is the source of truth) ──
    const { data: ledger } = await db
      .from("order_notification_ledger")
      .select("status")
      .eq("order_id", orderId);
    const loggedStatuses = new Set(((ledger as any[]) ?? []).map((r) => r.status as string));

    let shouldSend: boolean;
    if (isTerminal(targetStatus)) {
      // Terminal: notify once for this exact status.
      shouldSend = !loggedStatuses.has(targetStatus);
    } else {
      // Progression: only if strictly forward of everything already notified.
      let maxLoggedRank = -1;
      for (const s of loggedStatuses) {
        if (isProgression(s)) maxLoggedRank = Math.max(maxLoggedRank, progressionRank(s));
      }
      shouldSend = progressionRank(targetStatus) > maxLoggedRank;
    }

    if (!shouldSend) {
      // Backward move / already notified / re-entry — silent.
      await conditionalDelete();
      skipped += 1;
      continue;
    }

    // ── Resolve recipient + build payload ──
    const payload = await buildPayload(db, orderId, targetStatus as OrderStatus);
    if (!payload) {
      // Order vanished (deleted) — nothing to send.
      await conditionalDelete();
      skipped += 1;
      continue;
    }

    const results = await notify(event, payload);
    const sentChannels = results.filter((r) => r.status === "sent");
    const realFailures = results.filter((r) => r.status === "failed");

    if (sentChannels.length === 0 && realFailures.length > 0) {
      // Genuine failure (not "disabled"/"no contact") — do NOT delete, do NOT log.
      // Increment attempts + record the error so the next tick retries; the
      // attempts < MAX_ATTEMPTS filter eventually parks it for review.
      await db
        .from("pending_order_notifications")
        .update({
          attempts: attempts + 1,
          last_error: lastError(results),
        })
        .eq("order_id", orderId)
        .eq("dispatch_after", capturedDispatchAfter);
      failed += 1;
      continue;
    }

    // Success path (something sent, or everything was skipped because all channels
    // are disabled / no contact details — nothing left to retry either way).
    if (sentChannels.length > 0) {
      await db.from("order_notification_ledger").upsert(
        sentChannels.map((r) => ({
          order_id: orderId,
          status: targetStatus,
          channel: r.channel,
        })),
        { onConflict: "order_id,status,channel", ignoreDuplicates: true }
      );
      sent += 1;
    } else {
      skipped += 1;
    }
    await conditionalDelete();
  }

  // ─── Bank-receipt decisions (separate two-way track) ───────────────────────
  const { data: receiptRows } = await db
    .from("pending_receipt_notifications")
    .select("order_id, outcome, receipt_id, dispatch_after, attempts")
    .lte("dispatch_after", nowIso)
    .lt("attempts", MAX_ATTEMPTS)
    .order("dispatch_after", { ascending: true })
    .limit(BATCH);

  for (const row of (receiptRows as any[]) ?? []) {
    const orderId = row.order_id as string;
    const outcome = row.outcome as "approved" | "rejected" | "reverted";
    const receiptId = (row.receipt_id as string | null) ?? null;
    const capturedDispatchAfter = row.dispatch_after as string;
    const attempts = Number(row.attempts);

    const conditionalDelete = () =>
      db
        .from("pending_receipt_notifications")
        .delete()
        .eq("order_id", orderId)
        .eq("dispatch_after", capturedDispatchAfter);

    // An undo (reverted) cancels the pending email — drop it, send nothing.
    if (outcome === "reverted") {
      await conditionalDelete();
      skipped += 1;
      continue;
    }

    // Dedupe + correction rule, anchored to the SAME receipt. The apology only
    // fires for an outcome flip on the same receipt the customer was last told
    // about; a decision on a different (e.g. re-uploaded) receipt is a clean email.
    const { data: notice } = await db
      .from("order_receipt_notice")
      .select("last_outcome, last_receipt_id")
      .eq("order_id", orderId)
      .maybeSingle();
    const lastOutcome = (notice as any)?.last_outcome as "approved" | "rejected" | undefined;
    const lastReceiptId = ((notice as any)?.last_receipt_id as string | null) ?? null;

    // Same receipt only when BOTH ids are present and equal (null-safe: a null on
    // either side — legacy rows, pre-migration buffer entries — counts as a
    // different receipt → clean email, never a false apology).
    const sameReceipt = receiptId !== null && lastReceiptId !== null && receiptId === lastReceiptId;

    if (sameReceipt && lastOutcome === outcome) {
      // Already told them this exact outcome for this receipt — say nothing.
      await conditionalDelete();
      skipped += 1;
      continue;
    }
    const isCorrection = sameReceipt && !!lastOutcome && lastOutcome !== outcome;

    const status: OrderStatus = outcome === "approved" ? "confirmed" : "pending_confirmation";
    const payload = await buildPayload(db, orderId, status);
    if (!payload) {
      await conditionalDelete();
      skipped += 1;
      continue;
    }
    payload.correction = isCorrection;
    if (outcome === "rejected") {
      const reason = await latestRejectReason(db, orderId);
      payload.note = reason ? `Reason: ${reason}` : null;
    }

    const event = outcome === "approved" ? "bank_receipt_approved" : "bank_receipt_rejected";
    const results = await notify(event, payload);
    const sentChannels = results.filter((r) => r.status === "sent");
    const realFailures = results.filter((r) => r.status === "failed");

    if (sentChannels.length === 0 && realFailures.length > 0) {
      await db
        .from("pending_receipt_notifications")
        .update({ attempts: attempts + 1, last_error: lastError(results) })
        .eq("order_id", orderId)
        .eq("dispatch_after", capturedDispatchAfter);
      failed += 1;
      continue;
    }

    if (sentChannels.length > 0) {
      // Remember the outcome AND which receipt we told the customer about (drives
      // future dedupe/correction, anchored to the receipt).
      await db
        .from("order_receipt_notice")
        .upsert(
          {
            order_id: orderId,
            last_outcome: outcome,
            last_receipt_id: receiptId,
            notified_at: new Date().toISOString(),
          },
          { onConflict: "order_id" }
        );
      // An approval is also the order's confirmation — record "confirmed" in the
      // status ledger so the ladder never re-sends a separate confirmed email.
      if (outcome === "approved") {
        await db.from("order_notification_ledger").upsert(
          sentChannels.map((r) => ({ order_id: orderId, status: "confirmed", channel: r.channel })),
          { onConflict: "order_id,status,channel", ignoreDuplicates: true }
        );
      }
      sent += 1;
    } else {
      skipped += 1;
    }
    await conditionalDelete();
  }

  const processed = ((rows as any[])?.length ?? 0) + ((receiptRows as any[])?.length ?? 0);
  return NextResponse.json({ ok: true, processed, sent, skipped, failed });
}

/** Reason from the most recently rejected bank-transfer receipt for an order. */
async function latestRejectReason(
  db: ReturnType<typeof createAdminClient>,
  orderId: string
): Promise<string | null> {
  const { data } = await db
    .from("bank_transfer_receipts")
    .select("reject_reason, reviewed_at")
    .eq("order_id", orderId)
    .eq("status", "rejected")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as any)?.reject_reason ?? null;
}

function lastError(results: NotifyChannelResult[]): string {
  return (
    results
      .filter((r) => r.status === "failed" && r.error)
      .map((r) => `${r.channel}: ${r.error}`)
      .join("; ") || "Unknown error"
  );
}

/** Resolve an order's recipient, totals, items and the tokenized view link. */
async function buildPayload(
  db: ReturnType<typeof createAdminClient>,
  orderId: string,
  status: OrderStatus
): Promise<OrderNotificationPayload | null> {
  const { data: o } = await db
    .from("orders")
    .select(
      "order_number, user_id, guest_email, guest_phone, address_snapshot, fulfillment_type, delivery_date, subtotal, delivery_fee, discount_amount, loyalty_discount, loyalty_points_used, tax_amount, total, order_items(product_snapshot, options, quantity, line_total), user:users(name, phone)"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return null;
  const row = o as any;

  // Email: guest_email, else the customer's auth email (users table has none).
  let email: string | null = row.guest_email ?? null;
  if (!email && row.user_id) {
    const { data: authUser } = await db.auth.admin.getUserById(row.user_id);
    email = authUser?.user?.email ?? null;
  }

  const snapshot = (row.address_snapshot ?? {}) as Record<string, any>;
  const phone: string | null = row.guest_phone ?? row.user?.phone ?? snapshot.phone ?? null;
  const recipientName: string | null = snapshot.recipient ?? row.user?.name ?? null;

  const items = ((row.order_items ?? []) as any[]).map((it) => ({
    name: it.product_snapshot?.name ?? "Item",
    sizeLabel: it.options?.size?.label ?? null,
    quantity: Number(it.quantity ?? 1),
    lineTotal: Number(it.line_total ?? 0),
  }));

  // Universal tokenized "View Order" link — opens read-only without login.
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const token = signOrderToken(row.order_number);
  const viewOrderUrl = `${base}/orders/${encodeURIComponent(row.order_number)}?t=${token}`;

  return {
    orderNumber: row.order_number,
    status,
    email,
    phone,
    recipientName,
    items,
    subtotal: Number(row.subtotal ?? 0),
    deliveryFee: Number(row.delivery_fee ?? 0),
    discount: Number(row.discount_amount ?? 0),
    loyaltyDiscount: Number(row.loyalty_discount ?? 0),
    tax: Number(row.tax_amount ?? 0),
    total: Number(row.total ?? 0),
    fulfillmentType: row.fulfillment_type === "pickup" ? "pickup" : "delivery",
    deliveryDate: row.delivery_date ?? null,
    viewOrderUrl,
  };
}
