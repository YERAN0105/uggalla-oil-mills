// Notification orchestrator — Phase 6 (Part A).
//
// `notify(event, payload)` fans out to email + WhatsApp, returns a per-channel
// result, and best-effort logs each attempt to the existing `notification_logs`
// audit table. Email uses the branded React Email template
// (emails/OrderStatusEmail). It is intentionally scoped to the order-status events
// needed by the debounced dispatcher; Phase 6 extends this with the full event set
// (order_placed, payment_received, bulk_quote_sent, welcome, …) and a real
// WhatsApp sender.
//
// This module does NOT decide whether to send (forward-only / idempotency rules
// live in the dispatcher) and does NOT touch `order_notification_ledger`.

import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { brand, formatCurrency } from "@/lib/brand";
import type { OrderStatus } from "@/lib/orders/status";
import { OrderStatusEmail, type OrderEmailItem } from "@/emails/OrderStatusEmail";
import { sendEmail } from "./email";
import { sendWhatsAppTemplate } from "./whatsapp";

/**
 * Notification events implemented in Part A. `order_placed` is the immediate
 * confirmation sent at checkout (not debounced); the rest are the debounced
 * order-status changes driven by the dispatcher.
 */
export type OrderStatusEvent =
  | "order_placed"
  | "order_confirmed"
  | "order_in_preparation"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "order_delivered"
  | "order_cancelled"
  | "order_refunded"
  // Bank-receipt decisions (separate two-way track; may send a correction).
  | "bank_receipt_approved"
  | "bank_receipt_rejected";

/** Map an order status to its notification event. `null` = not notifiable. */
export function eventForStatus(status: string): OrderStatusEvent | null {
  switch (status) {
    case "confirmed":
      return "order_confirmed";
    case "preparing":
      return "order_in_preparation";
    case "out_for_delivery":
      return "out_for_delivery";
    case "ready_for_pickup":
      return "ready_for_pickup";
    case "delivered":
      return "order_delivered";
    case "cancelled":
      return "order_cancelled";
    case "refunded":
      return "order_refunded";
    // pending_confirmation is the immediate "order placed" email — excluded here.
    default:
      return null;
  }
}

export interface OrderNotificationPayload {
  orderNumber: string;
  status: OrderStatus;
  email: string | null;
  phone: string | null;
  recipientName: string | null;
  items: OrderEmailItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  loyaltyDiscount: number;
  tax: number;
  total: number;
  fulfillmentType: "delivery" | "pickup";
  deliveryDate: string | null;
  /** Time-slot label (delivery/pickup window) — used by the WhatsApp templates. */
  slotLabel?: string | null;
  /** Universal tokenized "View Order" link (works logged-out via the order token). */
  viewOrderUrl: string;
  /** Optional context, e.g. a cancellation/refund or receipt-reject reason. */
  note?: string | null;
  /**
   * When true, this email contradicts what the customer was last told (a genuine
   * later reversal), so it opens with an apology. Only the receipt track sets it.
   */
  correction?: boolean;
}

export type NotifyChannel = "email" | "whatsapp";
export interface NotifyChannelResult {
  channel: NotifyChannel;
  status: "sent" | "failed" | "skipped";
  error?: string;
}

const CONTENT: Record<OrderStatusEvent, { heading: string; message: string }> = {
  order_placed: {
    heading: "Thank you for your order!",
    message:
      "We've received your order and it's awaiting confirmation. We'll notify you as soon as it's confirmed.",
  },
  order_confirmed: {
    heading: "Your order is confirmed",
    message: "Good news — we've confirmed your order and we're getting it ready.",
  },
  order_in_preparation: {
    heading: "We're preparing your order",
    message: "Our team is preparing your order with care.",
  },
  out_for_delivery: {
    heading: "Your order is out for delivery",
    message: "Your order is on its way to you.",
  },
  ready_for_pickup: {
    heading: "Your order is ready for pickup",
    message: "Your order is ready and waiting for you to collect.",
  },
  order_delivered: {
    heading: "Your order has been delivered",
    message: "Your order has been delivered. We hope you enjoy it!",
  },
  order_cancelled: {
    heading: "Your order has been cancelled",
    message: "Your order has been cancelled. If this is unexpected, please get in touch.",
  },
  order_refunded: {
    heading: "Your order has been refunded",
    message: "Your order has been refunded. The amount will be returned per your original payment method.",
  },
  bank_receipt_approved: {
    heading: "Payment approved",
    message: "We've verified your bank transfer and your order is now confirmed. Thank you!",
  },
  bank_receipt_rejected: {
    heading: "We couldn't verify your receipt",
    message:
      "We weren't able to verify your bank transfer receipt. Please re-upload it from your order page so we can confirm your order.",
  },
};

function plainText(content: { heading: string; message: string }, p: OrderNotificationPayload): string {
  const hi = p.recipientName ? `Hi ${p.recipientName},` : "Hello,";
  const lines = [hi, "", content.heading, content.message];
  if (p.note) lines.push("", p.note);
  lines.push(
    "",
    `Order: ${p.orderNumber}`,
    `Total: ${formatCurrency(Number(p.total))}`,
    "",
    `View your order: ${p.viewOrderUrl}`,
    "",
    `— ${brand.name}`
  );
  return lines.join("\n");
}

/** Coerce a value into a non-empty, single-line WhatsApp template variable. */
function waText(s: string | null | undefined, fallback: string): string {
  const v = (s ?? "").replace(/\s+/g, " ").trim();
  return v || fallback;
}

/**
 * Map an order-status event to its approved WhatsApp template + body variables.
 * Business-initiated WhatsApp messages must use approved templates (free-form text
 * isn't delivered), so each event sends its template. Returns null when there's no
 * template for the event (→ WhatsApp skipped, email still sent).
 */
function whatsAppForEvent(
  event: OrderStatusEvent,
  p: OrderNotificationPayload
): { templateName: string; bodyParams: string[] } | null {
  const name = waText(p.recipientName, "there");
  const orderNo = p.orderNumber;
  const total = formatCurrency(Number(p.total));
  const date = waText(p.deliveryDate, "soon");
  // Delivery/pickup window = date + time-slot label.
  const window = waText([p.deliveryDate, p.slotLabel].filter(Boolean).join(", "), "shortly");
  // Reason for cancel/reject — strip any "Reason: " prefix the dispatcher added.
  const reason = waText((p.note ?? "").replace(/^reason:\s*/i, ""), "Please contact us for details.");

  switch (event) {
    case "order_placed":
      return { templateName: "order_confirmation", bodyParams: [name, orderNo, total, date] };
    case "order_confirmed":
      return { templateName: "order_confirmed", bodyParams: [name, orderNo] };
    case "order_in_preparation":
      return { templateName: "order_preparation", bodyParams: [name, orderNo] };
    case "out_for_delivery":
      return { templateName: "out_for_delivery", bodyParams: [name, orderNo, window] };
    case "ready_for_pickup":
      return { templateName: "ready_for_pickup", bodyParams: [name, orderNo, window] };
    case "order_delivered":
      return { templateName: "order_delivered", bodyParams: [name, orderNo] };
    case "order_cancelled":
      return { templateName: "order_cancelled", bodyParams: [name, orderNo, reason] };
    case "order_refunded":
      return { templateName: "order_refunded", bodyParams: [name, orderNo] };
    case "bank_receipt_approved":
      return { templateName: "payment_received", bodyParams: [name, orderNo] };
    case "bank_receipt_rejected":
      return { templateName: "bank_receipt_rejected", bodyParams: [name, orderNo, reason] };
    default:
      return null;
  }
}

/**
 * Send an order-status notification across all channels. Fire-and-forget at the
 * channel level (Promise.allSettled); returns a result per channel so the caller
 * (the dispatcher) can decide success vs. retry. Logs every attempt to
 * `notification_logs` (best-effort; logging never throws).
 */
export async function notify(
  event: OrderStatusEvent,
  payload: OrderNotificationPayload
): Promise<NotifyChannelResult[]> {
  const base = CONTENT[event];
  // A correction (genuine later reversal) opens with an apology.
  const content = payload.correction
    ? {
        heading: base.heading,
        message: `Apologies for the earlier update — there's been a change to your order. ${base.message}`,
      }
    : base;
  const subject = `${content.heading} — ${payload.orderNumber}`;
  const text = plainText(content, payload);

  const tasks: Promise<NotifyChannelResult>[] = [];

  // Email — branded React Email template.
  tasks.push(
    (async (): Promise<NotifyChannelResult> => {
      if (!payload.email) return { channel: "email", status: "skipped", error: "No email on file" };
      const react = createElement(OrderStatusEmail, {
        recipientName: payload.recipientName,
        orderNumber: payload.orderNumber,
        heading: content.heading,
        message: content.message,
        note: payload.note ?? null,
        items: payload.items,
        subtotal: payload.subtotal,
        deliveryFee: payload.deliveryFee,
        discount: payload.discount,
        loyaltyDiscount: payload.loyaltyDiscount,
        tax: payload.tax,
        total: payload.total,
        fulfillmentType: payload.fulfillmentType,
        deliveryDate: payload.deliveryDate,
        viewOrderUrl: payload.viewOrderUrl,
        shopEmail: brand.email,
        shopPhone: brand.phone,
      });
      const r = await sendEmail({ to: payload.email, subject, react, text });
      if (r.ok) return { channel: "email", status: "sent" };
      return { channel: "email", status: r.skipped ? "skipped" : "failed", error: r.error };
    })()
  );

  // WhatsApp — approved template per event (free-form text isn't delivered for
  // business-initiated messages). Gated by isWhatsAppEnabled inside the sender.
  tasks.push(
    (async (): Promise<NotifyChannelResult> => {
      if (!payload.phone) return { channel: "whatsapp", status: "skipped", error: "No phone on file" };
      const tmpl = whatsAppForEvent(event, payload);
      if (!tmpl) return { channel: "whatsapp", status: "skipped", error: "No WhatsApp template for event" };
      const r = await sendWhatsAppTemplate({
        to: payload.phone,
        templateName: tmpl.templateName,
        bodyParams: tmpl.bodyParams,
      });
      if (r.ok) return { channel: "whatsapp", status: "sent" };
      return { channel: "whatsapp", status: r.skipped ? "skipped" : "failed", error: r.error };
    })()
  );

  const settled = await Promise.allSettled(tasks);
  const results: NotifyChannelResult[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          channel: i === 0 ? "email" : "whatsapp",
          status: "failed",
          error: s.reason instanceof Error ? s.reason.message : String(s.reason),
        }
  );

  await logAttempts(event, payload, results);
  return results;
}

async function logAttempts(
  event: OrderStatusEvent,
  payload: OrderNotificationPayload,
  results: NotifyChannelResult[]
): Promise<void> {
  try {
    const db = createAdminClient();
    const rows = results.map((r) => ({
      event,
      channel: r.channel,
      recipient: (r.channel === "email" ? payload.email : payload.phone) ?? "unknown",
      status: r.status,
      error: r.error ?? null,
      payload: { order_number: payload.orderNumber, status: payload.status },
      // idempotency_key left null on purpose: the dispatcher's ledger is the real
      // dedupe; keeping it null lets us log one audit row per attempt.
      idempotency_key: null,
    }));
    await db.from("notification_logs").insert(rows);
  } catch {
    // Audit logging is best-effort; never block or fail a send because of it.
  }
}
