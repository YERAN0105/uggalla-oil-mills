import { createAdminClient } from "@/lib/supabase/admin";
import { formatInColombo, nowInColombo } from "@/lib/date";
import { subDays } from "date-fns";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REVENUE_STATUSES_EXCLUDED = ["cancelled", "refunded"];

export interface DashboardKpis {
  todayRevenue: number;
  revenueChangePct: number | null;
  todayOrders: number;
  ordersChangePct: number | null;
  pendingOrders: number;
  lowStock: number;
}

export interface RevenuePoint {
  date: string; // yyyy-MM-dd (Colombo)
  revenue: number;
  orders: number;
}

export interface TopProduct {
  productId: string | null;
  name: string;
  units: number;
  revenue: number;
}

export interface StatusSlice {
  status: string;
  count: number;
}

export interface RecentOrder {
  id: string;
  order_number: string;
  customer: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

export interface PendingStrip {
  bulkRequests: number;
  bankApprovals: number;
  pendingReviews: number;
  activeSubscriptions: number;
}

const dayKey = (d: string | Date) => formatInColombo(d, "yyyy-MM-dd");

/** KPI cards: revenue / orders today vs yesterday, pending orders, low stock. */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const db = createAdminClient();
  const since = subDays(nowInColombo(), 2).toISOString();

  const [{ data: recent }, pending] = await Promise.all([
    db
      .from("orders")
      .select("total, status, created_at")
      .gte("created_at", since)
      .not("status", "in", `(${REVENUE_STATUSES_EXCLUDED.join(",")})`),
    db
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_confirmation"),
  ]);

  const todayKey = dayKey(nowInColombo());
  const yesterdayKey = dayKey(subDays(nowInColombo(), 1));

  let todayRevenue = 0;
  let yRevenue = 0;
  let todayOrders = 0;
  let yOrders = 0;
  for (const o of (recent as any[]) ?? []) {
    const k = dayKey(o.created_at);
    const total = Number(o.total) || 0;
    if (k === todayKey) {
      todayRevenue += total;
      todayOrders += 1;
    } else if (k === yesterdayKey) {
      yRevenue += total;
      yOrders += 1;
    }
  }

  // Low stock count
  const { data: lowRows } = await db
    .from("products")
    .select("stock_quantity, low_stock_threshold")
    .eq("stock_tracked", true)
    .is("deleted_at", null);
  const lowStock = ((lowRows as any[]) ?? []).filter(
    (p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold)
  ).length;

  const pct = (today: number, prev: number): number | null => {
    if (prev === 0) return today > 0 ? 100 : null;
    return Math.round(((today - prev) / prev) * 100);
  };

  return {
    todayRevenue,
    revenueChangePct: pct(todayRevenue, yRevenue),
    todayOrders,
    ordersChangePct: pct(todayOrders, yOrders),
    pendingOrders: pending.count ?? 0,
    lowStock,
  };
}

/** Daily revenue + order count for the last `days` days (Colombo buckets). */
export async function getRevenueSeries(days: number): Promise<RevenuePoint[]> {
  const db = createAdminClient();
  const since = subDays(nowInColombo(), days - 1);
  const { data } = await db
    .from("orders")
    .select("total, created_at, status")
    .gte("created_at", since.toISOString())
    .not("status", "in", `(${REVENUE_STATUSES_EXCLUDED.join(",")})`);

  const buckets = new Map<string, RevenuePoint>();
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(subDays(nowInColombo(), i));
    buckets.set(key, { date: key, revenue: 0, orders: 0 });
  }
  for (const o of (data as any[]) ?? []) {
    const key = dayKey(o.created_at);
    const b = buckets.get(key);
    if (b) {
      b.revenue += Number(o.total) || 0;
      b.orders += 1;
    }
  }
  return [...buckets.values()];
}

/** Top-selling products over the last 30 days by units sold. */
export async function getTopProducts(limit = 10): Promise<TopProduct[]> {
  const db = createAdminClient();
  const since = subDays(nowInColombo(), 30).toISOString();

  const { data: orders } = await db
    .from("orders")
    .select("id")
    .gte("created_at", since)
    .not("status", "in", `(${REVENUE_STATUSES_EXCLUDED.join(",")})`);
  const orderIds = ((orders as any[]) ?? []).map((o) => o.id);
  if (orderIds.length === 0) return [];

  const { data: items } = await db
    .from("order_items")
    .select("product_id, product_snapshot, quantity, line_total")
    .in("order_id", orderIds);

  const map = new Map<string, TopProduct>();
  for (const it of (items as any[]) ?? []) {
    const key = it.product_id ?? it.product_snapshot?.name ?? "unknown";
    const existing = map.get(key) ?? {
      productId: it.product_id ?? null,
      name: it.product_snapshot?.name ?? "Unknown product",
      units: 0,
      revenue: 0,
    };
    existing.units += Number(it.quantity) || 0;
    existing.revenue += Number(it.line_total) || 0;
    map.set(key, existing);
  }
  return [...map.values()].sort((a, b) => b.units - a.units).slice(0, limit);
}

/** Order counts grouped by status (last 90 days). */
export async function getOrdersByStatus(): Promise<StatusSlice[]> {
  const db = createAdminClient();
  const since = subDays(nowInColombo(), 90).toISOString();
  const { data } = await db.from("orders").select("status").gte("created_at", since);

  const map = new Map<string, number>();
  for (const o of (data as any[]) ?? []) {
    map.set(o.status, (map.get(o.status) ?? 0) + 1);
  }
  return [...map.entries()].map(([status, count]) => ({ status, count }));
}

/** Last N orders for the dashboard table. */
export async function getRecentOrders(limit = 10): Promise<RecentOrder[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .select("id, order_number, total, status, payment_status, created_at, guest_email, user:users(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data as any[]) ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer: o.user?.name || o.guest_email || "Guest",
    total: Number(o.total) || 0,
    status: o.status,
    payment_status: o.payment_status,
    created_at: o.created_at,
  }));
}

/** Counts for the clickable "pending items" strip. */
export async function getPendingStrip(): Promise<PendingStrip> {
  const db = createAdminClient();
  const [bulk, bank, reviews, subs] = await Promise.all([
    db.from("bulk_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("bank_transfer_receipts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    db.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
    db.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
  ]);
  return {
    bulkRequests: bulk.count ?? 0,
    bankApprovals: bank.count ?? 0,
    pendingReviews: reviews.count ?? 0,
    activeSubscriptions: subs.count ?? 0,
  };
}
