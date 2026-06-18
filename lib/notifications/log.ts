// Shared notification audit logger + per-channel result types, reused by the
// transactional notification handlers (lib/notifications/transactional.ts). The
// order-status path in index.ts has its own inlined logger; both write to the
// same `notification_logs` table (audit only — never the dedupe source of truth).

import { createAdminClient } from "@/lib/supabase/admin";

export type NotifyChannel = "email" | "whatsapp";

export interface ChannelResult {
  channel: NotifyChannel;
  status: "sent" | "failed" | "skipped";
  error?: string;
}

/** Best-effort audit log — never throws, never blocks a send. */
export async function logNotification(
  event: string,
  results: ChannelResult[],
  recipients: { email: string | null; phone: string | null },
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const db = createAdminClient();
    const rows = results.map((r) => ({
      event,
      channel: r.channel,
      recipient: (r.channel === "email" ? recipients.email : recipients.phone) ?? "unknown",
      status: r.status,
      error: r.error ?? null,
      payload,
      idempotency_key: null,
    }));
    if (rows.length > 0) await db.from("notification_logs").insert(rows);
  } catch {
    // Audit logging is best-effort.
  }
}
