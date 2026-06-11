"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/brand";
import { useCartStore, getSubtotal } from "@/stores/cart";
import { DropletSVG } from "@/components/shared/DropletSVG";

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

export function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isOpen = useCartStore((s) => s.isDrawerOpen);
  const closeDrawer = useCartStore((s) => s.closeDrawer);
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const open = mounted && isOpen;
  const subtotal = getSubtotal(items);

  // Close on ESC + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, closeDrawer]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-green-deep/40 backdrop-blur-sm"
            onClick={closeDrawer}
            aria-hidden="true"
          />
          <m.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-cream shadow-2xl flex flex-col"
            role="dialog"
            aria-label="Shopping cart"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-sand">
              <h2 className="font-display text-lg font-semibold text-green-deep flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-green" />
                Your Cart
                {items.length > 0 && (
                  <span className="text-sm font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                )}
              </h2>
              <Button variant="ghost" size="icon" aria-label="Close cart" onClick={closeDrawer}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                <DropletSVG className="h-16 w-16 text-sage" />
                <div>
                  <p className="font-display text-xl text-green-deep">Your cart is empty</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add some pure coconut oil to get started.
                  </p>
                </div>
                <Button asChild onClick={closeDrawer}>
                  <Link href="/shop">Start Shopping</Link>
                </Button>
              </div>
            ) : (
              <>
                {/* Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.cartId}
                      className="flex gap-3 rounded-xl border border-sand bg-white p-3"
                    >
                      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
                        {item.image ? (
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <DropletSVG className="h-8 w-8 text-sage" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            {item.brandName && (
                              <p className="text-[10px] uppercase tracking-wide text-gold-warm font-semibold">
                                {item.brandName}
                              </p>
                            )}
                            <Link
                              href={`/shop/${item.slug}`}
                              onClick={closeDrawer}
                              className="text-sm font-semibold text-green-deep hover:text-green line-clamp-2 leading-snug"
                            >
                              {item.name}
                            </Link>
                          </div>
                          <button
                            onClick={() => removeItem(item.cartId)}
                            aria-label={`Remove ${item.name}`}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">{item.size.label}</p>
                        {item.note && (
                          <p className="text-xs text-muted-foreground italic truncate mt-0.5">
                            “{item.note}”
                          </p>
                        )}
                        {item.isSubscription && (
                          <Badge className="mt-1 bg-sage/40 text-green-deep gap-1 text-[10px]">
                            <Bell className="h-2.5 w-2.5" />
                            {INTERVAL_LABEL[item.subscriptionInterval ?? "monthly"]}
                          </Badge>
                        )}

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center rounded-lg border border-sand overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              aria-label="Decrease quantity"
                              className="h-7 w-7 flex items-center justify-center hover:bg-sand disabled:opacity-40"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="h-7 w-8 flex items-center justify-center text-xs font-semibold border-x border-sand">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                              disabled={item.quantity >= 99}
                              aria-label="Increase quantity"
                              className="h-7 w-7 flex items-center justify-center hover:bg-sand disabled:opacity-40"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm font-semibold text-green-deep">
                            {formatCurrency(item.lineTotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="border-t border-sand p-5 space-y-3 bg-cream">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-display text-lg font-semibold text-green-deep">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Delivery &amp; discounts calculated at checkout.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" asChild onClick={closeDrawer}>
                      <Link href="/cart">View Cart</Link>
                    </Button>
                    <Button asChild onClick={closeDrawer}>
                      <Link href="/checkout">Checkout</Link>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
