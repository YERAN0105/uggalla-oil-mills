"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "framer-motion";
import { toast } from "sonner";
import { Minus, Plus, Bell, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/brand";
import { getSizeDiscount } from "@/lib/product-utils";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/cart";
import { validateCartItem } from "@/lib/cart/actions";
import { usePdpSize } from "@/components/storefront/PdpPurchase";
import type { ProductWithRelations } from "@/types/supabase";

interface ProductOptionsProps {
  product: ProductWithRelations;
}

const INTERVALS = [
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
] as const;

export function ProductOptions({ product }: ProductOptionsProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const sortedSizes = [...product.product_sizes].sort(
    (a, b) => a.display_order - b.display_order
  );

  // Selected size is shared with the price heading + sticky bar via context.
  const { selectedSize, setSelectedSize } = usePdpSize();
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [wantsSubscription, setWantsSubscription] = useState(false);
  const [subscriptionInterval, setSubscriptionInterval] =
    useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [isAdding, setIsAdding] = useState(false);

  const lineTotal = selectedSize ? Number(selectedSize.price) * quantity : null;
  const outOfStock = product.stock_tracked && product.stock_quantity <= 0;

  // Returns true if successfully added (used by both Add to Cart and Buy Now).
  const addToCart = async (): Promise<boolean> => {
    if (!selectedSize && sortedSizes.length > 1) {
      toast.error("Please select a size first");
      return false;
    }
    setIsAdding(true);
    try {
      const result = await validateCartItem({
        productId: product.id,
        sizeId: selectedSize?.id ?? null,
        quantity,
        note,
        isSubscription: wantsSubscription,
        subscriptionInterval: wantsSubscription ? subscriptionInterval : null,
      });

      if (!result.ok) {
        toast.error(result.error);
        return false;
      }

      addItem(result.item);

      // The server drops the subscription opt-in for guests — nudge them to log in.
      if (wantsSubscription && !result.item.isSubscription) {
        toast.success("Added to cart", {
          description: "Sign in to set a reorder reminder — added without a subscription for now.",
          action: { label: "Sign in", onClick: () => router.push("/login?redirect=/cart") },
        });
      } else {
        toast.success("Added to cart", { description: product.name });
      }
      return true;
    } catch {
      toast.error("Something went wrong. Please try again.");
      return false;
    } finally {
      setIsAdding(false);
    }
  };

  const handleAddToCart = async () => {
    const added = await addToCart();
    if (added) openDrawer();
  };

  const handleBuyNow = async () => {
    const added = await addToCart();
    if (added) router.push("/checkout");
  };

  return (
    <div className="space-y-5">
      {/* Size selector */}
      {sortedSizes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-semibold text-green-deep">
              Size / Volume{" "}
              {sortedSizes.length > 1 && (
                <span className="text-muted-foreground font-normal">(required)</span>
              )}
            </Label>
            {selectedSize && lineTotal && (
              <m.span
                key={lineTotal}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-semibold text-green"
              >
                {formatCurrency(lineTotal)}
              </m.span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Select size">
            {sortedSizes.map((size) => {
              const isSelected = selectedSize?.id === size.id;
              const sizeDiscount = getSizeDiscount(size.price, size.compare_at_price);
              return (
                <m.button
                  key={size.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setSelectedSize(size)}
                  role="radio"
                  aria-checked={isSelected}
                  className={cn(
                    "relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-150",
                    isSelected
                      ? "border-green bg-green/5 shadow-sm"
                      : "border-sand hover:border-green/40 bg-white"
                  )}
                >
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-green rounded-full flex items-center justify-center">
                      <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M10 3L5 8.5 2 5.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  )}
                  <span className="text-sm font-semibold text-green-deep">{size.label}</span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    <span className={cn("text-sm", isSelected ? "text-green font-medium" : "text-muted-foreground")}>
                      {formatCurrency(Number(size.price))}
                    </span>
                    {sizeDiscount && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(sizeDiscount.original)}
                      </span>
                    )}
                  </span>
                  {sizeDiscount && (
                    <span className="mt-0.5 text-[10px] font-bold text-red-600">
                      {sizeDiscount.percent}% OFF
                    </span>
                  )}
                </m.button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quantity */}
      <div>
        <Label className="text-sm font-semibold text-green-deep mb-3 block">Quantity</Label>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-sand overflow-hidden">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="h-10 w-10 flex items-center justify-center hover:bg-sand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span
              className="h-10 w-12 flex items-center justify-center text-sm font-semibold text-green-deep border-x border-sand"
              aria-live="polite"
              aria-label={`Quantity: ${quantity}`}
            >
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => Math.min(99, q + 1))}
              disabled={quantity >= 99}
              aria-label="Increase quantity"
              className="h-10 w-10 flex items-center justify-center hover:bg-sand transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          {selectedSize && quantity > 1 && (
            <m.p
              key={`${selectedSize.id}-${quantity}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-muted-foreground"
            >
              {formatCurrency(Number(selectedSize.price))} × {quantity} ={" "}
              <span className="font-semibold text-green-deep">{formatCurrency(Number(selectedSize.price) * quantity)}</span>
            </m.p>
          )}
        </div>
      </div>

      {/* Note (optional) */}
      {product.allows_note && (
        <div>
          <Label htmlFor="product-note" className="text-sm font-semibold text-green-deep mb-2 block">
            Special Instructions{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="product-note"
            placeholder="Any special requirements or instructions…"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, product.note_max_chars))}
            rows={2}
            maxLength={product.note_max_chars}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {note.length}/{product.note_max_chars}
          </p>
        </div>
      )}

      {/* Subscription option */}
      {product.allows_subscription && (
        <div className="rounded-xl border border-sage/60 bg-sage/10 p-4 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div className="relative">
              <input
                type="checkbox"
                checked={wantsSubscription}
                onChange={(e) => setWantsSubscription(e.target.checked)}
                className="sr-only peer"
              />
              <div className="h-5 w-9 rounded-full bg-sand peer-checked:bg-green transition-colors" />
              <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-deep flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-green" />
                Remind me to reorder
              </p>
              <p className="text-xs text-muted-foreground">Never run out — we&apos;ll send you a reminder</p>
            </div>
          </label>

          {wantsSubscription && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-2"
            >
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Reminder frequency
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {INTERVALS.map((interval) => (
                  <button
                    key={interval.value}
                    onClick={() => setSubscriptionInterval(interval.value)}
                    className={cn(
                      "text-xs px-2 py-2 rounded-lg border transition-colors",
                      subscriptionInterval === interval.value
                        ? "border-green bg-green/10 text-green font-medium"
                        : "border-sand text-muted-foreground hover:border-green/40"
                    )}
                  >
                    {interval.label}
                  </button>
                ))}
              </div>
            </m.div>
          )}
        </div>
      )}

      {/* CTAs */}
      {outOfStock ? (
        <Button className="w-full h-12 text-base font-semibold" disabled>
          Out of Stock
        </Button>
      ) : (
        <div className="flex gap-3" id="pdp-add-to-cart">
          <Button
            onClick={handleAddToCart}
            className="flex-1 h-12 text-base font-semibold gap-2"
            disabled={(sortedSizes.length > 1 && !selectedSize) || isAdding}
          >
            {isAdding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShoppingCart className="h-4 w-4" />
            )}
            Add to Cart
          </Button>
          <Button
            variant="outline"
            className="h-12 px-5 font-semibold"
            onClick={handleBuyNow}
            disabled={(sortedSizes.length > 1 && !selectedSize) || isAdding}
          >
            Buy Now
          </Button>
        </div>
      )}
    </div>
  );
}
