import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AccountOrderSummary,
  AccountOrderDetail,
  AccountSubscription,
  AccountBulkRequest,
  AccountAddress,
  LoyaltyTransaction,
  AccountReview,
  AccountDashboard,
} from "@/types/account";

/**
 * The signed-in customer's auth user + profile, or null. Account pages call this
 * and redirect to /login when null. Blocked / soft-deleted accounts read as
 * signed-out so they cannot use the account area.
 */
export async function getAccountUser(): Promise<{
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  loyaltyPoints: number;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("name, phone, loyalty_points, blocked, deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.blocked || profile?.deleted_at) return null;

  // Fall back to the auth user's metadata (set at sign-up / OAuth) when the
  // public.users columns are empty, so the profile always pre-fills.
  const meta = user.user_metadata ?? {};
  const name = profile?.name?.trim() || (meta.name as string) || (meta.full_name as string) || null;
  const phone = profile?.phone?.trim() || (meta.phone as string) || null;

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    phone,
    loyaltyPoints: profile?.loyalty_points ?? 0,
  };
}

// Account reads use the service-role client filtered by user_id (authorization
// enforced here). This mirrors the order-write pattern and avoids RLS join gaps
// when a referenced product has since been unpublished.

/* eslint-disable @typescript-eslint/no-explicit-any */

function summariseOrder(row: any): AccountOrderSummary {
  const items = (row.order_items ?? []) as any[];
  const thumbnails = items
    .map((i) => i.product_snapshot?.image)
    .filter((u): u is string => !!u)
    .slice(0, 4);
  const itemCount = items.reduce((sum, i) => sum + (i.quantity ?? 0), 0);
  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    fulfillment_type: row.fulfillment_type,
    total: Number(row.total),
    created_at: row.created_at,
    delivery_date: row.delivery_date,
    item_count: itemCount,
    thumbnails,
  };
}

const SUMMARY_SELECT = `
  id, order_number, status, payment_method, payment_status, fulfillment_type,
  total, created_at, delivery_date,
  order_items(quantity, product_snapshot)
`;

export interface OrdersQuery {
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function getAccountOrders(
  userId: string,
  q: OrdersQuery = {}
): Promise<{ orders: AccountOrderSummary[]; totalCount: number }> {
  const admin = createAdminClient();
  const page = q.page ?? 1;
  const pageSize = q.pageSize ?? 8;
  const offset = (page - 1) * pageSize;

  let query = admin
    .from("orders")
    .select(SUMMARY_SELECT, { count: "exact" })
    .eq("user_id", userId);

  if (q.status && q.status !== "all") query = query.eq("status", q.status);
  if (q.search?.trim()) query = query.ilike("order_number", `%${q.search.trim()}%`);
  if (q.from) query = query.gte("created_at", q.from);
  if (q.to) query = query.lte("created_at", `${q.to}T23:59:59`);

  query = query.order("created_at", { ascending: false }).range(offset, offset + pageSize - 1);

  const { data, count } = await query;
  return {
    orders: (data ?? []).map(summariseOrder),
    totalCount: count ?? 0,
  };
}

const DETAIL_SELECT = `
  id, order_number, user_id, status, fulfillment_type, address_snapshot,
  delivery_date, payment_method, payment_status, subtotal, delivery_fee,
  discount_amount, tax_amount, loyalty_points_used, loyalty_discount, total,
  notes, created_at,
  order_items(id, product_id, product_snapshot, options, quantity, unit_price, line_total),
  delivery_zone:delivery_zone_id(id, name, estimated_time),
  time_slot:time_slot_id(id, label),
  order_status_history(status, note, changed_at),
  bank_transfer_receipts(id, status)
`;

export async function getAccountOrderDetail(
  userId: string,
  orderNumber: string
): Promise<AccountOrderDetail | null> {
  const admin = createAdminClient();
  const { data: rawRow } = await admin
    .from("orders")
    .select(DETAIL_SELECT)
    .eq("order_number", orderNumber)
    .eq("user_id", userId)
    .maybeSingle();
  if (!rawRow) return null;
  const row = rawRow as any;

  const itemIds = (row.order_items ?? []).map((i: any) => i.id);
  const reviewedItemIds = new Set<string>();
  if (itemIds.length > 0) {
    const { data: revs } = await admin
      .from("reviews")
      .select("order_item_id")
      .eq("user_id", userId)
      .in("order_item_id", itemIds);
    for (const r of revs ?? []) if (r.order_item_id) reviewedItemIds.add(r.order_item_id);
  }

  const history = ((row.order_status_history ?? []) as any[])
    .map((h) => ({ status: h.status, note: h.note, changed_at: h.changed_at }))
    .sort((a, b) => +new Date(a.changed_at) - +new Date(b.changed_at));

  return {
    id: row.id,
    order_number: row.order_number,
    user_id: row.user_id,
    status: row.status,
    fulfillment_type: row.fulfillment_type,
    delivery_zone: row.delivery_zone ?? null,
    address_snapshot: row.address_snapshot ?? null,
    delivery_date: row.delivery_date,
    time_slot: row.time_slot ?? null,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    subtotal: Number(row.subtotal),
    delivery_fee: Number(row.delivery_fee),
    discount_amount: Number(row.discount_amount),
    tax_amount: Number(row.tax_amount),
    loyalty_points_used: row.loyalty_points_used,
    loyalty_discount: Number(row.loyalty_discount),
    total: Number(row.total),
    notes: row.notes,
    created_at: row.created_at,
    order_items: (row.order_items ?? []).map((i: any) => ({
      ...i,
      reviewed: reviewedItemIds.has(i.id),
    })),
    history,
    bank_receipt: (row.bank_transfer_receipts ?? [])[0] ?? null,
  };
}

export async function getAccountSubscriptions(userId: string): Promise<AccountSubscription[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select(
      `id, product_id, size_id, quantity, interval, next_reminder_date, status, created_at,
       products:product_id(name, slug, is_published, deleted_at, stock_tracked, stock_quantity,
         product_images(url, is_primary, display_order)),
       product_sizes:size_id(label, price)`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as any[]).map((s) => {
    const p = s.products;
    const imgs = (p?.product_images ?? []) as any[];
    const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
    const available =
      !!p &&
      p.is_published &&
      !p.deleted_at &&
      (!p.stock_tracked || p.stock_quantity > 0);
    return {
      id: s.id,
      product_id: s.product_id,
      product_name: p?.name ?? "Unavailable product",
      product_slug: p?.slug ?? "",
      image: primary?.url ?? null,
      is_available: available,
      size_id: s.size_id,
      size_label: s.product_sizes?.label ?? null,
      size_price: s.product_sizes ? Number(s.product_sizes.price) : null,
      quantity: s.quantity,
      interval: s.interval,
      next_reminder_date: s.next_reminder_date,
      status: s.status,
      created_at: s.created_at,
    } satisfies AccountSubscription;
  });
}

export async function getAccountBulkRequests(userId: string): Promise<AccountBulkRequest[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("bulk_requests")
    .select(
      `id, quantity, unit, fulfillment_type, preferred_date, notes, status,
       quoted_unit_price, quoted_total, quote_message, payment_mode, quote_token,
       quote_expires_at, converted_order_id, created_at,
       products:product_id(name),
       orders:converted_order_id(order_number)`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    product_name: r.products?.name ?? null,
    quantity: Number(r.quantity),
    unit: r.unit,
    fulfillment_type: r.fulfillment_type,
    preferred_date: r.preferred_date,
    notes: r.notes,
    status: r.status,
    quoted_unit_price: r.quoted_unit_price != null ? Number(r.quoted_unit_price) : null,
    quoted_total: r.quoted_total != null ? Number(r.quoted_total) : null,
    quote_message: r.quote_message,
    payment_mode: r.payment_mode,
    quote_token: r.quote_token,
    quote_expires_at: r.quote_expires_at,
    converted_order_id: r.converted_order_id,
    converted_order_number: r.orders?.order_number ?? null,
    created_at: r.created_at,
  }));
}

export async function getAccountAddresses(userId: string): Promise<AccountAddress[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("addresses")
    .select("id, label, recipient, phone, line1, line2, city, postal_code, is_default, delivery_zone_id")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });
  return (data ?? []) as AccountAddress[];
}

export async function getLoyalty(
  userId: string
): Promise<{ balance: number; transactions: LoyaltyTransaction[] }> {
  const admin = createAdminClient();
  const [{ data: profile }, { data: txs }] = await Promise.all([
    admin.from("users").select("loyalty_points").eq("id", userId).maybeSingle(),
    admin
      .from("loyalty_transactions")
      .select("id, type, points, balance_after, note, created_at, expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  return {
    balance: profile?.loyalty_points ?? 0,
    transactions: (txs ?? []) as LoyaltyTransaction[],
  };
}

export async function getAccountReviews(userId: string): Promise<AccountReview[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("reviews")
    .select(
      `id, product_id, rating, title, body, status, admin_reply, created_at,
       products:product_id(name, slug, product_images(url, is_primary, display_order)),
       review_images(url)`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  return ((data ?? []) as any[]).map((r) => {
    const imgs = (r.products?.product_images ?? []) as any[];
    const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
    return {
      id: r.id,
      product_id: r.product_id,
      product_name: r.products?.name ?? "Product",
      product_slug: r.products?.slug ?? "",
      image: primary?.url ?? null,
      rating: r.rating,
      title: r.title,
      body: r.body,
      status: r.status,
      admin_reply: r.admin_reply,
      created_at: r.created_at,
      images: (r.review_images ?? []).map((ri: any) => ri.url),
    };
  });
}

export async function getWishlistProductIds(userId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wishlist")
    .select("product_id, added_at")
    .eq("user_id", userId)
    .order("added_at", { ascending: false });
  return (data ?? []).map((w: any) => w.product_id);
}

export async function getDashboard(userId: string): Promise<AccountDashboard> {
  const admin = createAdminClient();
  const [
    { data: profile },
    { count: totalOrders },
    { count: activeSubscriptions },
    { count: wishlistCount },
    { data: recent },
  ] = await Promise.all([
    admin.from("users").select("name, loyalty_points").eq("id", userId).maybeSingle(),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "active"),
    admin.from("wishlist").select("*", { count: "exact", head: true }).eq("user_id", userId),
    admin
      .from("orders")
      .select(SUMMARY_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const fullName = profile?.name ?? "";
  const firstName = fullName.trim().split(/\s+/)[0] || "there";

  return {
    firstName,
    totalOrders: totalOrders ?? 0,
    loyaltyPoints: profile?.loyalty_points ?? 0,
    activeSubscriptions: activeSubscriptions ?? 0,
    wishlistCount: wishlistCount ?? 0,
    recentOrder: recent ? summariseOrder(recent) : null,
  };
}
