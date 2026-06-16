"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { isPayHereEnabled } from "@/lib/integrations";
import { notify } from "@/lib/notifications";
import { signOrderToken } from "@/lib/orders/token";
import { formatInColombo } from "@/lib/date";
import { addDays } from "date-fns";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VALID = ["new", "in_progress", "quoted", "accepted", "rejected", "completed"];

function revalidate(id?: string) {
  revalidatePath("/admin/bulk-requests");
  revalidatePath("/admin");
  if (id) revalidatePath(`/admin/bulk-requests/${id}`);
}

export async function updateBulkStatus(id: string, status: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!VALID.includes(status)) return { ok: false, error: "Invalid status." };
  const db = createAdminClient();
  const { error } = await db.from("bulk_requests").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "bulk.status_change", targetTable: "bulk_requests", targetId: id, metadata: { status } });
  revalidate(id);
  return { ok: true };
}

export async function saveBulkInternalNote(id: string, note: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: row } = await db
    .from("bulk_requests")
    .select("internal_notes")
    .eq("id", id)
    .maybeSingle();
  if (!row) return { ok: false, error: "Request not found." };
  const stamp = new Date().toISOString();
  const line = `[${stamp}] ${admin.name || admin.email}: ${note.trim()}`;
  const combined = (row as any).internal_notes ? `${(row as any).internal_notes}\n${line}` : line;
  const { error } = await db.from("bulk_requests").update({ internal_notes: combined }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate(id);
  return { ok: true };
}

/**
 * Send a quote: store pricing + message + payment mode, set status `quoted`.
 * When the mode is `online` (and PayHere is configured) generate a secure quote
 * token + 7-day expiry for the public `/quote/[token]` page (built in Phase 6).
 * Notifications are stubbed until Phase 6; the link is returned so it's copyable.
 */
export async function sendQuote(
  id: string,
  input: {
    unitPrice: number | null;
    total: number;
    message: string;
    paymentMode: "offline" | "online";
  }
): Promise<ActionResult<{ quoteLink: string | null }>> {
  const admin = await requireAdmin();
  if (!(input.total > 0)) return { ok: false, error: "Enter a quote total greater than zero." };

  const db = createAdminClient();
  const update: Record<string, unknown> = {
    quoted_unit_price: input.unitPrice ?? null,
    quoted_total: input.total,
    quote_message: input.message || null,
    status: "quoted",
  };

  let quoteLink: string | null = null;
  // Online payment only when PayHere is configured; otherwise force offline.
  if (input.paymentMode === "online" && isPayHereEnabled) {
    const token = crypto.randomBytes(24).toString("hex");
    update.payment_mode = "online";
    update.quote_token = token;
    update.quote_expires_at = addDays(new Date(), 7).toISOString();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    quoteLink = `${appUrl}/quote/${token}`;
  } else {
    update.payment_mode = "offline";
    update.quote_token = null;
    update.quote_expires_at = null;
  }

  const { error } = await db.from("bulk_requests").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity(admin.id, {
    action: "bulk.quote_sent",
    targetTable: "bulk_requests",
    targetId: id,
    metadata: { total: input.total, payment_mode: update.payment_mode },
  });
  revalidate(id);
  // TODO (Phase 6): fire email + WhatsApp notifications with the quote/link.
  return { ok: true, data: { quoteLink } };
}

function generateOrderNumber(): string {
  const stamp = formatInColombo(new Date(), "yyyyMMdd");
  const rand = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `UOM-${stamp}-${rand}`;
}

/**
 * Convert an accepted bulk request into a tracked order with a single custom
 * bulk line item. Payment status is recorded manually by the admin afterwards.
 */
export async function convertBulkToOrder(id: string): Promise<ActionResult<{ orderNumber: string }>> {
  const admin = await requireAdmin();
  const db = createAdminClient();

  const { data: br } = await db.from("bulk_requests").select("*").eq("id", id).maybeSingle();
  if (!br) return { ok: false, error: "Request not found." };
  const row = br as any;
  if (row.converted_order_id) return { ok: false, error: "Already converted to an order." };
  if (!row.quoted_total) return { ok: false, error: "Send a quote before converting." };

  const productName = row.product_id
    ? (await db.from("products").select("name").eq("id", row.product_id).maybeSingle()).data?.name
    : null;
  const label = `Bulk: ${productName ?? "Loose coconut oil"} — ${row.quantity} ${row.unit}`;

  const orderNumber = generateOrderNumber();
  const total = Number(row.quoted_total) || 0;

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: row.user_id,
      guest_email: row.user_id ? null : row.email,
      guest_phone: row.user_id ? null : row.phone,
      status: "confirmed",
      fulfillment_type: row.fulfillment_type,
      address_snapshot: row.address_snapshot,
      delivery_date: row.preferred_date,
      payment_method: row.payment_mode === "online" ? "payhere" : "bank_transfer",
      payment_status: "pending",
      subtotal: total,
      delivery_fee: 0,
      discount_amount: 0,
      tax_amount: 0,
      total,
      source: "bulk_conversion",
      notes: row.notes,
    })
    .select("id, order_number")
    .single();
  if (orderErr || !order) return { ok: false, error: orderErr?.message ?? "Could not create order." };

  await db.from("order_items").insert({
    order_id: (order as any).id,
    product_id: row.product_id,
    product_snapshot: {
      name: label,
      brand: null,
      slug: "",
      image: null,
    },
    options: {
      size: { id: null, label: `${row.quantity} ${row.unit}`, volume_ml: null, price: total },
      quantity: 1,
      note: "",
      is_subscription: false,
      subscription_interval: null,
    },
    quantity: 1,
    unit_price: total,
    line_total: total,
  });

  await db.from("order_status_history").insert({
    order_id: (order as any).id,
    status: "confirmed",
    note: "Created from bulk request",
    changed_by: admin.id,
  });

  await db
    .from("bulk_requests")
    .update({ converted_order_id: (order as any).id, status: "completed" })
    .eq("id", id);

  // This order is created already-confirmed (not a fat-finger-prone transition),
  // so it gets an IMMEDIATE confirmation — it does NOT go through the debounce
  // buffer. Record the send in the ledger so the debounced dispatcher will never
  // re-send "confirmed" for this order. Best-effort; never blocks the conversion.
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const viewOrderUrl = `${base}/orders/${encodeURIComponent(orderNumber)}?t=${signOrderToken(orderNumber)}`;
    const results = await notify("order_confirmed", {
      orderNumber,
      status: "confirmed",
      email: row.email ?? null,
      phone: row.phone ?? null,
      recipientName: row.name ?? null,
      items: [{ name: label, sizeLabel: `${row.quantity} ${row.unit}`, quantity: 1, lineTotal: total }],
      subtotal: total,
      deliveryFee: 0,
      discount: 0,
      loyaltyDiscount: 0,
      tax: 0,
      total,
      fulfillmentType: row.fulfillment_type === "pickup" ? "pickup" : "delivery",
      deliveryDate: row.preferred_date ?? null,
      viewOrderUrl,
    });
    const sentChannels = results.filter((r) => r.status === "sent");
    if (sentChannels.length > 0) {
      await db.from("order_notification_ledger").upsert(
        sentChannels.map((r) => ({
          order_id: (order as any).id,
          status: "confirmed",
          channel: r.channel,
        })),
        { onConflict: "order_id,status,channel", ignoreDuplicates: true }
      );
    }
  } catch (err) {
    console.error("[convertBulkToOrder] confirmation notify failed:", err);
  }

  await logActivity(admin.id, {
    action: "bulk.converted",
    targetTable: "bulk_requests",
    targetId: id,
    metadata: { order_number: orderNumber },
  });
  revalidate(id);
  revalidatePath("/admin/orders");
  return { ok: true, data: { orderNumber } };
}
