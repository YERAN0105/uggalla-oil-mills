// WhatsApp Cloud API webhook (Phase 6).
//
// GET  — Meta's subscription verification handshake (hub.challenge), gated by
//        WHATSAPP_VERIFY_TOKEN.
// POST — delivery/status callbacks. We best-effort log message status updates to
//        notification_logs (audit only) and always return 200 so Meta doesn't
//        retry. Inbound message bodies are intentionally not stored.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 403 });
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const statuses: any[] = [];
    for (const entry of body?.entry ?? []) {
      for (const change of entry?.changes ?? []) {
        for (const s of change?.value?.statuses ?? []) statuses.push(s);
      }
    }

    if (statuses.length > 0) {
      const db = createAdminClient();
      const rows = statuses.map((s) => ({
        event: "whatsapp_delivery",
        channel: "whatsapp" as const,
        recipient: s.recipient_id ?? "unknown",
        status: s.status === "failed" ? ("failed" as const) : ("sent" as const),
        error: s.errors?.[0]?.title ?? null,
        payload: { message_id: s.id, status: s.status, timestamp: s.timestamp },
        idempotency_key: null,
      }));
      await db.from("notification_logs").insert(rows);
    }
  } catch (err) {
    console.error("[whatsapp webhook] failed to log statuses:", err);
  }

  return NextResponse.json({ ok: true });
}
