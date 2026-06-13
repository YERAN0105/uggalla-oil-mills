import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminCustomerRow } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const REVENUE_EXCLUDED = ["cancelled", "refunded"];

/** Map of user_id → email pulled from auth.users (single paginated call). */
async function emailMap(): Promise<Map<string, string>> {
  const db = createAdminClient();
  const map = new Map<string, string>();
  // First page (perPage 1000) is sufficient at this scale.
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email) map.set(u.id, u.email);
  return map;
}

interface OrderAgg {
  orders: number;
  value: number;
  last: string | null;
}

async function orderAggregates(): Promise<Map<string, OrderAgg>> {
  const db = createAdminClient();
  const { data } = await db
    .from("orders")
    .select("user_id, total, status, created_at")
    .not("user_id", "is", null);
  const map = new Map<string, OrderAgg>();
  for (const o of (data as any[]) ?? []) {
    const agg = map.get(o.user_id) ?? { orders: 0, value: 0, last: null };
    agg.orders += 1;
    if (!REVENUE_EXCLUDED.includes(o.status)) agg.value += Number(o.total) || 0;
    if (!agg.last || new Date(o.created_at) > new Date(agg.last)) agg.last = o.created_at;
    map.set(o.user_id, agg);
  }
  return map;
}

export interface CustomerListParams {
  search?: string;
  blocked?: string;
  hasOrders?: string;
  sort?: string;
}

export async function listCustomers(params: CustomerListParams): Promise<AdminCustomerRow[]> {
  const db = createAdminClient();
  let query = db
    .from("users")
    .select("id, name, phone, created_at, blocked, loyalty_points")
    .eq("role", "customer")
    .is("deleted_at", null)
    .limit(500);

  if (params.search) {
    const like = `%${params.search}%`;
    query = query.or(`name.ilike.${like},phone.ilike.${like}`);
  }
  if (params.blocked === "1") query = query.eq("blocked", true);
  if (params.blocked === "0") query = query.eq("blocked", false);

  const [{ data }, emails, aggs] = await Promise.all([query, emailMap(), orderAggregates()]);

  let rows: AdminCustomerRow[] = ((data as any[]) ?? []).map((u) => {
    const agg = aggs.get(u.id) ?? { orders: 0, value: 0, last: null };
    return {
      id: u.id,
      name: u.name,
      email: emails.get(u.id) ?? "—",
      phone: u.phone,
      created_at: u.created_at,
      blocked: u.blocked,
      loyalty_points: u.loyalty_points ?? 0,
      total_orders: agg.orders,
      lifetime_value: agg.value,
      last_order_at: agg.last,
    };
  });

  if (params.hasOrders === "1") rows = rows.filter((r) => r.total_orders > 0);

  switch (params.sort) {
    case "value":
      rows.sort((a, b) => b.lifetime_value - a.lifetime_value);
      break;
    case "last_order":
      rows.sort(
        (a, b) =>
          (b.last_order_at ? new Date(b.last_order_at).getTime() : 0) -
          (a.last_order_at ? new Date(a.last_order_at).getTime() : 0)
      );
      break;
    default:
      rows.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return rows;
}

export interface CustomerDetail {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  blocked: boolean;
  loyalty_points: number;
  internal_notes: string | null;
  kpis: { totalOrders: number; totalSpent: number; aov: number; activeSubscriptions: number };
  orders: { id: string; order_number: string; total: number; status: string; created_at: string }[];
  bulkRequests: { id: string; product_name: string | null; quantity: number; unit: string; status: string; created_at: string }[];
  subscriptions: { id: string; product_name: string; interval: string; status: string; next_reminder_date: string }[];
  addresses: { id: string; label: string | null; recipient: string; line1: string; city: string; phone: string | null }[];
  reviews: { id: string; product_name: string; rating: number; title: string | null; status: string; created_at: string }[];
  loyaltyTx: { id: string; type: string; points: number; balance_after: number; note: string | null; created_at: string }[];
}

export async function getCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const db = createAdminClient();
  const { data: u } = await db
    .from("users")
    .select("id, name, phone, created_at, blocked, loyalty_points, admin_notes")
    .eq("id", id)
    .maybeSingle();
  if (!u) return null;
  const user = u as any;

  const { data: authUser } = await db.auth.admin.getUserById(id);
  const email = authUser?.user?.email ?? "—";

  const [orders, bulk, subs, addresses, reviews, loyaltyTx] = await Promise.all([
    db.from("orders").select("id, order_number, total, status, created_at").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("bulk_requests").select("id, quantity, unit, status, created_at, product:products(name)").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("subscriptions").select("id, interval, status, next_reminder_date, product:products(name)").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("addresses").select("id, label, recipient, line1, city, phone").eq("user_id", id),
    db.from("reviews").select("id, rating, title, status, created_at, product:products(name)").eq("user_id", id).order("created_at", { ascending: false }),
    db.from("loyalty_transactions").select("id, type, points, balance_after, note, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(100),
  ]);

  const orderRows = (orders.data as any[]) ?? [];
  const spent = orderRows
    .filter((o) => !REVENUE_EXCLUDED.includes(o.status))
    .reduce((s, o) => s + (Number(o.total) || 0), 0);
  const paidCount = orderRows.filter((o) => !REVENUE_EXCLUDED.includes(o.status)).length;
  const activeSubs = ((subs.data as any[]) ?? []).filter((s) => s.status === "active").length;

  return {
    id: user.id,
    name: user.name,
    email,
    phone: user.phone,
    created_at: user.created_at,
    blocked: user.blocked,
    loyalty_points: user.loyalty_points ?? 0,
    internal_notes: user.admin_notes ?? null,
    kpis: {
      totalOrders: orderRows.length,
      totalSpent: spent,
      aov: paidCount > 0 ? spent / paidCount : 0,
      activeSubscriptions: activeSubs,
    },
    orders: orderRows.map((o) => ({
      id: o.id,
      order_number: o.order_number,
      total: Number(o.total) || 0,
      status: o.status,
      created_at: o.created_at,
    })),
    bulkRequests: ((bulk.data as any[]) ?? []).map((b) => ({
      id: b.id,
      product_name: b.product?.name ?? null,
      quantity: Number(b.quantity) || 0,
      unit: b.unit,
      status: b.status,
      created_at: b.created_at,
    })),
    subscriptions: ((subs.data as any[]) ?? []).map((s) => ({
      id: s.id,
      product_name: s.product?.name ?? "—",
      interval: s.interval,
      status: s.status,
      next_reminder_date: s.next_reminder_date,
    })),
    addresses: ((addresses.data as any[]) ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      recipient: a.recipient,
      line1: a.line1,
      city: a.city,
      phone: a.phone,
    })),
    reviews: ((reviews.data as any[]) ?? []).map((rv) => ({
      id: rv.id,
      product_name: rv.product?.name ?? "—",
      rating: rv.rating,
      title: rv.title,
      status: rv.status,
      created_at: rv.created_at,
    })),
    loyaltyTx: ((loyaltyTx.data as any[]) ?? []).map((t) => ({
      id: t.id,
      type: t.type,
      points: t.points,
      balance_after: t.balance_after,
      note: t.note,
      created_at: t.created_at,
    })),
  };
}
