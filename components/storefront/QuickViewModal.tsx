"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { StarRating } from "@/components/storefront/StarRating";
import { formatCurrency } from "@/lib/brand";
import { getMinPrice, getPrimaryImage } from "@/lib/product-utils";
import type { ProductWithRelations } from "@/types/supabase";
import { ArrowRight } from "lucide-react";

interface QuickViewModalProps {
  product: ProductWithRelations | null;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: QuickViewModalProps) {
  if (!product) return null;

  const primaryImage = getPrimaryImage(product);
  const minPrice = getMinPrice(product);
  const isBulk = product.purchase_type === "bulk_quote";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="grid sm:grid-cols-2">
          {/* Image */}
          <div className="relative aspect-square bg-sand/40">
            {primaryImage ? (
              <Image
                src={primaryImage.url}
                alt={primaryImage.alt_text ?? product.name}
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                className="object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl">🥥</div>
            )}
            {product.is_featured && (
              <Badge className="absolute top-3 left-3 bg-gold text-green-deep text-xs font-semibold">
                Featured
              </Badge>
            )}
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col gap-4">
            <DialogHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  {product.brands && (
                    <span className="text-eyebrow mb-1 block">{product.brands.name}</span>
                  )}
                  <DialogTitle className="text-xl leading-snug">{product.name}</DialogTitle>
                </div>
                <WishlistButton productId={product.id} productName={product.name} />
              </div>
            </DialogHeader>

            {(product.avg_rating ?? 0) > 0 && (
              <StarRating
                rating={product.avg_rating ?? 0}
                count={product.review_count ?? 0}
                size="md"
              />
            )}

            <div className="text-2xl font-display font-semibold text-green-deep">
              {isBulk ? (
                <span className="text-base font-medium text-green">
                  from {formatCurrency(minPrice)} / L
                </span>
              ) : (
                <>
                  {formatCurrency(minPrice)}
                  {product.product_sizes.length > 1 && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">from</span>
                  )}
                </>
              )}
            </div>

            {product.short_description && (
              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                {product.short_description}
              </p>
            )}

            {/* Sizes preview */}
            {product.product_sizes.length > 0 && !isBulk && (
              <div className="flex flex-wrap gap-1.5">
                {product.product_sizes.slice(0, 4).map((size) => (
                  <span
                    key={size.id}
                    className="text-xs border border-sand rounded-md px-2 py-1 text-green-deep"
                  >
                    {size.label}
                  </span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 mt-auto">
              <Button asChild className="w-full" onClick={onClose}>
                <Link href={`/shop/${product.slug}`}>
                  View Full Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
