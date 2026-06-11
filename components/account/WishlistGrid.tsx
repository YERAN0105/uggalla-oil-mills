"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { X, ShoppingCart, Tag, Loader2, Heart } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/account/primitives";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/brand";
import { getMinPrice, getPrimaryImage } from "@/lib/product-utils";
import { validateCartItem } from "@/lib/cart/actions";
import { toggleWishlistDb } from "@/lib/wishlist/actions";
import { useCartStore } from "@/stores/cart";
import { useWishlistStore } from "@/stores/wishlistStore";
import type { ProductWithRelations } from "@/types/supabase";

interface Props {
  products: ProductWithRelations[];
  unavailable: { id: string; name: string }[];
}

export function WishlistGrid({ products, unavailable }: Props) {
  const [items, setItems] = useState(products);
  const [unavail, setUnavail] = useState(unavailable);
  const [busyId, setBusyId] = useState<string | null>(null);
  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const storeToggle = useWishlistStore((s) => s.toggle);

  const remove = async (productId: string) => {
    setBusyId(productId);
    // optimistic
    setItems((prev) => prev.filter((p) => p.id !== productId));
    setUnavail((prev) => prev.filter((p) => p.id !== productId));
    storeToggle(productId);
    try {
      const res = await toggleWishlistDb(productId);
      if (!res.ok) {
        toast.error(res.error);
      } else {
        toast.success("Removed from wishlist");
      }
    } finally {
      setBusyId(null);
    }
  };

  const addToCart = async (product: ProductWithRelations) => {
    setBusyId(product.id);
    try {
      const sizeId = product.product_sizes.length > 0 ? product.product_sizes[0].id : null;
      const res = await validateCartItem({
        productId: product.id,
        sizeId,
        quantity: 1,
        note: "",
        isSubscription: false,
        subscriptionInterval: null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      addItem(res.item);
      openDrawer();
      toast.success("Added to your cart.");
    } finally {
      setBusyId(null);
    }
  };

  if (items.length === 0 && unavail.length === 0) {
    return (
      <EmptyState
        icon={<Heart className="h-7 w-7 text-green" />}
        title="Your wishlist is empty"
        description="Tap the heart on any product to save it here for later."
        ctaHref="/shop"
        ctaLabel="Discover oils"
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
      {items.map((product) => {
        const primary = getPrimaryImage(product);
        const minPrice = getMinPrice(product);
        const isBulk = product.purchase_type === "bulk_quote";
        const outOfStock = product.stock_tracked && product.stock_quantity <= 0 && !isBulk;
        const multiSize = product.product_sizes.length > 1;
        const busy = busyId === product.id;

        return (
          <div
            key={product.id}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-sand bg-white"
          >
            <button
              onClick={() => remove(product.id)}
              disabled={busy}
              aria-label="Remove from wishlist"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-green-deep/60 shadow-sm transition-colors hover:bg-white hover:text-red-500"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </button>

            <Link href={`/shop/${product.slug}`} className="relative block aspect-square overflow-hidden bg-sand/50">
              {primary ? (
                <Image
                  src={primary.url}
                  alt={primary.alt_text ?? product.name}
                  fill
                  sizes="(max-width:640px) 50vw, 33vw"
                  className={cn("object-cover transition-transform duration-500 group-hover:scale-105", outOfStock && "opacity-60 grayscale")}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-sage/30 text-4xl">🥥</div>
              )}
            </Link>

            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <div className="flex items-center gap-1.5">
                {product.brands && (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-green">
                    {product.brands.name}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{product.categories.name}</span>
              </div>
              <Link href={`/shop/${product.slug}`} className="hover:text-green">
                <h3 className="line-clamp-2 font-display text-sm font-semibold leading-snug text-green-deep">
                  {product.name}
                </h3>
              </Link>

              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-green-deep">
                  {isBulk ? `from ${formatCurrency(minPrice)} / L` : formatCurrency(minPrice)}
                </span>
              </div>

              {/* CTA */}
              {isBulk ? (
                <Link
                  href={`/shop/${product.slug}`}
                  className="flex items-center justify-center gap-1 rounded-full bg-green/10 px-3 py-1.5 text-xs font-semibold text-green transition-colors hover:bg-green/20"
                >
                  <Tag className="h-3.5 w-3.5" /> Get Quote
                </Link>
              ) : outOfStock ? (
                <span className="flex items-center justify-center rounded-full bg-sand px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                  Out of Stock
                </span>
              ) : multiSize ? (
                <Link
                  href={`/shop/${product.slug}`}
                  className="flex items-center justify-center rounded-full bg-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                >
                  Select options
                </Link>
              ) : (
                <button
                  onClick={() => addToCart(product)}
                  disabled={busy}
                  className="flex items-center justify-center gap-1 rounded-full bg-green px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  Add to Cart
                </button>
              )}
            </div>
          </div>
        );
      })}

      {/* Unavailable products */}
      {unavail.map((p) => (
        <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-dashed border-sand bg-sand/30 p-3">
          <div className="flex flex-1 items-center justify-center py-6 text-center">
            <p className="text-sm text-muted-foreground">{p.name}</p>
          </div>
          <Badge variant="secondary" className="mb-2 self-center">
            No longer available
          </Badge>
          <button
            onClick={() => remove(p.id)}
            className="rounded-full border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-green-deep/70 hover:border-green/40"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}
