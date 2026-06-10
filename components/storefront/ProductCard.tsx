import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { StarRating } from "@/components/storefront/StarRating";
import { formatCurrency } from "@/lib/brand";
import { getMinPrice, getPrimaryImage } from "@/lib/product-utils";
import type { ProductWithRelations } from "@/types/supabase";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";

interface ProductCardProps {
  product: ProductWithRelations;
  onQuickView?: (product: ProductWithRelations) => void;
}

export function ProductCard({ product, onQuickView }: ProductCardProps) {
  const primaryImage = getPrimaryImage(product);
  const minPrice = getMinPrice(product);
  const isBulk = product.purchase_type === "bulk_quote";
  const isOutOfStock =
    product.stock_tracked && product.stock_quantity <= 0 && !isBulk;
  const hasMultipleSizes = product.product_sizes.length > 1;

  return (
    <div className="group relative flex flex-col rounded-xl overflow-hidden bg-white border border-sand hover:border-green/30 hover:shadow-[0_8px_30px_rgba(27,107,58,0.12)] transition-all duration-300">
      {/* Image */}
      <Link href={`/shop/${product.slug}`} aria-label={product.name} className="block relative aspect-square overflow-hidden bg-sand/50">
        {primaryImage ? (
          <Image
            src={primaryImage.url}
            alt={primaryImage.alt_text ?? product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-500 group-hover:scale-105",
              isOutOfStock && "opacity-60 grayscale"
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-sage/30 flex items-center justify-center">
            <span className="text-green/30 text-4xl">🥥</span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.is_featured && (
            <Badge className="bg-gold text-green-deep text-[10px] font-semibold px-1.5 py-0.5 shadow-sm">
              Featured
            </Badge>
          )}
          {product.is_bestseller && !product.is_featured && (
            <Badge className="bg-green text-white text-[10px] font-semibold px-1.5 py-0.5 shadow-sm">
              Bestseller
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary" className="text-[10px] font-semibold px-1.5 py-0.5">
              Out of Stock
            </Badge>
          )}
        </div>

        {/* Wishlist */}
        <div className="absolute top-2 right-2">
          <WishlistButton productId={product.id} productName={product.name} size="sm" />
        </div>

        {/* Quick view overlay (desktop) — pointer-events-none so it never steals
            clicks from the wishlist heart; only the button itself is clickable */}
        {onQuickView && (
          <div className="pointer-events-none absolute inset-0 bg-green-deep/0 group-hover:bg-green-deep/10 transition-colors duration-300 hidden md:flex items-end justify-center pb-4 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.preventDefault();
                onQuickView(product);
              }}
              className="pointer-events-auto bg-white text-green-deep text-xs font-semibold px-3 py-1.5 rounded-full shadow-md hover:bg-cream transition-colors translate-y-2 group-hover:translate-y-0 transition-transform duration-300"
            >
              Quick View
            </button>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3 gap-2">
        {/* Brand + Category */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {product.brands && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-green">
              {product.brands.name}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {product.categories.name}
          </span>
        </div>

        {/* Name */}
        <Link href={`/shop/${product.slug}`} className="hover:text-green transition-colors">
          <h3 className="font-display text-sm font-semibold text-green-deep leading-snug line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {(product.avg_rating ?? 0) > 0 ? (
          <StarRating
            rating={product.avg_rating ?? 0}
            count={product.review_count ?? 0}
          />
        ) : (
          <span className="text-xs text-muted-foreground">No reviews yet</span>
        )}

        {/* Price + CTA */}
        <div className="flex items-center justify-between mt-auto pt-2">
          <div>
            {isBulk ? (
              <div className="flex items-center gap-1 text-green text-xs font-medium">
                <Tag className="h-3 w-3" />
                <span>from {formatCurrency(minPrice)} / L</span>
              </div>
            ) : (
              <div>
                <span className="text-green-deep font-semibold text-sm">
                  {formatCurrency(minPrice)}
                </span>
                {hasMultipleSizes && (
                  <span className="text-xs text-muted-foreground ml-1">from</span>
                )}
              </div>
            )}
          </div>

          <Link
            href={`/shop/${product.slug}`}
            className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-full transition-colors",
              isBulk
                ? "bg-green/10 text-green hover:bg-green/20"
                : isOutOfStock
                ? "bg-sand text-muted-foreground cursor-not-allowed"
                : "bg-green text-white hover:bg-green-700"
            )}
          >
            {isBulk ? "Get Quote" : isOutOfStock ? "Out of Stock" : "View"}
          </Link>
        </div>
      </div>
    </div>
  );
}
