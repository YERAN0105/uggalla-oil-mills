"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPrimaryImage } from "@/lib/product-utils";
import type { CartItem } from "@/stores/cart";

export type ReorderResult =
  | {
      ok: true;
      items: Omit<CartItem, "cartId" | "lineTotal">[];
      unavailable: string[];
    }
  | { ok: false; error: string };

/**
 * Build cart lines from a past order, re-validating each item against the
 * current catalog (published, in stock, size still exists, fresh price). Items
 * that can no longer be added are returned by name in `unavailable` so the UI
 * can warn. The client adds the returned lines to the cart store.
 */
export async function reorderItems(orderNumber: string): Promise<ReorderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, order_items(product_id, options, quantity, product_snapshot)")
    .eq("order_number", orderNumber)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderItems = (order.order_items ?? []) as any[];
  const productIds = [...new Set(orderItems.map((i) => i.product_id).filter(Boolean))] as string[];
  if (productIds.length === 0) return { ok: true, items: [], unavailable: [] };

  const { data: products } = await admin
    .from("products")
    .select(
      `id, slug, name, purchase_type, allows_subscription, allows_note, note_max_chars,
       base_price, stock_tracked, stock_quantity, low_stock_threshold, is_published, deleted_at,
       brands:brand_id(name),
       product_images(url, is_primary, display_order, alt_text, id),
       product_sizes(id, label, volume_ml, price, display_order)`
    )
    .in("id", productIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>((products ?? []).map((p: any) => [p.id, p]));

  const items: Omit<CartItem, "cartId" | "lineTotal">[] = [];
  const unavailable: string[] = [];

  for (const oi of orderItems) {
    const p = oi.product_id ? map.get(oi.product_id) : null;
    const displayName = p?.name ?? oi.product_snapshot?.name ?? "An item";

    if (!p || !p.is_published || p.deleted_at || p.purchase_type !== "retail") {
      unavailable.push(displayName);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sizes = (p.product_sizes ?? []) as any[];
    let size: CartItem["size"];
    const wantedSizeId: string | null = oi.options?.size?.id ?? null;
    if (sizes.length > 0) {
      const match = wantedSizeId ? sizes.find((s) => s.id === wantedSizeId) : sizes[0];
      if (!match) {
        unavailable.push(p.name);
        continue;
      }
      size = { id: match.id, label: match.label, volume_ml: match.volume_ml, price: Number(match.price) };
    } else {
      size = { id: null, label: "Standard", volume_ml: null, price: Number(p.base_price) };
    }

    const quantity = Math.max(1, Math.min(99, oi.quantity ?? 1));
    if (p.stock_tracked && p.stock_quantity <= 0) {
      unavailable.push(p.name);
      continue;
    }
    const cappedQty = p.stock_tracked ? Math.min(quantity, p.stock_quantity) : quantity;

    const primary = getPrimaryImage(p);
    items.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brandName: p.brands?.name ?? null,
      image: primary?.url ?? null,
      size,
      quantity: cappedQty,
      note: p.allows_note ? String(oi.options?.note ?? "").slice(0, p.note_max_chars) : "",
      unitPrice: size.price,
      isSubscription: false,
      subscriptionInterval: null,
      stockTracked: p.stock_tracked,
      stockQuantity: p.stock_quantity,
      lowStockThreshold: p.low_stock_threshold,
    });
  }

  return { ok: true, items, unavailable };
}

/**
 * Build a single cart line from a subscription (used by the one-tap reorder link
 * in subscription reminders). Re-validates the product/size against the current
 * catalog. Ownership is enforced by matching `user_id`.
 */
export async function reorderSubscription(subscriptionId: string): Promise<ReorderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("product_id, size_id, quantity")
    .eq("id", subscriptionId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Subscription not found." };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = sub as any;

  const { data: p } = await admin
    .from("products")
    .select(
      `id, slug, name, purchase_type, allows_note, note_max_chars,
       base_price, stock_tracked, stock_quantity, low_stock_threshold, is_published, deleted_at,
       brands:brand_id(name),
       product_images(url, is_primary, display_order, alt_text, id),
       product_sizes(id, label, volume_ml, price, display_order)`
    )
    .eq("id", s.product_id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prod = p as any;
  const displayName = prod?.name ?? "This product";
  if (!prod || !prod.is_published || prod.deleted_at || prod.purchase_type !== "retail") {
    return { ok: true, items: [], unavailable: [displayName] };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sizes = (prod.product_sizes ?? []) as any[];
  let size: CartItem["size"];
  if (sizes.length > 0) {
    const match = s.size_id ? sizes.find((z) => z.id === s.size_id) : sizes[0];
    if (!match) return { ok: true, items: [], unavailable: [displayName] };
    size = { id: match.id, label: match.label, volume_ml: match.volume_ml, price: Number(match.price) };
  } else {
    size = { id: null, label: "Standard", volume_ml: null, price: Number(prod.base_price) };
  }

  if (prod.stock_tracked && prod.stock_quantity <= 0) {
    return { ok: true, items: [], unavailable: [displayName] };
  }
  const quantity = Math.max(1, Math.min(99, s.quantity ?? 1));
  const cappedQty = prod.stock_tracked ? Math.min(quantity, prod.stock_quantity) : quantity;
  const primary = getPrimaryImage(prod);

  return {
    ok: true,
    items: [
      {
        productId: prod.id,
        slug: prod.slug,
        name: prod.name,
        brandName: prod.brands?.name ?? null,
        image: primary?.url ?? null,
        size,
        quantity: cappedQty,
        note: "",
        unitPrice: size.price,
        isSubscription: false,
        subscriptionInterval: null,
        stockTracked: prod.stock_tracked,
        stockQuantity: prod.stock_quantity,
        lowStockThreshold: prod.low_stock_threshold,
      },
    ],
    unavailable: [],
  };
}
