// Daily subscription-reminder cron (Phase 6).
//
// Finds active subscriptions whose next_reminder_date has arrived, sends a
// reorder reminder (email + WhatsApp) with a one-tap `/reorder?sub=<id>` link,
// then advances next_reminder_date by the interval and records last_reminder_at.
// NEVER charges anything — the customer always checks out manually.
//
// SECURITY: requires `Authorization: Bearer <CRON_SECRET>`.
// SCHEDULING: daily via Vercel Cron (see vercel.json) — wired at deploy.

import { NextResponse } from "next/server";
import { addDays, parseISO, format as formatDate } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatInColombo } from "@/lib/date";
import { sendSubscriptionReminder } from "@/lib/notifications/transactional";

/* eslint-disable @typescript-eslint/no-explicit-any */

const INTERVAL_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };
const BATCH = 200;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function run() {
  const db = createAdminClient();
  const today = formatInColombo(new Date(), "yyyy-MM-dd");

  const { data: subs, error } = await db
    .from("subscriptions")
    .select("id, user_id, product_id, interval, next_reminder_date, products:product_id(name)")
    .eq("status", "active")
    .lte("next_reminder_date", today)
    .limit(BATCH);

  if (error) {
    console.error("[subscription-reminders] query failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const sub of (subs as any[]) ?? []) {
    try {
      const { data: authUser } = await db.auth.admin.getUserById(sub.user_id);
      const email = authUser?.user?.email ?? null;
      const { data: profile } = await db
        .from("users")
        .select("name, phone")
        .eq("id", sub.user_id)
        .maybeSingle();

      await sendSubscriptionReminder({
        name: profile?.name ?? null,
        email,
        phone: profile?.phone ?? null,
        productName: sub.products?.name ?? "your oil",
        reorderUrl: `${APP_URL}/reorder?sub=${sub.id}`,
      });

      // Advance the schedule regardless of channel outcome (notifications are
      // best-effort; we don't want to re-send the same day on a transient error).
      const days = INTERVAL_DAYS[sub.interval] ?? 30;
      const base = sub.next_reminder_date ? parseISO(sub.next_reminder_date) : new Date();
      const next = formatDate(addDays(base, days), "yyyy-MM-dd");
      await db
        .from("subscriptions")
        .update({ last_reminder_at: new Date().toISOString(), next_reminder_date: next })
        .eq("id", sub.id);
      sent += 1;
    } catch (err) {
      console.error("[subscription-reminders] failed for", sub.id, err);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, processed: (subs as any[])?.length ?? 0, sent, failed });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return run();
}

// Vercel Cron issues GET requests; accept both with the same guard.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return run();
}
