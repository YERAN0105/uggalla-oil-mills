import { createAdminClient } from "@/lib/supabase/admin";
import type { AddressSnapshot, OrderItemRow } from "@/types/checkout";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Turn a stored bank-receipt `image_url` into a short-lived signed URL.
 * Receipts are saved as a bare storage path (e.g. `UOM-…/123.jpeg`) in the
 * private `payment-receipts` bucket; older rows may hold a full URL. Returns a
 * usable URL in both cases (falls back to the stored value if signing fails).
 */
async function signReceiptUrl(
  db: ReturnType<typeof createAdminClient>,
  imageUrl: string
): Promise<string> {
  const path = imageUrl.includes("/payment-receipts/")
    ? imageUrl.split("/payment-receipts/")[1]
    : imageUrl;
  if (!path) return imageUrl;
  try {
    const { data } = await db.storage.from("payment-receipts").createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? imageUrl;
  } catch {
    return imageUrl;
  }
}

export interface AdminOrderListRow {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string | null;
  created_at: string;
  items_count: number;
  total: number;
  payment_method: string;
  payment_status: string;
  status: string;
  fulfillment_type: string;
}

export interface OrderStatusHistoryRow {
  id: string;
  status: string;
  note: string | null;
  changed_at: string;
  changed_by_name: string | null;
}

export interface AdminOrderDetail {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  fulfillment_type: "delivery" | "pickup";
  created_at: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  address_snapshot: AddressSnapshot | null;
  delivery_date: string | null;
  delivery_zone: { name: string; fee: number } | null;
  time_slot: { label: string } | null;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  coupon_code: string | null;
  loyalty_points_used: number;
  loyalty_discount: number;
  tax_amount: number;
  total: number;
  notes: string | null;
  internal_notes: string | null;
  /** Set when this order was created from a bulk request (for the back-link). */
  bulk_request_id: string | null;
  items: OrderItemRow[];
  history: OrderStatusHistoryRow[];
  bank_receipt: {
    id: string;
    image_url: string;
    status: string;
    reject_reason: string | null;
    uploaded_at: string;
  } | null;
  payment: {
    gateway: string;
    gateway_transaction_id: string | null;
    status: string;
    raw_response: unknown;
  } | null;
}

export interface OrderListParams {
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  fulfillment?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export async function listOrders(
  params: OrderListParams
): Promise<{ rows: AdminOrderListRow[]; total: number }> {
  const db = createAdminClient();
  const perPage = params.perPage ?? 50;
  const page = Math.max(1, params.page ?? 1);

  let query = db
    .from("orders")
    .select(
      "id, order_number, created_at, total, payment_method, payment_status, status, fulfillment_type, guest_email, guest_phone, user:users(name, phone), order_items(count)",
      { count: "exact" }
    );

  if (params.status) {
    const statuses = params.status.split(",").filter(Boolean);
    if (statuses.length) query = query.in("status", statuses);
  }
  if (params.paymentMethod) query = query.eq("payment_method", params.paymentMethod);
  if (params.paymentStatus) query = query.eq("payment_status", params.paymentStatus);
  if (params.fulfillment) query = query.eq("fulfillment_type", params.fulfillment);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  if (params.search) {
    const like = `%${params.search}%`;
    query = query.or(
      `order_number.ilike.${like},guest_email.ilike.${like},guest_phone.ilike.${like}`
    );
  }

  if (params.sort === "total") query = query.order("total", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, count } = await query;
  const rows = ((data as any[]) ?? []).map((o) => ({
    id: o.id,
    order_number: o.order_number,
    customer_name: o.user?.name || o.guest_email || "Guest",
    customer_phone: o.user?.phone || o.guest_phone || null,
    created_at: o.created_at,
    items_count: o.order_items?.[0]?.count ?? 0,
    total: Number(o.total) || 0,
    payment_method: o.payment_method,
    payment_status: o.payment_status,
    status: o.status,
    fulfillment_type: o.fulfillment_type,
  }));

  return { rows, total: count ?? rows.length };
}

export async function getOrderDetail(orderNumber: string): Promise<AdminOrderDetail | null> {
  const db = createAdminClient();
  const { data: o, error } = await db
    .from("orders")
    .select(
      "*, user:users(name, phone), delivery_zone:delivery_zones(name, fee), time_slot:time_slots(label), coupon:coupons!orders_coupon_id_fkey(code), order_items(*), order_status_history(*), bank_transfer_receipts(*), payments(*)"
    )
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (error) console.error("[getOrderDetail] query failed:", error.message);
  if (!o) return null;
  const row = o as any;

  // Resolve auth email for the customer (users table has no email).
  let customerEmail: string | null = row.guest_email ?? null;
  if (row.user_id) {
    const { data: authUser } = await db.auth.admin.getUserById(row.user_id);
    customerEmail = authUser?.user?.email ?? customerEmail;
  }

  // Receipt: signed URL (private bucket).
  // Prefer the newest pending receipt (customer re-upload after rejection);
  // fall back to the most-recently uploaded receipt overall.
  let receipt = null as AdminOrderDetail["bank_receipt"];
  const allReceipts = ((row.bank_transfer_receipts ?? []) as any[]).sort(
    (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
  );
  const rec = allReceipts.find((r) => r.status === "pending") ?? allReceipts[0];
  if (rec) {
    receipt = {
      id: rec.id,
      image_url: await signReceiptUrl(db, rec.image_url),
      status: rec.status,
      reject_reason: rec.reject_reason,
      uploaded_at: rec.uploaded_at,
    };
  }

  const payment = (row.payments ?? [])[0]
    ? {
        gateway: row.payments[0].gateway,
        gateway_transaction_id: row.payments[0].gateway_transaction_id,
        status: row.payments[0].status,
        raw_response: row.payments[0].raw_response,
      }
    : null;

  // If this order came from a bulk request, find it (for the back-link).
  let bulkRequestId: string | null = null;
  if (row.source === "bulk_conversion") {
    const { data: bulkReq } = await db
      .from("bulk_requests")
      .select("id")
      .eq("converted_order_id", row.id)
      .maybeSingle();
    bulkRequestId = (bulkReq as any)?.id ?? null;
  }

  // History changed_by names
  const history: OrderStatusHistoryRow[] = [];
  const changerIds = [
    ...new Set((row.order_status_history ?? []).map((h: any) => h.changed_by).filter(Boolean)),
  ];
  const nameMap = new Map<string, string>();
  if (changerIds.length) {
    const { data: changers } = await db.from("users").select("id, name").in("id", changerIds);
    for (const c of (changers as any[]) ?? []) nameMap.set(c.id, c.name);
  }
  for (const h of (row.order_status_history ?? []).sort(
    (a: any, b: any) => new Date(a.changed_at).getTime() - new Date(b.changed_at).getTime()
  )) {
    history.push({
      id: h.id,
      status: h.status,
      note: h.note,
      changed_at: h.changed_at,
      changed_by_name: h.changed_by ? nameMap.get(h.changed_by) ?? null : null,
    });
  }

  return {
    id: row.id,
    order_number: row.order_number,
    status: row.status,
    payment_method: row.payment_method,
    payment_status: row.payment_status,
    fulfillment_type: row.fulfillment_type,
    created_at: row.created_at,
    user_id: row.user_id,
    customer_name: row.user?.name ?? null,
    customer_email: customerEmail,
    customer_phone: row.user?.phone || row.guest_phone || null,
    address_snapshot: row.address_snapshot,
    delivery_date: row.delivery_date,
    delivery_zone: row.delivery_zone
      ? { name: row.delivery_zone.name, fee: Number(row.delivery_zone.fee) }
      : null,
    time_slot: row.time_slot ? { label: row.time_slot.label } : null,
    subtotal: Number(row.subtotal) || 0,
    delivery_fee: Number(row.delivery_fee) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    coupon_code: row.coupon?.code ?? null,
    loyalty_points_used: row.loyalty_points_used ?? 0,
    loyalty_discount: Number(row.loyalty_discount) || 0,
    tax_amount: Number(row.tax_amount) || 0,
    total: Number(row.total) || 0,
    notes: row.notes,
    internal_notes: row.internal_notes,
    bulk_request_id: bulkRequestId,
    items: (row.order_items ?? []).map((it: any) => ({
      id: it.id,
      product_snapshot: it.product_snapshot,
      options: it.options,
      quantity: it.quantity,
      unit_price: Number(it.unit_price) || 0,
      line_total: Number(it.line_total) || 0,
    })),
    history,
    bank_receipt: receipt,
    payment,
  };
}

export async function getPendingBankTransfers(): Promise<
  {
    receipt_id: string;
    order_id: string;
    order_number: string;
    customer: string;
    amount: number;
    uploaded_at: string;
    image_url: string;
  }[]
> {
  const db = createAdminClient();
  const { data } = await db
    .from("bank_transfer_receipts")
    .select("id, image_url, uploaded_at, order:orders(id, order_number, total, guest_email, user:users(name))")
    .eq("status", "pending")
    .order("uploaded_at", { ascending: true });

  const rows = [];
  for (const r of (data as any[]) ?? []) {
    if (!r.order) continue;
    const signed = await signReceiptUrl(db, r.image_url);
    rows.push({
      receipt_id: r.id,
      order_id: r.order.id,
      order_number: r.order.order_number,
      customer: r.order.user?.name || r.order.guest_email || "Guest",
      amount: Number(r.order.total) || 0,
      uploaded_at: r.uploaded_at,
      image_url: signed,
    });
  }
  return rows;
}
