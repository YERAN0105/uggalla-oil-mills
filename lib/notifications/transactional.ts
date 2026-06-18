// Transactional notifications (Phase 6) — every customer/admin notification that
// is NOT an order-status change. Order-status + bank-receipt emails flow through
// the debounced dispatcher + notify() in index.ts; do NOT route those here.
//
// Each handler builds a branded React Email (emails/NotificationEmail) and a
// matching WhatsApp template send, fans out via Promise.allSettled, honours the
// admin Notifications settings (per-channel + per-event opt-out, ON by default),
// and best-effort logs every attempt to notification_logs. Fire-and-forget:
// callers wrap in try/catch but these never throw.

import { createElement } from "react";
import { brand, formatCurrency } from "@/lib/brand";
import { isResendEnabled, isWhatsAppEnabled } from "@/lib/integrations";
import { getSetting } from "@/lib/settings";
import { NotificationEmail, type NotificationEmailProps } from "@/emails/NotificationEmail";
import { sendEmail } from "./email";
import { sendWhatsAppTemplate } from "./whatsapp";
import { logNotification, type ChannelResult } from "./log";
import type { NotificationSettings } from "@/types/admin";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

async function notificationSettings(): Promise<NotificationSettings> {
  // Default ON: a missing/never-saved row should not silently disable email.
  return getSetting<NotificationSettings>("notifications", {
    email_enabled: true,
    whatsapp_enabled: true,
    events: {},
  });
}

function eventEnabled(settings: NotificationSettings, event: string): boolean {
  // events map is opt-out: only an explicit `false` disables an event.
  return settings.events?.[event] !== false;
}

interface EmailSpec {
  to: string | null;
  subject: string;
  props: NotificationEmailProps;
  /** Plain-text fallback. */
  text: string;
}

interface WhatsAppSpec {
  to: string | null;
  templateName: string;
  bodyParams: string[];
}

/**
 * Shared fan-out: send the email + WhatsApp for one event, honour settings, log.
 */
async function dispatch(
  event: string,
  email: EmailSpec | null,
  whatsapp: WhatsAppSpec | null,
  logPayload?: Record<string, unknown>
): Promise<ChannelResult[]> {
  const settings = await notificationSettings();
  const allowEmail = settings.email_enabled !== false && eventEnabled(settings, event);
  const allowWhatsApp = settings.whatsapp_enabled !== false && eventEnabled(settings, event);

  const tasks: Promise<ChannelResult>[] = [];

  tasks.push(
    (async (): Promise<ChannelResult> => {
      if (!email || !email.to) return { channel: "email", status: "skipped", error: "No email recipient" };
      if (!isResendEnabled) return { channel: "email", status: "skipped", error: "Resend not configured" };
      if (!allowEmail) return { channel: "email", status: "skipped", error: "Email disabled in settings" };
      const react = createElement(NotificationEmail, email.props);
      const r = await sendEmail({ to: email.to, subject: email.subject, react, text: email.text });
      if (r.ok) return { channel: "email", status: "sent" };
      return { channel: "email", status: r.skipped ? "skipped" : "failed", error: r.error };
    })()
  );

  tasks.push(
    (async (): Promise<ChannelResult> => {
      if (!whatsapp || !whatsapp.to) return { channel: "whatsapp", status: "skipped", error: "No phone recipient" };
      if (!isWhatsAppEnabled) {
        // The required log line for the gated-off case.
        console.info("whatsapp skipped: not configured");
        return { channel: "whatsapp", status: "skipped", error: "WhatsApp not configured" };
      }
      if (!allowWhatsApp) return { channel: "whatsapp", status: "skipped", error: "WhatsApp disabled in settings" };
      const r = await sendWhatsAppTemplate({
        to: whatsapp.to,
        templateName: whatsapp.templateName,
        bodyParams: whatsapp.bodyParams,
      });
      if (r.ok) return { channel: "whatsapp", status: "sent" };
      return { channel: "whatsapp", status: r.skipped ? "skipped" : "failed", error: r.error };
    })()
  );

  const settled = await Promise.allSettled(tasks);
  const results: ChannelResult[] = settled.map((s, i) =>
    s.status === "fulfilled"
      ? s.value
      : {
          channel: i === 0 ? "email" : "whatsapp",
          status: "failed",
          error: s.reason instanceof Error ? s.reason.message : String(s.reason),
        }
  );

  await logNotification(event, results, { email: email?.to ?? null, phone: whatsapp?.to ?? null }, {
    subject: email?.subject ?? null,
    ...logPayload,
  });
  return results;
}

const FOOT = { shopEmail: brand.email, shopPhone: brand.phone };

// ─── welcome (signup) ─────────────────────────────────────────────────────────

export async function sendWelcome(input: {
  name: string | null;
  email: string | null;
  phone: string | null;
}): Promise<void> {
  const heading = "Welcome to " + brand.name;
  const paragraphs = [
    "Thank you for joining us. We press pure coconut oil in Padukka and deliver it island-wide.",
    "Browse our range of bottles, packets and bulk oil — and earn loyalty points on every order.",
  ];
  await dispatch(
    "welcome",
    {
      to: input.email,
      subject: `Welcome to ${brand.name}`,
      text: `Hi ${input.name ?? "there"},\n\n${paragraphs.join("\n\n")}\n\nShop now: ${APP_URL}/shop\n\n— ${brand.name}`,
      props: {
        preview: `Welcome to ${brand.name}`,
        recipientName: input.name,
        heading,
        paragraphs,
        cta: { label: "Start shopping", url: `${APP_URL}/shop` },
        ...FOOT,
      },
    },
    { to: input.phone, templateName: "welcome", bodyParams: [input.name ?? "there"] }
  );
}

// ─── bulk request received (customer ack + admin alert) ───────────────────────

export async function sendBulkRequestReceived(input: {
  name: string | null;
  email: string | null;
  phone: string | null;
  productName: string | null;
  quantity: number;
  unit: string;
  requestId: string;
}): Promise<void> {
  const product = input.productName ?? "Loose coconut oil";
  const qty = `${input.quantity} ${input.unit}`;
  const paragraphs = [
    `We've received your request for a quote on ${product} (${qty}).`,
    "Our team will review it and send you a personalised quote shortly. We'll be in touch by email and WhatsApp.",
  ];
  await dispatch(
    "bulk_request_received",
    {
      to: input.email,
      subject: `We've received your quote request — ${brand.name}`,
      text: `Hi ${input.name ?? "there"},\n\n${paragraphs.join("\n\n")}\n\n— ${brand.name}`,
      props: {
        preview: "We've received your bulk quote request",
        recipientName: input.name,
        heading: "Quote request received",
        paragraphs,
        rows: [
          { label: "Product", value: product },
          { label: "Quantity", value: qty },
        ],
        ...FOOT,
      },
    },
    { to: input.phone, templateName: "bulk_request_received", bodyParams: [input.name ?? "there"] }
  );

  // Admin alert (email only) — let the shop know a request is waiting.
  if (brand.email) {
    await dispatch(
      "bulk_request_admin_alert",
      {
        to: brand.email,
        subject: `New bulk quote request — ${product}`,
        text: `New bulk request from ${input.name ?? "a customer"} (${input.email ?? "no email"}, ${input.phone ?? "no phone"}).\nProduct: ${product}\nQuantity: ${qty}\n\nReview: ${APP_URL}/admin/bulk-requests/${input.requestId}`,
        props: {
          preview: "New bulk quote request",
          heading: "New bulk quote request",
          paragraphs: [
            `${input.name ?? "A customer"} has requested a quote.`,
            `Contact: ${input.email ?? "—"} · ${input.phone ?? "—"}`,
          ],
          rows: [
            { label: "Product", value: product },
            { label: "Quantity", value: qty },
          ],
          cta: { label: "Review request", url: `${APP_URL}/admin/bulk-requests/${input.requestId}` },
          ...FOOT,
        },
      },
      null
    );
  }
}

// ─── bulk quote sent ──────────────────────────────────────────────────────────

export async function sendBulkQuoteSent(input: {
  name: string | null;
  email: string | null;
  phone: string | null;
  productName: string | null;
  quantity: number;
  unit: string;
  quotedTotal: number;
  message: string | null;
  /** Pay-online link — only present for online quotes (PayHere). */
  payLink: string | null;
}): Promise<void> {
  const product = input.productName ?? "Loose coconut oil";
  const qty = `${input.quantity} ${input.unit}`;
  const total = formatCurrency(input.quotedTotal);

  // The admin's note is shown as its own clearly-labelled box (see props.message),
  // not mixed into the system paragraphs, so the customer can tell it apart.
  const paragraphs = [`Here's your quote for ${product} (${qty}).`];
  if (input.payLink) {
    paragraphs.push("You can review and pay for your order securely online using the button below.");
  } else {
    paragraphs.push("Our team will be in touch to arrange payment and delivery directly.");
  }

  await dispatch(
    "bulk_quote_sent",
    {
      to: input.email,
      subject: `Your quote from ${brand.name}`,
      text:
        `Hi ${input.name ?? "there"},\n\nYour quote for ${product} (${qty}): ${total}.\n` +
        (input.message ? `\nMessage from ${brand.name}:\n${input.message}\n` : "") +
        (input.payLink ? `\nPay online: ${input.payLink}\n` : "\nWe'll arrange payment & delivery directly.\n") +
        `\n— ${brand.name}`,
      props: {
        preview: `Your quote: ${total}`,
        recipientName: input.name,
        heading: "Your quote is ready",
        paragraphs,
        rows: [
          { label: "Product", value: product },
          { label: "Quantity", value: qty },
          { label: "Quoted total", value: total },
        ],
        message: input.message ? { label: `Message from ${brand.name}`, text: input.message } : null,
        cta: input.payLink ? { label: "Accept & pay online", url: input.payLink } : null,
        footnote: input.payLink ? "This secure payment link expires in 7 days." : null,
        ...FOOT,
      },
    },
    {
      to: input.phone,
      templateName: "bulk_quote_sent",
      // Variable order MUST match the approved Meta template:
      //   {{1}} name  {{2}} product  {{3}} quantity  {{4}} quoted_total
      //   {{5}} message  {{6}} payment_link
      // WhatsApp rejects empty / multi-line variables, so each value is flattened
      // to one line and falls back to neutral text when absent.
      bodyParams: [
        input.name ?? "there",
        product,
        qty,
        total,
        input.message ? waFlatten(input.message) : "No additional notes.",
        input.payLink ?? "Our team will arrange payment & delivery.",
      ],
    }
  );
}

/** WhatsApp template variables can't contain newlines or runs of whitespace. */
function waFlatten(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// ─── subscription reminder ────────────────────────────────────────────────────

export async function sendSubscriptionReminder(input: {
  name: string | null;
  email: string | null;
  phone: string | null;
  productName: string;
  reorderUrl: string;
}): Promise<void> {
  const paragraphs = [
    `Running low on ${input.productName}? It might be time to reorder.`,
    "Tap the button below and we'll pre-fill your cart with the same product and size — checkout takes seconds.",
  ];
  await dispatch(
    "subscription_reminder",
    {
      to: input.email,
      subject: `Time to reorder ${input.productName}?`,
      text: `Hi ${input.name ?? "there"},\n\n${paragraphs.join("\n\n")}\n\nReorder: ${input.reorderUrl}\n\n— ${brand.name}`,
      props: {
        preview: `Time to reorder ${input.productName}?`,
        recipientName: input.name,
        heading: "Never run out",
        paragraphs,
        cta: { label: "Reorder now", url: input.reorderUrl },
        footnote: "You're receiving this because you set a reorder reminder. Manage it anytime in your account.",
        ...FOOT,
      },
    },
    {
      to: input.phone,
      templateName: "subscription_reminder",
      bodyParams: [input.name ?? "there", input.productName, input.reorderUrl],
    }
  );
}

// ─── review request ───────────────────────────────────────────────────────────

export async function sendReviewRequest(input: {
  name: string | null;
  email: string | null;
  phone: string | null;
  orderNumber: string;
  reviewUrl: string;
}): Promise<void> {
  const paragraphs = [
    `We hope you're enjoying your recent order (${input.orderNumber}).`,
    "Would you take a moment to share what you think? Your review helps other customers and means a lot to our small mill.",
  ];
  await dispatch(
    "review_request",
    {
      to: input.email,
      subject: `How was your order? — ${brand.name}`,
      text: `Hi ${input.name ?? "there"},\n\n${paragraphs.join("\n\n")}\n\nLeave a review: ${input.reviewUrl}\n\n— ${brand.name}`,
      props: {
        preview: "How was your order?",
        recipientName: input.name,
        heading: "How did we do?",
        paragraphs,
        cta: { label: "Write a review", url: input.reviewUrl },
        ...FOOT,
      },
    },
    {
      to: input.phone,
      templateName: "review_request",
      bodyParams: [input.name ?? "there", input.orderNumber],
    },
    { order_number: input.orderNumber }
  );
}
