"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { earnLoyaltyForOrder, reverseLoyaltyForOrder } from "@/lib/loyalty/engine";
import { enqueueOrderNotification, enqueueReceiptNotification } from "@/lib/notifications/pending";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VALID_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "refunded",
];

function revalidateOrders(orderNumber?: string) {
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/payments/pending");
  if (orderNumber) revalidatePath(`/admin/orders/${orderNumber}`);
}

/**
 * Advance/change an order's status. Writes a status-history row, runs the
 * loyalty earn hook on `delivered`, reverses it on cancel-after-delivery, and
 * settles COD payment on delivery. Returns earned points so the UI can toast.
 */
export async function updateOrderStatus(
  orderId: string,
  status: string,
  note?: string
): Promise<ActionResult<{ earnedPoints: number }>> {
  const admin = await requireAdmin();
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };

  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, status, payment_method, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  const prevStatus = (order as any).status as string;
  if (prevStatus === status) return { ok: true, data: { earnedPoints: 0 } };

  const update: Record<string, unknown> = { status };

  // Settle COD on delivery.
  if (
    status === "delivered" &&
    (order as any).payment_method === "cod" &&
    (order as any).payment_status === "cod"
  ) {
    update.payment_status = "paid";
  }
  // A paid order that gets cancelled/refunded → mark refunded.
  if ((status === "cancelled" || status === "refunded") && (order as any).payment_status === "paid") {
    update.payment_status = "refunded";
  }

  const { error } = await db.from("orders").update(update).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await db.from("order_status_history").insert({
    order_id: orderId,
    status,
    note: note || null,
    changed_by: admin.id,
  });

  let earnedPoints = 0;
  if (status === "delivered") {
    earnedPoints = await earnLoyaltyForOrder(orderId);
    // A bulk request is only "completed" once its converted order is delivered.
    // No-op for normal orders (none reference them via converted_order_id).
    await db.from("bulk_requests").update({ status: "completed" }).eq("converted_order_id", orderId);
  }
  // Reverse loyalty if a previously-delivered order is cancelled/refunded.
  if ((status === "cancelled" || status === "refunded") && prevStatus === "delivered") {
    await reverseLoyaltyForOrder(orderId);
  }

  // Buffer the customer notification (debounced + forward-only; dispatched later).
  await enqueueOrderNotification(orderId, status);

  await logActivity(admin.id, {
    action: "order.status_change",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any).order_number, from: prevStatus, to: status },
  });

  revalidateOrders((order as any).order_number);
  return { ok: true, data: { earnedPoints } };
}

/** Bulk status update from the orders list. */
export async function bulkUpdateOrderStatus(
  orderIds: string[],
  status: string
): Promise<ActionResult<{ updated: number }>> {
  await requireAdmin();
  let updated = 0;
  for (const id of orderIds) {
    const res = await updateOrderStatus(id, status);
    if (res.ok) updated += 1;
  }
  return { ok: true, data: { updated } };
}

/** Mark an order paid (manual / bank / cod settlement). */
export async function markOrderPaid(orderId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  const { error } = await db.from("orders").update({ payment_status: "paid" }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await logActivity(admin.id, {
    action: "order.mark_paid",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any).order_number },
  });
  revalidateOrders((order as any).order_number);
  return { ok: true };
}

export async function bulkMarkPaid(orderIds: string[]): Promise<ActionResult<{ updated: number }>> {
  await requireAdmin();
  let updated = 0;
  for (const id of orderIds) {
    const res = await markOrderPaid(id);
    if (res.ok) updated += 1;
  }
  return { ok: true, data: { updated } };
}

/** Append a timestamped internal note (admin-only) to an order. */
export async function addInternalNote(orderId: string, note: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const text = note.trim();
  if (!text) return { ok: false, error: "Note cannot be empty." };

  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, internal_notes")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${admin.name || admin.email}: ${text}`;
  const existing = (order as any).internal_notes as string | null;
  const combined = existing ? `${existing}\n${line}` : line;

  const { error } = await db.from("orders").update({ internal_notes: combined }).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await logActivity(admin.id, {
    action: "order.note_added",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any).order_number },
  });
  revalidateOrders((order as any).order_number);
  return { ok: true };
}

/** Cancel an order with a reason (reverses stock-tracked products + loyalty). */
export async function cancelOrderAdmin(orderId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if ((order as any).status === "cancelled") return { ok: false, error: "Already cancelled." };

  // Restore tracked stock.
  const { data: items } = await db
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);
  for (const it of (items as any[]) ?? []) {
    if (!it.product_id) continue;
    const { data: p } = await db
      .from("products")
      .select("stock_tracked, stock_quantity")
      .eq("id", it.product_id)
      .maybeSingle();
    if (p && (p as any).stock_tracked) {
      await db
        .from("products")
        .update({ stock_quantity: Number((p as any).stock_quantity) + Number(it.quantity) })
        .eq("id", it.product_id);
    }
  }

  const wasDelivered = (order as any).status === "delivered";
  const update: Record<string, unknown> = { status: "cancelled" };
  if ((order as any).payment_status === "paid") update.payment_status = "refunded";

  const { error } = await db.from("orders").update(update).eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await db.from("order_status_history").insert({
    order_id: orderId,
    status: "cancelled",
    note: `Cancelled by admin: ${reason}`,
    changed_by: admin.id,
  });

  // Reverse loyalty: refund redeemed points always; claw back earned if delivered.
  await reverseLoyaltyForOrder(orderId);
  void wasDelivered;

  // Remove coupon usage so the coupon can be reused.
  await db.from("coupon_usage").delete().eq("order_id", orderId);

  // Buffer the cancellation notification (terminal — notified once).
  await enqueueOrderNotification(orderId, "cancelled");

  await logActivity(admin.id, {
    action: "order.cancelled",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any).order_number, reason },
  });
  revalidateOrders((order as any).order_number);
  return { ok: true };
}

/** Mark a paid online order as refunded (record-only; gateway refund is manual). */
export async function refundOrder(orderId: string, reason: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: order } = await db
    .from("orders")
    .select("id, order_number, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };
  if ((order as any).payment_status !== "paid")
    return { ok: false, error: "Only paid orders can be refunded." };

  const { error } = await db
    .from("orders")
    .update({ payment_status: "refunded", status: "refunded" })
    .eq("id", orderId);
  if (error) return { ok: false, error: error.message };

  await db.from("order_status_history").insert({
    order_id: orderId,
    status: "refunded",
    note: `Refunded by admin: ${reason}`,
    changed_by: admin.id,
  });
  await reverseLoyaltyForOrder(orderId);

  // Buffer the refund notification (terminal — notified once).
  await enqueueOrderNotification(orderId, "refunded");

  await logActivity(admin.id, {
    action: "order.refunded",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any).order_number, reason },
  });
  revalidateOrders((order as any).order_number);
  return { ok: true };
}

/** Approve a pending bank-transfer receipt → mark paid + confirm order. */
export async function approveBankTransfer(receiptId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: receipt } = await db
    .from("bank_transfer_receipts")
    .select("id, order_id, status")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt) return { ok: false, error: "Receipt not found." };

  const orderId = (receipt as any).order_id as string;
  const { data: order } = await db
    .from("orders")
    .select("order_number, status")
    .eq("id", orderId)
    .maybeSingle();

  await db
    .from("bank_transfer_receipts")
    .update({ status: "approved", reviewed_by: admin.id, reviewed_at: new Date().toISOString() })
    .eq("id", receiptId);

  const orderUpdate: Record<string, unknown> = { payment_status: "paid" };
  if ((order as any)?.status === "pending_confirmation") orderUpdate.status = "confirmed";
  await db.from("orders").update(orderUpdate).eq("id", orderId);

  if ((order as any)?.status === "pending_confirmation") {
    await db.from("order_status_history").insert({
      order_id: orderId,
      status: "confirmed",
      note: "Bank transfer approved",
      changed_by: admin.id,
    });
  }

  // Buffer the receipt-approved notification (debounced; the receipt track also
  // serves as the order's confirmation email, so we don't enqueue "confirmed").
  await enqueueReceiptNotification(orderId, "approved", receiptId);

  await logActivity(admin.id, {
    action: "payment.bank_approved",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any)?.order_number },
  });
  revalidateOrders((order as any)?.order_number);
  return { ok: true };
}

/** Build a CSV string of orders matching the current filters (for download). */
export async function exportOrdersCsv(filters: {
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}): Promise<ActionResult<{ csv: string }>> {
  await requireAdmin();
  const db = createAdminClient();
  let query = db
    .from("orders")
    .select(
      "order_number, created_at, total, payment_method, payment_status, status, fulfillment_type, guest_email, guest_phone, user:users(name, phone)"
    )
    .order("created_at", { ascending: false })
    .limit(5000);

  if (filters.status) {
    const statuses = filters.status.split(",").filter(Boolean);
    if (statuses.length) query = query.in("status", statuses);
  }
  if (filters.paymentMethod) query = query.eq("payment_method", filters.paymentMethod);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.fulfillment) query = query.eq("fulfillment_type", filters.fulfillment);
  if (filters.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters.dateTo) query = query.lte("created_at", `${filters.dateTo}T23:59:59`);
  if (filters.search) {
    const like = `%${filters.search}%`;
    query = query.or(`order_number.ilike.${like},guest_email.ilike.${like},guest_phone.ilike.${like}`);
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = [
    "Order number",
    "Date",
    "Customer",
    "Phone",
    "Total",
    "Payment method",
    "Payment status",
    "Status",
    "Fulfillment",
  ];
  const lines = [header.map(esc).join(",")];
  for (const o of (data as any[]) ?? []) {
    lines.push(
      [
        o.order_number,
        o.created_at,
        o.user?.name || o.guest_email || "Guest",
        o.user?.phone || o.guest_phone || "",
        o.total,
        o.payment_method,
        o.payment_status,
        o.status,
        o.fulfillment_type,
      ]
        .map(esc)
        .join(",")
    );
  }
  return { ok: true, data: { csv: lines.join("\n") } };
}

/**
 * Undo a bank-transfer decision (e.g. an accidental approve/reject): reopens the
 * receipt for review, reverts `payment_status` to `pending_transfer` if it was
 * marked paid here, and rolls the order back to `pending_confirmation` if the
 * approval had auto-advanced it to `confirmed`. Logged for the audit trail.
 */
export async function revertBankTransfer(receiptId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();

  const { data: receipt } = await db
    .from("bank_transfer_receipts")
    .select("id, order_id, status")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt) return { ok: false, error: "Receipt not found." };
  if ((receipt as any).status === "pending")
    return { ok: false, error: "This receipt is already awaiting review." };

  const orderId = (receipt as any).order_id as string;
  const { data: order } = await db
    .from("orders")
    .select("order_number, status, payment_status, payment_method")
    .eq("id", orderId)
    .maybeSingle();

  await db
    .from("bank_transfer_receipts")
    .update({ status: "pending", reviewed_by: null, reviewed_at: null, reject_reason: null })
    .eq("id", receiptId);

  const orderUpdate: Record<string, unknown> = {};
  if ((order as any)?.payment_method === "bank_transfer" && (order as any)?.payment_status === "paid") {
    orderUpdate.payment_status = "pending_transfer";
  }
  let statusReverted = false;
  if ((order as any)?.status === "confirmed") {
    orderUpdate.status = "pending_confirmation";
    statusReverted = true;
  }
  if (Object.keys(orderUpdate).length > 0) {
    await db.from("orders").update(orderUpdate).eq("id", orderId);
    if (statusReverted) {
      await db.from("order_status_history").insert({
        order_id: orderId,
        status: "pending_confirmation",
        note: "Bank transfer reopened for review",
        changed_by: admin.id,
      });
    }
  }

  // Undo of a bank decision: overwrite any pending receipt email with a "reverted"
  // no-op, so an approve/reject-then-undo within the window sends nothing.
  await enqueueReceiptNotification(orderId, "reverted", receiptId);

  await logActivity(admin.id, {
    action: "payment.bank_reverted",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any)?.order_number },
  });
  revalidateOrders((order as any)?.order_number);
  return { ok: true };
}

/** Reject a bank-transfer receipt with a reason; customer can re-upload. */
export async function rejectBankTransfer(
  receiptId: string,
  reason: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!reason.trim()) return { ok: false, error: "A reason is required." };

  const db = createAdminClient();
  const { data: receipt } = await db
    .from("bank_transfer_receipts")
    .select("id, order_id")
    .eq("id", receiptId)
    .maybeSingle();
  if (!receipt) return { ok: false, error: "Receipt not found." };

  await db
    .from("bank_transfer_receipts")
    .update({
      status: "rejected",
      reject_reason: reason,
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", receiptId);

  const orderId = (receipt as any).order_id as string;
  const { data: order } = await db
    .from("orders")
    .select("order_number")
    .eq("id", orderId)
    .maybeSingle();

  // Buffer the receipt-rejected notification (debounced; carries the reason +
  // re-upload link). Sends a correction-with-apology only if the customer was
  // already told THIS receipt was approved.
  await enqueueReceiptNotification(orderId, "rejected", receiptId);

  await logActivity(admin.id, {
    action: "payment.bank_rejected",
    targetTable: "orders",
    targetId: orderId,
    metadata: { order_number: (order as any)?.order_number, reason },
  });
  revalidateOrders((order as any)?.order_number);
  return { ok: true };
}
