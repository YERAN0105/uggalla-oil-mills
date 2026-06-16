// WhatsApp sender — Phase 6 STUB (Part A).
// Gated by `isWhatsAppEnabled`. The real WhatsApp Cloud API integration (template
// messages, E.164 formatting, delivery webhook) is built in Phase 6. Until then
// this always reports `skipped` so the dispatcher never treats it as a failure to
// retry. Build it fully, gate the entry point — same pattern as PayHere.

import { isWhatsAppEnabled } from "@/lib/integrations";

export interface SendWhatsAppResult {
  ok: boolean;
  /** True when WhatsApp is off or still stubbed — not a failure, nothing to retry. */
  skipped?: boolean;
  error?: string;
}

export async function sendWhatsApp(input: {
  to: string;
  body: string;
}): Promise<SendWhatsAppResult> {
  if (!isWhatsAppEnabled) {
    return { ok: false, skipped: true, error: "WhatsApp is not configured" };
  }
  // Phase 6: replace with a real Cloud API send. Intentionally a no-op for now.
  void input;
  return { ok: false, skipped: true, error: "WhatsApp sender is a Phase 6 stub" };
}
