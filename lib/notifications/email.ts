// Minimal Resend email wrapper (Phase 6, Part A).
// Gated by `isResendEnabled` — when no RESEND_API_KEY is set this is a no-op that
// reports `skipped` so callers can treat "email turned off" differently from a
// real send failure. Accepts either a React Email element (`react`) or raw `html`.

import type { ReactElement } from "react";
import { Resend } from "resend";
import { isResendEnabled } from "@/lib/integrations";
import { brand } from "@/lib/brand";

export interface SendEmailResult {
  ok: boolean;
  /** True when email is disabled (no API key) — not a failure, nothing to retry. */
  skipped?: boolean;
  error?: string;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  react?: ReactElement;
  html?: string;
  text?: string;
}): Promise<SendEmailResult> {
  if (!isResendEnabled) {
    return { ok: false, skipped: true, error: "Resend is not configured" };
  }
  if (!input.react && !input.html) {
    return { ok: false, error: "No email body (react or html) provided" };
  }
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from = process.env.RESEND_FROM_EMAIL || `${brand.name} <onboarding@resend.dev>`;
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      ...(input.react ? { react: input.react } : {}),
      ...(input.html ? { html: input.html } : {}),
      ...(input.text ? { text: input.text } : {}),
    } as Parameters<typeof resend.emails.send>[0]);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
