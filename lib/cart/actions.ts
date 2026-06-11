"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getPrimaryImage } from "@/lib/product-utils";
import type { CartItem } from "@/stores/cart";

const ValidateSchema = z.object({
  productId: z.string().uuid(),
  sizeId: z.string().uuid().nullable(),
  quantity: z.coerce.number().int().min(1).max(99),
  note: z.string().max(500).optional().default(""),
  isSubscription: z.boolean().optional().default(false),
  subscriptionInterval: z.enum(["weekly", "biweekly", "monthly"]).nullable().optional().default(null),
});

export type ValidateCartItemInput = z.input<typeof ValidateSchema>;

export type ValidateCartItemResult =
  | { ok: true; item: Omit<CartItem, "cartId" | "lineTotal"> }
  | { ok: false; error: string };

/**
 * Server-side authority for adding a retail product to the cart. Re-fetches the
 * product + chosen size, recomputes the price (the client price is ignored),
 * enforces retail-only, subscription rules, note length, and stock, then returns
 * a fully-formed cart line for the store to insert.
 */
export async function validateCartItem(input: unknown): Promise<ValidateCartItemResult> {
  const parsed = ValidateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid item selection." };
  const data = parsed.data;

  const supabase = await createClient();

  const { data: product, error } = await supabase
    .from("products")
    .select(
      `id, slug, name, purchase_type, allows_subscription, allows_note, note_max_chars,
       base_price, stock_tracked, stock_quantity, low_stock_threshold,
       brands:brand_id(name),
       product_images(url, is_primary, display_order, alt_text, id),
       product_sizes(id, label, volume_ml, price, display_order)`
    )
    .eq("id", data.productId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (error || !product) return { ok: false, error: "Product not found." };

  if (product.purchase_type !== "retail") {
    return { ok: false, error: "Bulk products are purchased via a quote request, not the cart." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sizes = (product.product_sizes ?? []) as any[];
  let chosenSize: { id: string | null; label: string; volume_ml: number | null; price: number };

  if (sizes.length > 0) {
    if (sizes.length > 1 && !data.sizeId) {
      return { ok: false, error: "Please select a size." };
    }
    const match = data.sizeId
      ? sizes.find((s) => s.id === data.sizeId)
      : sizes[0]; // single-size product: implicit
    if (!match) return { ok: false, error: "That size is no longer available." };
    chosenSize = {
      id: match.id,
      label: match.label,
      volume_ml: match.volume_ml,
      price: Number(match.price),
    };
  } else {
    // Sizeless retail product — fall back to base_price.
    chosenSize = {
      id: null,
      label: "Standard",
      volume_ml: null,
      price: Number(product.base_price),
    };
  }

  // Subscription rules.
  let isSubscription = data.isSubscription;
  let subscriptionInterval = data.subscriptionInterval;
  if (isSubscription && !product.allows_subscription) {
    isSubscription = false;
    subscriptionInterval = null;
  }
  if (isSubscription && !subscriptionInterval) subscriptionInterval = "monthly";
  if (!isSubscription) subscriptionInterval = null;

  // Note rules.
  let note = data.note ?? "";
  if (!product.allows_note) note = "";
  else note = note.slice(0, product.note_max_chars);

  // Stock check.
  if (product.stock_tracked && product.stock_quantity < data.quantity) {
    return {
      ok: false,
      error:
        product.stock_quantity <= 0
          ? "This product is out of stock."
          : `Only ${product.stock_quantity} left in stock.`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const primary = getPrimaryImage(product as any);

  return {
    ok: true,
    item: {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      brandName: (product.brands as any)?.name ?? null,
      image: primary?.url ?? null,
      size: chosenSize,
      quantity: data.quantity,
      note,
      unitPrice: chosenSize.price,
      isSubscription,
      subscriptionInterval,
      stockTracked: product.stock_tracked,
      stockQuantity: product.stock_quantity,
      lowStockThreshold: product.low_stock_threshold,
    },
  };
}
