"use client";

import { useState, useEffect } from "react";
import { m, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore, getCartCount } from "@/stores/cart";

/**
 * Header cart trigger. Reads the persisted cart store with a mounted guard to
 * avoid an SSR hydration mismatch (server renders 0, client rehydrates from
 * localStorage). Opens the global cart drawer on click.
 */
export function CartButton() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const items = useCartStore((s) => s.items);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const count = mounted ? getCartCount(items) : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Cart (${count} item${count === 1 ? "" : "s"})`}
      className="relative"
      onClick={openDrawer}
    >
      <ShoppingCart className="h-5 w-5" />
      <AnimatePresence>
        {count > 0 && (
          <m.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 25 }}
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-0.5 rounded-full bg-gold text-green-deep text-[10px] font-bold flex items-center justify-center leading-none"
          >
            {count > 9 ? "9+" : count}
          </m.span>
        )}
      </AnimatePresence>
    </Button>
  );
}
