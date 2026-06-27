"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { m, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/brand";
import type { ProductWithRelations } from "@/types/supabase";
import { getMinPrice, getSizeDiscount, getDisplayDiscount } from "@/lib/product-utils";
import { usePdpSize } from "@/components/storefront/PdpPurchase";
import { useUIStore } from "@/stores/ui";

interface StickyBottomBarProps {
  product: ProductWithRelations;
}

export function StickyBottomBar({ product }: StickyBottomBarProps) {
  const [visible, setVisible] = useState(false);
  const { selectedSize } = usePdpSize();
  const setPdpBarVisible = useUIStore((s) => s.setPdpBarVisible);
  const isBulk = product.purchase_type === "bulk_quote";
  const multiSize = product.product_sizes.length > 1;

  const displayPrice = selectedSize ? Number(selectedSize.price) : getMinPrice(product);
  const discount = isBulk
    ? null
    : selectedSize
    ? getSizeDiscount(selectedSize.price, selectedSize.compare_at_price)
    : getDisplayDiscount(product);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Mirror the bar's visibility to the global UI store so the floating WhatsApp
  // button can lift above it (mobile only) instead of overlapping it.
  useEffect(() => {
    setPdpBarVisible(visible);
  }, [visible, setPdpBarVisible]);

  // Clear the lift when leaving the product page (this bar unmounts).
  useEffect(() => {
    return () => setPdpBarVisible(false);
  }, [setPdpBarVisible]);

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          exit={{ y: 100 }}
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white border-t border-sand shadow-[0_-4px_20px_rgba(18,53,36,0.1)] px-4 py-3 safe-bottom"
        >
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground truncate">{product.name}</p>
              <p className="font-display font-semibold text-green-deep">
                {formatCurrency(displayPrice)}
                {discount && (
                  <span className="text-xs font-normal text-muted-foreground line-through ml-1.5">
                    {formatCurrency(discount.original)}
                  </span>
                )}
                {multiSize && !selectedSize && (
                  <span className="text-xs font-normal text-muted-foreground ml-1">from</span>
                )}
              </p>
            </div>
            {isBulk ? (
              <Button asChild className="flex-shrink-0 px-5">
                <Link href={`/bulk-request?product=${product.id}`}>Request Quote</Link>
              </Button>
            ) : (
              <Button
                className="flex-shrink-0 gap-2 px-5"
                onClick={() => {
                  // The size/quantity/subscription controls (and the real "Add to
                  // Cart") live above — bring them into view so the choice is explicit.
                  document
                    .getElementById("pdp-add-to-cart")
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
              </Button>
            )}
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
