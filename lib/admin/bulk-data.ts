import { createAdminClient } from "@/lib/supabase/admin";
import type { AddressSnapshot } from "@/types/checkout";
import type { BulkRequestItem } from "@/types/supabase";
import { normalizeBulkItems, shortBulkItemsLabel } from "@/lib/bulk/items";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface BulkRequestListRow {
  id: string;
  name: string;
  phone: string;
  /** Compact summary, e.g. "Coconut Oil +2 more". */
  product_name: string | null;
  items: BulkRequestItem[];
  quantity: number;
  unit: string;
  fulfillment_type: string;
  status: string;
  created_at: string;
}

export interface BulkRequestDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  user_id: string | null;
  product_id: string | null;
  product_name: string | null;
  items: BulkRequestItem[];
  quantity: number;
  unit: string;
  preferred_date: string | null;
  fulfillment_type: "delivery" | "pickup";
  address_snapshot: AddressSnapshot | null;
  notes: string | null;
  status: string;
  quoted_unit_price: number | null;
  quoted_total: number | null;
  quote_message: string | null;
  payment_mode: "offline" | "online";
  quote_token: string | null;
  quote_expires_at: string | null;
  internal_notes: string | null;
  converted_order_id: string | null;
  converted_order_number: string | null;
  attachments: string[];
  created_at: string;
}

export interface BulkListParams {
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listBulkRequests(params: BulkListParams): Promise<BulkRequestListRow[]> {
  const db = createAdminClient();
  let query = db
    .from("bulk_requests")
    .select(
      "id, name, phone, product_id, quantity, unit, items, fulfillment_type, status, created_at, product:products(name)"
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (params.status) query = query.eq("status", params.status);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);
  if (params.search) {
    const like = `%${params.search}%`;
    query = query.or(`name.ilike.${like},phone.ilike.${like}`);
  }

  const { data } = await query;
  return ((data as any[]) ?? []).map((b) => {
    const items = normalizeBulkItems(b.items, {
      product_id: b.product_id ?? null,
      name: b.product?.name ?? null,
      quantity: Number(b.quantity) || 0,
      unit: b.unit,
    });
    return {
      id: b.id,
      name: b.name,
      phone: b.phone,
      product_name: items.length ? shortBulkItemsLabel(items) : b.product?.name ?? null,
      items,
      quantity: Number(b.quantity) || 0,
      unit: b.unit,
      fulfillment_type: b.fulfillment_type,
      status: b.status,
      created_at: b.created_at,
    };
  });
}

export async function getBulkRequestDetail(id: string): Promise<BulkRequestDetail | null> {
  const db = createAdminClient();
  const { data: b } = await db
    .from("bulk_requests")
    .select(
      "*, product:products(name), converted_order:orders!converted_order_id(order_number), attachments:bulk_request_attachments(url)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!b) return null;
  const row = b as any;
  const items = normalizeBulkItems(row.items, {
    product_id: row.product_id ?? null,
    name: row.product?.name ?? null,
    quantity: Number(row.quantity) || 0,
    unit: row.unit,
  });

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    user_id: row.user_id,
    product_id: row.product_id,
    product_name: row.product?.name ?? null,
    items,
    quantity: Number(row.quantity) || 0,
    unit: row.unit,
    preferred_date: row.preferred_date,
    fulfillment_type: row.fulfillment_type,
    address_snapshot: row.address_snapshot,
    notes: row.notes,
    status: row.status,
    quoted_unit_price: row.quoted_unit_price != null ? Number(row.quoted_unit_price) : null,
    quoted_total: row.quoted_total != null ? Number(row.quoted_total) : null,
    quote_message: row.quote_message,
    payment_mode: row.payment_mode,
    quote_token: row.quote_token,
    quote_expires_at: row.quote_expires_at,
    internal_notes: row.internal_notes,
    converted_order_id: row.converted_order_id,
    converted_order_number: row.converted_order?.order_number ?? null,
    attachments: ((row.attachments as any[]) ?? []).map((a) => a.url),
    created_at: row.created_at,
  };
}
