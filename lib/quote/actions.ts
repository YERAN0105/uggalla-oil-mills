"use server";

import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPayHereEnabled } from "@/lib/integrations";
import { formatInColombo } from "@/lib/date";

/* eslint-disable @typescript-eslint/no-explicit-any */

function generateOrderNumber(): string {
  const stamp = formatInColombo(new Date(), "yyyyMMdd");
  const rand = crypto.randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
  return `UOM-${stamp}-${rand}`;
}

export type AcceptQuoteResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string };

/**
 * Accept an online bulk quote and create a tracked order linked to the request,
 * ready to pay via PayHere. The caller then redirects to /checkout/pay/[orderNumber].
 *
 * Re-validates everything server-side: PayHere must be configured, the token must
 * match, the quote must be unexpired and not already converted. Idempotent — if an
 * order was already created for this request, returns it instead of duplicating.
 */
export async function acceptQuote(token: string): Promise<AcceptQuoteResult> {
  if (!isPayHereEnabled) {
    return { ok: false, error: "Online payment is not available for this quote." };
  }
  if (!token || token.length < 16) return { ok: false, error: "Invalid quote link." };

  const db = createAdminClient();
  const { data: br } = await db
    .from("bulk_requests")
    .select("*")
    .eq("quote_token", token)
    .maybeSingle();
  if (!br) {
    return {
      ok: false,
      error: "This quote was updated — please use the latest link we sent you.",
    };
  }
  const row = br as any;

  if (row.payment_mode !== "online") {
    return { ok: false, error: "This quote isn't set up for online payment." };
  }
  if (row.status === "rejected") return { ok: false, error: "This quote is no longer available." };
  if (row.quote_expires_at && new Date(row.quote_expires_at).getTime() < Date.now()) {
    return { ok: false, error: "This quote link has expired. Please contact us for a new quote." };
  }

  // Already converted → return the existing order (idempotent).
  if (row.converted_order_id) {
    const { data: existing } = await db
      .from("orders")
      .select("order_number")
      .eq("id", row.converted_order_id)
      .maybeSingle();
    if (existing) return { ok: true, orderNumber: (existing as any).order_number };
  }

  if (!row.quoted_total || Number(row.quoted_total) <= 0) {
    return { ok: false, error: "This quote is incomplete. Please contact us." };
  }

  const productName = row.product_id
    ? (await db.from("products").select("name").eq("id", row.product_id).maybeSingle()).data?.name
    : null;
  const label = `Bulk: ${productName ?? "Loose coconut oil"} — ${row.quantity} ${row.unit}`;
  const total = Number(row.quoted_total);
  const orderNumber = generateOrderNumber();

  const { data: order, error: orderErr } = await db
    .from("orders")
    .insert({
      order_number: orderNumber,
      user_id: row.user_id,
      guest_email: row.user_id ? null : row.email,
      guest_phone: row.user_id ? null : row.phone,
      status: "pending_confirmation",
      fulfillment_type: row.fulfillment_type,
      address_snapshot: row.address_snapshot,
      delivery_date: row.preferred_date,
      payment_method: "payhere",
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
  if (orderErr || !order) return { ok: false, error: orderErr?.message ?? "Could not start your order." };

  await db.from("order_items").insert({
    order_id: (order as any).id,
    product_id: row.product_id,
    product_snapshot: { name: label, brand: null, slug: "", image: null },
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
    status: "pending_confirmation",
    note: "Bulk quote accepted online",
  });

  await db
    .from("bulk_requests")
    .update({ converted_order_id: (order as any).id, status: "accepted" })
    .eq("id", row.id);

  return { ok: true, orderNumber: (order as any).order_number };
}
