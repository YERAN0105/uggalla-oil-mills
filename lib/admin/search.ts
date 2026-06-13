"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "./guard";

export interface AdminSearchResult {
  type: "product" | "order" | "customer" | "bulk";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Global admin search across products, orders, customers and bulk requests.
 * Returns a flat, capped list grouped by type for the cmd+K palette.
 */
export async function adminGlobalSearch(query: string): Promise<AdminSearchResult[]> {
  const admin = await getAdminUser();
  if (!admin) return [];

  const q = query.trim();
  if (q.length < 2) return [];

  const db = createAdminClient();
  const like = `%${q}%`;
  const results: AdminSearchResult[] = [];

  const [products, orders, customers, bulk] = await Promise.all([
    db
      .from("products")
      .select("id, name, slug, purchase_type")
      .ilike("name", like)
      .is("deleted_at", null)
      .limit(5),
    db
      .from("orders")
      .select("order_number, guest_email, guest_phone, status, total")
      .or(`order_number.ilike.${like},guest_email.ilike.${like},guest_phone.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("users")
      .select("id, name, phone")
      .eq("role", "customer")
      .or(`name.ilike.${like},phone.ilike.${like}`)
      .limit(5),
    db
      .from("bulk_requests")
      .select("id, name, phone, status")
      .or(`name.ilike.${like},phone.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  for (const p of products.data ?? []) {
    results.push({
      type: "product",
      id: p.id,
      title: p.name,
      subtitle: p.purchase_type === "bulk_quote" ? "Bulk product" : "Retail product",
      href: `/admin/products/${p.id}/edit`,
    });
  }
  for (const o of orders.data ?? []) {
    results.push({
      type: "order",
      id: o.order_number,
      title: o.order_number,
      subtitle: o.guest_email || o.guest_phone || o.status,
      href: `/admin/orders/${o.order_number}`,
    });
  }
  for (const c of customers.data ?? []) {
    results.push({
      type: "customer",
      id: c.id,
      title: c.name || "Unnamed customer",
      subtitle: c.phone || "—",
      href: `/admin/customers/${c.id}`,
    });
  }
  for (const b of bulk.data ?? []) {
    results.push({
      type: "bulk",
      id: b.id,
      title: b.name,
      subtitle: `${b.phone} · ${b.status}`,
      href: `/admin/bulk-requests/${b.id}`,
    });
  }

  return results;
}
