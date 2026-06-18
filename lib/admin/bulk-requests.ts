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
import { normalizeBulkItems, summarizeBulkItems } from "@/lib/bulk/items";
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

  // Once a request has become a real order, the quote is settled — block re-quoting
  // (a price change at that point is an order-level change, not a new quote).
  const { data: existing } = await db
    .from("bulk_requests")
    .select("converted_order_id, items")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Request not found." };
  if ((existing as { converted_order_id: string | null }).converted_order_id) {
    return {
      ok: false,
      error: "This request has already been converted to an order — manage the order instead of re-quoting.",
    };
  }

  // A single unit price is only meaningful for a one-product request. For a
  // multi-product request there is no single per-unit number, so never store one
  // (the quote is a single grand total). Final authority — don't trust the client.
  const existingItems = (existing as { items: unknown }).items;
  const itemCount = Array.isArray(existingItems) ? existingItems.length : 0;
  const unitPrice = itemCount > 1 ? null : input.unitPrice ?? null;

  const update: Record<string, unknown> = {
    quoted_unit_price: unitPrice,
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

  // Notify the customer with the quote (email + WhatsApp). The pay-online link is
  // included only for online quotes. Fire-and-forget — never fail the quote send.
  try {
    const { data: br } = await db
      .from("bulk_requests")
      .select("name, email, phone, quantity, unit, product_id, items, product:products(name)")
      .eq("id", id)
      .maybeSingle();
    if (br) {
      const row = br as any;
      const items = normalizeBulkItems(row.items, {
        product_id: row.product_id ?? null,
        name: row.product?.name ?? null,
        quantity: Number(row.quantity ?? 0),
        unit: row.unit ?? "litres",
      });
      const { sendBulkQuoteSent } = await import("@/lib/notifications/transactional");
      await sendBulkQuoteSent({
        name: row.name ?? null,
        email: row.email ?? null,
        phone: row.phone ?? null,
        items,
        quotedTotal: input.total,
        message: input.message || null,
        payLink: quoteLink,
      });
    }
  } catch (err) {
    console.error("[sendQuote] notification failed:", err);
  }

  return { ok: true, data: { quoteLink } };
}

function generateOrderNumber(): string {
  const stamp = formatInColombo(new Date(), "yyyyMMdd");
  const rand = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `UOM-${stamp}-${rand}`;
}

/** Offline payment methods an admin can assign when converting a bulk request. */
const CONVERT_METHODS = ["cod", "bank_transfer"] as const;
export type ConvertPaymentMethod = (typeof CONVERT_METHODS)[number];

/**
 * Convert an accepted bulk request into a tracked order — created the SAME way a
 * normal checkout order is, so it flows through all the shared payment/status/
 * notification logic and the various order views stay consistent.
 *
 * The admin picks the offline payment method:
 *   - "cod"           → pay on hand-over (shown as "Cash on Delivery" for delivery
 *                       orders, "Pay at Store" for pickup — by the shared label).
 *   - "bank_transfer" → awaiting bank transfer, same handling as a normal order.
 *
 * Like checkout, the order starts at `pending_confirmation`, payment_status is set
 * the same way checkout sets it, and an "order placed" email is sent inline. The
 * admin then advances it through the normal timeline (confirmed → … → delivered),
 * with those notifications going out via the normal debounced dispatcher.
 *
 * The bulk request moves to `accepted` (an order now exists for it); it only
 * becomes `completed` once that order is marked delivered (see updateOrderStatus).
 */
export async function convertBulkToOrder(
  id: string,
  paymentMethod: ConvertPaymentMethod = "cod"
): Promise<ActionResult<{ orderNumber: string }>> {
  const admin = await requireAdmin();
  if (!CONVERT_METHODS.includes(paymentMethod)) {
    return { ok: false, error: "Invalid payment method." };
  }
  const db = createAdminClient();

  const { data: br } = await db.from("bulk_requests").select("*").eq("id", id).maybeSingle();
  if (!br) return { ok: false, error: "Request not found." };
  const row = br as any;
  if (row.converted_order_id) return { ok: false, error: "Already converted to an order." };
  if (!row.quoted_total) return { ok: false, error: "Send a quote before converting." };

  const productName = row.product_id
    ? (await db.from("products").select("name").eq("id", row.product_id).maybeSingle()).data?.name
    : null;
  // The request can carry multiple product lines; the converted order keeps ONE
  // summarizing line at the quoted total (per the pricing model). The line's name
  // is a short header ("Bulk order") and the product list lives in the size field,
  // so the two never repeat each other on the packing slip / invoice / email.
  const items = normalizeBulkItems(row.items, {
    product_id: row.product_id ?? null,
    name: productName ?? null,
    quantity: Number(row.quantity) || 0,
    unit: row.unit,
  });
  const label = "Bulk order";
  const itemsSummary = summarizeBulkItems(items);

  const orderNumber = generateOrderNumber();
  const total = Number(row.quoted_total) || 0;
  const fulfillmentType = row.fulfillment_type === "pickup" ? "pickup" : "delivery";
  // Same payment_status mapping checkout uses for these methods.
  const paymentStatus = paymentMethod === "cod" ? "cod" : "pending_transfer";

  // Snapshot the quote message + internal note onto the order's admin-only notes,
  // taken at conversion. (The customer note goes to `notes` below.) After this, the
  // order is the live place for notes; the bulk request's note is frozen.
  //
  // The order's notes card stores one note per line as "[time] author: text". The
  // bulk request's internal notes are ALREADY in that format, so we carry them over
  // as-is (each stays its own clean bullet). The quote message is free-form and may
  // span several lines, so we keep it on ONE stored line but preserve its line
  // breaks by encoding each newline as U+2028 (a line separator that is NOT "\n",
  // so it survives the line-based parser). The notes renderer turns them back into
  // real line breaks. Outer whitespace is trimmed and trailing spaces dropped.
  const encodeMultiline = (s: string) =>
    s.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim().replace(/\n/g, " ");
  const stamp = new Date().toISOString();
  // All authored "Bulk request" so the order's notes card renders them in a
  // visually distinct, clearly-labelled group, separate from notes added later.
  const parts: string[] = [];
  if (row.quote_message)
    parts.push(`[${stamp}] Bulk request: Quote message to customer — ${encodeMultiline(row.quote_message)}`);
  // The bulk internal notes are stored one "[time] author: text" per line. Carry
  // EACH note over as its own line → its own inner card, so multiple notes stay
  // clearly separated (never merged onto one line).
  if (row.internal_notes) {
    for (const line of String(row.internal_notes).split("\n")) {
      const text = line.replace(/^\[[^\]]+\]\s*[^:]+:\s*/, "").trim();
      if (text) parts.push(`[${stamp}] Bulk request: Internal note — ${text}`);
    }
  }
  const internalNotesSnapshot = parts.length ? parts.join("\n") : null;

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: row.user_id,
      guest_email: row.user_id ? null : row.email,
      guest_phone: row.user_id ? null : row.phone,
      status: "pending_confirmation",
      fulfillment_type: fulfillmentType,
      address_snapshot: row.address_snapshot,
      delivery_date: row.preferred_date,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      subtotal: total,
      delivery_fee: 0,
      discount_amount: 0,
      tax_amount: 0,
      total,
      source: "bulk_conversion",
      notes: row.notes,
      internal_notes: internalNotesSnapshot,
      // Customer-facing snapshot of the quote message (price breakdown etc.) —
      // shown on the order page, invoices and price emails. Only set here (and in
      // acceptQuote); normal checkout orders leave it null.
      quote_note: row.quote_message ?? null,
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
      size: { id: null, label: itemsSummary, volume_ml: null, price: total },
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
    status: "pending_confirmation",
    note: "Order placed (from bulk request)",
    changed_by: admin.id,
  });

  // An order now exists for this request — mark it accepted (NOT completed). It
  // becomes completed when that order is delivered (see updateOrderStatus).
  await db
    .from("bulk_requests")
    .update({ converted_order_id: (order as any).id, status: "accepted" })
    .eq("id", id);

  // Immediate "order placed" email — exactly like checkout. pending_confirmation
  // is excluded from the debounced dispatcher, so this is the only first-touch
  // email; later status changes notify via the normal debounced flow. Best-effort.
  try {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const viewOrderUrl = `${base}/orders/${encodeURIComponent(orderNumber)}?t=${signOrderToken(orderNumber)}`;
    await notify("order_placed", {
      orderNumber,
      status: "pending_confirmation",
      email: row.email ?? null,
      phone: row.phone ?? null,
      recipientName: row.name ?? null,
      quoteNote: row.quote_message ?? null,
      items: [{ name: label, sizeLabel: itemsSummary, quantity: 1, lineTotal: total }],
      subtotal: total,
      deliveryFee: 0,
      discount: 0,
      loyaltyDiscount: 0,
      tax: 0,
      total,
      fulfillmentType,
      deliveryDate: row.preferred_date ?? null,
      viewOrderUrl,
    });
  } catch (err) {
    console.error("[convertBulkToOrder] order-placed notify failed:", err);
  }

  await logActivity(admin.id, {
    action: "bulk.converted",
    targetTable: "bulk_requests",
    targetId: id,
    metadata: { order_number: orderNumber, payment_method: paymentMethod },
  });
  revalidate(id);
  revalidatePath("/admin/orders");
  return { ok: true, data: { orderNumber } };
}
