// WhatsApp Cloud API sender (Phase 6).
//
// Fully built against the Meta WhatsApp Cloud API, but gated behind
// `isWhatsAppEnabled`. While WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_ACCESS_TOKEN are
// blank the gate is false and every send returns `{ skipped: true }` (logged as
// "whatsapp skipped: not configured"), never throwing into the caller. The moment
// real credentials land in the env it starts sending with zero code changes.
//
// Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
// Build it fully, gate the entry point — same pattern as PayHere.

import { isWhatsAppEnabled } from "@/lib/integrations";

const GRAPH_VERSION = "v18.0";

export interface SendWhatsAppResult {
  ok: boolean;
  /** True when WhatsApp is off (no credentials) — not a failure, nothing to retry. */
  skipped?: boolean;
  error?: string;
}

/**
 * Normalise a Sri Lankan phone number to E.164 without the leading `+`
 * (`94XXXXXXXXX`) as the Cloud API expects in the `to` field. Returns null when
 * the input can't be coerced into a valid SL mobile number.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  // 0XXXXXXXXX (local) → 94XXXXXXXXX
  if (digits.startsWith("0") && digits.length === 10) digits = `94${digits.slice(1)}`;
  // 7XXXXXXXX (9 digits, no country/leading 0) → 947XXXXXXXX
  if (digits.length === 9 && digits.startsWith("7")) digits = `94${digits}`;
  // Must now be a 94 + 9-digit mobile.
  if (/^94\d{9}$/.test(digits)) return digits;
  return null;
}

/** Validate a strict E.164 SL number (`+94XXXXXXXXX`) for form inputs. */
export function isValidE164LK(value: string): boolean {
  return /^\+94\d{9}$/.test(value.trim());
}

interface GraphErrorBody {
  error?: { message?: string };
}

async function postToGraph(body: Record<string, unknown>): Promise<SendWhatsAppResult> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !token) {
    return { ok: false, skipped: true, error: "WhatsApp is not configured" };
  }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
    });
    if (!res.ok) {
      let message = `WhatsApp API returned ${res.status}`;
      try {
        const data = (await res.json()) as GraphErrorBody;
        if (data.error?.message) message = data.error.message;
      } catch {
        // ignore parse failure — keep the status-code message
      }
      return { ok: false, error: message };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send a free-form text message. Note: outside a 24-hour customer-initiated
 * session window Meta only delivers approved *template* messages — use
 * `sendWhatsAppTemplate` for business-initiated notifications in production. This
 * helper remains for the order-status path and in-session replies. Gated: returns
 * `skipped` when WhatsApp is off.
 */
export async function sendWhatsApp(input: { to: string; body: string }): Promise<SendWhatsAppResult> {
  if (!isWhatsAppEnabled) {
    return { ok: false, skipped: true, error: "WhatsApp is not configured" };
  }
  const to = toWhatsAppNumber(input.to);
  if (!to) return { ok: false, skipped: true, error: "No valid WhatsApp number on file" };
  return postToGraph({
    to,
    type: "text",
    text: { preview_url: false, body: input.body.slice(0, 4096) },
  });
}

/** A single positional body parameter for a template. */
export type WhatsAppParam = { type: "text"; text: string };

/**
 * Send a pre-approved WhatsApp template message. `components` are the template
 * components (body/header/button params) per the Cloud API spec. Gated.
 */
export async function sendWhatsAppTemplate(input: {
  to: string;
  templateName: string;
  languageCode?: string;
  bodyParams?: string[];
  components?: unknown[];
}): Promise<SendWhatsAppResult> {
  if (!isWhatsAppEnabled) {
    return { ok: false, skipped: true, error: "WhatsApp is not configured" };
  }
  const to = toWhatsAppNumber(input.to);
  if (!to) return { ok: false, skipped: true, error: "No valid WhatsApp number on file" };

  const components =
    input.components ??
    (input.bodyParams && input.bodyParams.length > 0
      ? [
          {
            type: "body",
            parameters: input.bodyParams.map((t): WhatsAppParam => ({ type: "text", text: t })),
          },
        ]
      : undefined);

  return postToGraph({
    to,
    type: "template",
    template: {
      name: input.templateName,
      language: { code: input.languageCode ?? "en" },
      ...(components ? { components } : {}),
    },
  });
}

/**
 * WhatsApp template registry — mirrors the templates that must be created and
 * approved in the Meta dashboard (see docs/WHATSAPP_SETUP.md). `params` documents
 * the ordered body variables ({{1}}, {{2}}, …). These are referenced by the
 * notification handlers and surfaced read-only in the admin Notifications tab.
 */
export interface WhatsAppTemplateDef {
  name: string;
  params: string[];
  description: string;
}

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplateDef> = {
  order_confirmation: {
    name: "order_confirmation",
    params: ["name", "order_number", "total", "delivery_date"],
    description: "Sent immediately when an order is placed.",
  },
  payment_received: {
    name: "payment_received",
    params: ["name", "order_number"],
    description: "Payment confirmed (PayHere or approved bank transfer).",
  },
  order_confirmed: {
    name: "order_confirmed",
    params: ["name", "order_number"],
    description: "Admin confirmed the order.",
  },
  order_preparation: {
    name: "order_preparation",
    params: ["name", "order_number"],
    description: "Order is being prepared.",
  },
  out_for_delivery: {
    name: "out_for_delivery",
    params: ["name", "order_number", "delivery_window"],
    description: "Order is out for delivery.",
  },
  ready_for_pickup: {
    name: "ready_for_pickup",
    params: ["name", "order_number", "pickup_window"],
    description: "Order is ready for pickup.",
  },
  order_delivered: {
    name: "order_delivered",
    params: ["name", "order_number"],
    description: "Order delivered/completed.",
  },
  order_cancelled: {
    name: "order_cancelled",
    params: ["name", "order_number", "reason"],
    description: "Order cancelled, with reason.",
  },
  order_refunded: {
    name: "order_refunded",
    params: ["name", "order_number"],
    description: "Order refunded.",
  },
  bank_receipt_rejected: {
    name: "bank_receipt_rejected",
    params: ["name", "order_number", "reason"],
    description: "Bank transfer receipt could not be verified.",
  },
  review_request: {
    name: "review_request",
    params: ["name", "order_number"],
    description: "Invite to review, sent 2 days after delivery.",
  },
  bulk_request_received: {
    name: "bulk_request_received",
    params: ["name"],
    description: "Acknowledgement that a bulk quote request was received.",
  },
  bulk_quote_sent: {
    name: "bulk_quote_sent",
    params: ["name", "product", "quantity", "quoted_total", "message", "payment_link"],
    description:
      "Quote ready. For multi-product requests, product = a one-line summary of all lines and quantity = the line count ('N products'). message = the admin's note (flattened to one line; 'No additional notes.' when empty). payment_link is the pay-online URL for online quotes, or 'Our team will arrange payment & delivery.' for offline.",
  },
  subscription_reminder: {
    name: "subscription_reminder",
    params: ["name", "product", "reorder_link"],
    description: "Reorder reminder with one-tap reorder link.",
  },
  welcome: {
    name: "welcome",
    params: ["name"],
    description: "Welcome message on signup.",
  },
};
