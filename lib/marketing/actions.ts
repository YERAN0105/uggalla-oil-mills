"use server";

import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { brand } from "@/lib/brand";
import { isResendEnabled } from "@/lib/integrations";
import { sendEmail } from "@/lib/notifications/email";
import { NotificationEmail } from "@/emails/NotificationEmail";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type SimpleResult = { ok: true } | { ok: false; error: string };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/** Newsletter signup — collects into newsletter_subscribers + sends a welcome. */
export async function subscribeNewsletter(emailRaw: string): Promise<SimpleResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const db = createAdminClient();
  const { error } = await db
    .from("newsletter_subscribers")
    .upsert({ email, is_active: true }, { onConflict: "email" });
  if (error) {
    console.error("[newsletter] upsert failed:", error.message);
    return { ok: false, error: "Something went wrong. Please try again." };
  }

  // Best-effort welcome — never fail the subscription if email is off / errors.
  if (isResendEnabled) {
    try {
      const react = createElement(NotificationEmail, {
        preview: `You're subscribed to ${brand.name}`,
        heading: "You're on the list",
        paragraphs: [
          `Thanks for subscribing to ${brand.name}. You'll be the first to hear about new products, offers and seasonal specials.`,
        ],
        cta: { label: "Shop now", url: `${APP_URL}/shop` },
        shopEmail: brand.email,
        shopPhone: brand.phone,
      });
      await sendEmail({
        to: email,
        subject: `Welcome to the ${brand.name} newsletter`,
        react,
        text: `Thanks for subscribing to ${brand.name}. Shop now: ${APP_URL}/shop`,
      });
    } catch (err) {
      console.error("[newsletter] welcome email failed:", err);
    }
  }

  return { ok: true };
}

export interface ContactInput {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
}

/** Contact form — emails the shop inbox. */
export async function submitContact(input: ContactInput): Promise<SimpleResult> {
  const name = input.name?.trim() ?? "";
  const email = input.email?.trim() ?? "";
  const message = input.message?.trim() ?? "";
  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (message.length < 5) return { ok: false, error: "Please enter a message." };

  if (!isResendEnabled) {
    // Without email configured we can't deliver — tell the user to use WhatsApp/phone.
    return { ok: false, error: "Our contact form is temporarily unavailable. Please reach us by phone or WhatsApp." };
  }

  try {
    const subject = input.subject?.trim() || "Website contact form";
    const react = createElement(NotificationEmail, {
      preview: `Contact form: ${subject}`,
      heading: "New contact message",
      paragraphs: [`From: ${name} (${email}${input.phone ? `, ${input.phone}` : ""})`, `Subject: ${subject}`, message],
      shopEmail: brand.email,
      shopPhone: brand.phone,
    });
    const res = await sendEmail({
      to: brand.email,
      subject: `[Contact] ${subject}`,
      react,
      text: `From: ${name} (${email}${input.phone ? `, ${input.phone}` : ""})\nSubject: ${subject}\n\n${message}`,
      // replyTo would be ideal here; sendEmail can be extended if needed.
    });
    if (!res.ok && !res.skipped) return { ok: false, error: "Could not send your message. Please try again." };
  } catch (err) {
    console.error("[contact] send failed:", err);
    return { ok: false, error: "Could not send your message. Please try again." };
  }

  return { ok: true };
}
