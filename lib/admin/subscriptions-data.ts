import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminSubscriptionRow } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SubscriptionListParams {
  status?: string;
  interval?: string;
  search?: string;
}

export interface SubscriptionStats {
  active: number;
  paused: number;
  cancelled: number;
  remindersSent: number;
}

export async function listSubscriptions(
  params: SubscriptionListParams
): Promise<AdminSubscriptionRow[]> {
  const db = createAdminClient();
  let query = db
    .from("subscriptions")
    .select(
      "id, quantity, interval, next_reminder_date, status, last_reminder_at, created_at, user:users(name), product:products(name), size:product_sizes(label)"
    )
    .order("next_reminder_date", { ascending: true })
    .limit(300);

  if (params.status) query = query.eq("status", params.status);
  if (params.interval) query = query.eq("interval", params.interval);

  const { data } = await query;
  let rows = ((data as any[]) ?? []).map((s) => ({
    id: s.id,
    customer_name: s.user?.name ?? null,
    customer_email: null,
    product_name: s.product?.name ?? "—",
    size_label: s.size?.label ?? null,
    quantity: s.quantity,
    interval: s.interval,
    next_reminder_date: s.next_reminder_date,
    status: s.status,
    last_reminder_at: s.last_reminder_at,
    created_at: s.created_at,
  }));

  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter(
      (r) => r.customer_name?.toLowerCase().includes(q) || r.product_name.toLowerCase().includes(q)
    );
  }
  return rows;
}

export async function getSubscriptionStats(): Promise<SubscriptionStats> {
  const db = createAdminClient();
  const [active, paused, cancelled, reminders] = await Promise.all([
    db.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    db.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "paused"),
    db.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "cancelled"),
    db
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .not("last_reminder_at", "is", null),
  ]);
  return {
    active: active.count ?? 0,
    paused: paused.count ?? 0,
    cancelled: cancelled.count ?? 0,
    remindersSent: reminders.count ?? 0,
  };
}
