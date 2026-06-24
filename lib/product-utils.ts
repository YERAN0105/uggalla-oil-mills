import type { ProductWithRelations } from "@/types/supabase";

export function getMinPrice(product: ProductWithRelations): number {
  if (product.product_sizes.length === 0) return Number(product.base_price);
  return Math.min(...product.product_sizes.map((s) => Number(s.price)));
}

export interface DiscountInfo {
  /** The original ("was") price, struck through. */
  original: number;
  /** The current selling price. */
  price: number;
  /** Whole-number percent off, e.g. 25 for "25% OFF". */
  percent: number;
}

/**
 * Returns sale info for a single size's selling price + optional original
 * price, or null when there's no genuine discount (original missing or not
 * higher than the selling price).
 */
export function getSizeDiscount(
  price: number,
  compareAt: number | null | undefined
): DiscountInfo | null {
  if (compareAt == null) return null;
  const original = Number(compareAt);
  const current = Number(price);
  if (!(original > current)) return null;
  return {
    original,
    price: current,
    percent: Math.round(((original - current) / original) * 100),
  };
}

/**
 * Discount for the price shown on cards/listings — i.e. the cheapest size
 * (the "from" price). Bulk products (no sizes) never show a discount.
 */
export function getDisplayDiscount(
  product: ProductWithRelations
): DiscountInfo | null {
  if (product.product_sizes.length === 0) return null;
  const cheapest = product.product_sizes.reduce((lowest, s) =>
    Number(s.price) < Number(lowest.price) ? s : lowest
  );
  return getSizeDiscount(cheapest.price, cheapest.compare_at_price);
}

export function getPrimaryImage(
  product: ProductWithRelations
): ProductWithRelations["product_images"][0] | undefined {
  return (
    product.product_images.find((img) => img.is_primary) ?? product.product_images[0]
  );
}
