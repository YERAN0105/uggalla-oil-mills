import type { ProductWithRelations } from "@/types/supabase";

export function getMinPrice(product: ProductWithRelations): number {
  if (product.product_sizes.length === 0) return Number(product.base_price);
  return Math.min(...product.product_sizes.map((s) => Number(s.price)));
}

export function getPrimaryImage(
  product: ProductWithRelations
): ProductWithRelations["product_images"][0] | undefined {
  return (
    product.product_images.find((img) => img.is_primary) ?? product.product_images[0]
  );
}
