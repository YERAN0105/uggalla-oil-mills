// Daily review-request cron (Phase 6).
//
// Finds orders that were marked `delivered` exactly 2 days ago (Asia/Colombo) and
// invites the customer to review. Deduped against notification_logs so a same-day
// re-run never double-sends.
//
// SECURITY: requires `Authorization: Bearer <CRON_SECRET>`.
// SCHEDULING: daily via Vercel Cron (see vercel.json) — wired at deploy.

import { NextResponse } from "next/server";
import { subDays, parseISO } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatInColombo } from "@/lib/date";
import { signOrderToken } from "@/lib/orders/token";
import { sendReviewRequest } from "@/lib/notifications/transactional";

/* eslint-disable @typescript-eslint/no-explicit-any */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
}

async function run() {
  const db = createAdminClient();

  // Target the Colombo calendar day two days ago (UTC+5:30, no DST).
  const targetDate = formatInColombo(subDays(new Date(), 2), "yyyy-MM-dd");
  const dayStart = parseISO(`${targetDate}T00:00:00+05:30`).toISOString();
  const dayEnd = parseISO(`${targetDate}T23:59:59.999+05:30`).toISOString();

  const { data: history, error } = await db
    .from("order_status_history")
    .select("order_id, changed_at")
    .eq("status", "delivered")
    .gte("changed_at", dayStart)
    .lte("changed_at", dayEnd);

  if (error) {
    console.error("[review-requests] query failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const orderIds = [...new Set(((history as any[]) ?? []).map((h) => h.order_id))];
  let sent = 0;
  let skipped = 0;

  for (const orderId of orderIds) {
    const { data: o } = await db
      .from("orders")
      .select("id, order_number, user_id, guest_email, guest_phone, status, address_snapshot")
      .eq("id", orderId)
      .maybeSingle();
    if (!o) {
      skipped += 1;
      continue;
    }
    const order = o as any;
    // Skip if the order has since been cancelled/refunded.
    if (order.status === "cancelled" || order.status === "refunded") {
      skipped += 1;
      continue;
    }

    // Dedupe: already invited for this order?
    const { data: existing } = await db
      .from("notification_logs")
      .select("id")
      .eq("event", "review_request")
      .eq("payload->>order_number", order.order_number)
      .limit(1)
      .maybeSingle();
    if (existing) {
      skipped += 1;
      continue;
    }

    // Resolve recipient.
    let email: string | null = order.guest_email ?? null;
    let name: string | null = order.address_snapshot?.recipient ?? null;
    let phone: string | null = order.guest_phone ?? order.address_snapshot?.phone ?? null;
    if (order.user_id) {
      const { data: authUser } = await db.auth.admin.getUserById(order.user_id);
      email = email ?? authUser?.user?.email ?? null;
      const { data: profile } = await db
        .from("users")
        .select("name, phone")
        .eq("id", order.user_id)
        .maybeSingle();
      name = name ?? profile?.name ?? null;
      phone = phone ?? profile?.phone ?? null;
    }

    const reviewUrl = order.user_id
      ? `${APP_URL}/account/orders/${encodeURIComponent(order.order_number)}`
      : `${APP_URL}/orders/${encodeURIComponent(order.order_number)}?t=${signOrderToken(order.order_number)}`;

    await sendReviewRequest({
      name,
      email,
      phone,
      orderNumber: order.order_number,
      reviewUrl,
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, processed: orderIds.length, sent, skipped });
}

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return run();
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Not configured" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return unauthorized();
  return run();
}
