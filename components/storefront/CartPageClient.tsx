"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  Minus,
  Plus,
  Trash2,
  Bell,
  ShoppingBag,
  Tag,
  X,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Container } from "@/components/shared/Container";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { FadeIn } from "@/components/shared/FadeIn";
import { formatCurrency } from "@/lib/brand";
import {
  useCartStore,
  getSubtotal,
  computeCouponDiscount,
} from "@/stores/cart";
import { applyCouponAction } from "@/lib/checkout/actions";

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "Weekly reminder",
  biweekly: "Every 2 weeks",
  monthly: "Monthly reminder",
};

export function CartPageClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const appliedCoupon = useCartStore((s) => s.appliedCoupon);
  const setCoupon = useCartStore((s) => s.setCoupon);

  const [couponInput, setCouponInput] = useState("");
  const [applying, setApplying] = useState(false);

  const subtotal = getSubtotal(items);
  const discount = computeCouponDiscount(appliedCoupon, subtotal);
  const estimatedTotal = Math.max(0, subtotal - discount);

  const lowStockItems = items.filter(
    (i) => i.stockTracked && i.stockQuantity <= i.lowStockThreshold
  );

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplying(true);
    try {
      const lines = items.map((i) => ({ productId: i.productId, lineTotal: i.lineTotal }));
      const result = await applyCouponAction(couponInput, lines);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCoupon({
        id: result.coupon.id,
        code: result.coupon.code,
        type: result.coupon.type,
        value: result.coupon.value,
        min_order_amount: result.coupon.min_order_amount,
        max_discount: result.coupon.max_discount,
      });
      setCouponInput("");
      toast.success(`Coupon “${result.coupon.code}” applied`);
    } catch {
      toast.error("Couldn't apply that coupon. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  // Avoid hydration mismatch — render a neutral shell until mounted.
  if (!mounted) {
    return (
      <Container className="py-16">
        <div className="h-64 animate-pulse rounded-2xl bg-sand/50" />
      </Container>
    );
  }

  if (items.length === 0) {
    return (
      <Container className="py-20">
        <FadeIn className="mx-auto max-w-md text-center space-y-5">
          <DropletSVG className="mx-auto h-20 w-20 text-sage" />
          <h1 className="font-display text-3xl text-green-deep">Your cart is empty</h1>
          <p className="text-muted-foreground">
            Looks like you haven&apos;t added any oil yet. Let&apos;s fix that.
          </p>
          <Button asChild size="lg">
            <Link href="/shop">Browse our oils</Link>
          </Button>
        </FadeIn>
      </Container>
    );
  }

  return (
    <Container className="py-10 md:py-14">
      <FadeIn>
        <h1 className="font-display text-3xl md:text-4xl text-green-deep mb-2 flex items-center gap-3">
          <ShoppingBag className="h-7 w-7 text-green" />
          Your Cart
        </h1>
        <p className="text-muted-foreground mb-8">
          {items.length} item{items.length !== 1 ? "s" : ""} ready for checkout.
        </p>
      </FadeIn>

      {lowStockItems.length > 0 && (
        <div className="mb-6 flex items-start gap-2 rounded-xl border border-gold-warm/40 bg-gold/10 p-4 text-sm text-green-deep">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-gold-warm" />
          <p>
            Some items are low in stock. We recommend checking out soon to avoid disappointment.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        {/* Items */}
        <div className="space-y-4">
          {items.map((item) => {
            const low = item.stockTracked && item.stockQuantity <= item.lowStockThreshold;
            return (
              <div
                key={item.cartId}
                className="flex gap-4 rounded-2xl border border-sand bg-white p-4"
              >
                <Link
                  href={`/shop/${item.slug}`}
                  className="relative h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 overflow-hidden rounded-xl bg-sand"
                >
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill sizes="112px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <DropletSVG className="h-10 w-10 text-sage" />
                    </div>
                  )}
                </Link>

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {item.brandName && (
                        <p className="text-[10px] uppercase tracking-wide text-gold-warm font-semibold">
                          {item.brandName}
                        </p>
                      )}
                      <Link
                        href={`/shop/${item.slug}`}
                        className="font-semibold text-green-deep hover:text-green leading-snug"
                      >
                        {item.name}
                      </Link>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.size.label}</p>
                      {item.note && (
                        <p className="text-xs text-muted-foreground italic mt-1">
                          “{item.note}”{" "}
                          <Link
                            href={`/shop/${item.slug}`}
                            className="not-italic underline hover:text-green"
                          >
                            edit
                          </Link>
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        {item.isSubscription && (
                          <Badge variant="sage" className="gap-1 text-[10px]">
                            <Bell className="h-2.5 w-2.5" />
                            {INTERVAL_LABEL[item.subscriptionInterval ?? "monthly"]}
                          </Badge>
                        )}
                        {low && (
                          <Badge variant="gold" className="text-[10px]">
                            Only {item.stockQuantity} left
                          </Badge>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.cartId)}
                      aria-label={`Remove ${item.name}`}
                      className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-end justify-between mt-auto pt-3">
                    <div className="flex items-center rounded-lg border border-sand overflow-hidden">
                      <button
                        onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="h-9 w-9 flex items-center justify-center hover:bg-sand disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="h-9 w-10 flex items-center justify-center text-sm font-semibold border-x border-sand">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                        disabled={item.quantity >= 99}
                        aria-label="Increase quantity"
                        className="h-9 w-9 flex items-center justify-center hover:bg-sand disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-lg font-semibold text-green-deep">
                        {formatCurrency(item.lineTotal)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.unitPrice)} each
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div className="pt-2">
            <Button variant="ghost" asChild className="gap-2">
              <Link href="/shop">
                <ArrowRight className="h-4 w-4 rotate-180" />
                Continue Shopping
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl border border-sand bg-white p-6 space-y-4">
            <h2 className="font-display text-xl text-green-deep">Order Summary</h2>

            {/* Coupon */}
            <div>
              {appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg border border-green/30 bg-green/5 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium text-green-deep">
                    <Tag className="h-3.5 w-3.5 text-green" />
                    {appliedCoupon.code}
                  </span>
                  <button
                    onClick={() => setCoupon(null)}
                    aria-label="Remove coupon"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Coupon code"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    className="uppercase"
                  />
                  <Button variant="outline" onClick={handleApplyCoupon} disabled={applying}>
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t border-sand pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-green-deep">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green">
                  <span>Discount</span>
                  <span>−{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-muted-foreground">Calculated at checkout</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-sand pt-4">
              <span className="font-semibold text-green-deep">Estimated Total</span>
              <span className="font-display text-2xl font-semibold text-green-deep">
                {formatCurrency(estimatedTotal)}
              </span>
            </div>

            <Button asChild size="lg" className="w-full gap-2">
              <Link href="/checkout">
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Secure checkout · 100% pure &amp; natural
            </p>
          </div>
        </div>
      </div>
    </Container>
  );
}
