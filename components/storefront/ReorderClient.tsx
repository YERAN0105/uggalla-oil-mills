"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/stores/cart";

type Line = Omit<CartItem, "cartId" | "lineTotal">;

/**
 * Pre-fills the cart from a subscription reorder link, then redirects to /cart.
 * Runs once on mount (guarded against React strict-mode double-invocation).
 */
export function ReorderClient({
  items,
  unavailable,
}: {
  items: Line[];
  unavailable: string[];
}) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const ran = useRef(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    items.forEach((item) => addItem(item));
    if (items.length > 0) {
      toast.success("We've added your usual order to the cart.");
    }
    if (unavailable.length > 0) {
      toast.warning(`Currently unavailable: ${unavailable.join(", ")}`, { duration: 5000 });
    }
    if (items.length === 0 && unavailable.length === 0) {
      toast.info("There's nothing to reorder right now.");
    }
    setDone(true);
    const target = items.length > 0 ? "/cart" : "/shop";
    const t = setTimeout(() => router.replace(target), 600);
    return () => clearTimeout(t);
  }, [items, unavailable, addItem, router]);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-green" aria-hidden />
      <p className="text-green-deep">
        {done ? "Taking you to your cart…" : "Preparing your reorder…"}
      </p>
    </div>
  );
}
