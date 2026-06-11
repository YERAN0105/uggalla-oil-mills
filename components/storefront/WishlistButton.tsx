"use client";

import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { m } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWishlistStore } from "@/stores/wishlistStore";

interface WishlistButtonProps {
  productId: string;
  productName: string;
  className?: string;
  size?: "sm" | "md";
}

export function WishlistButton({
  productId,
  productName,
  className,
  size = "md",
}: WishlistButtonProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { toggle, isInWishlist } = useWishlistStore();
  const saved = mounted ? isInWishlist(productId) : false;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(productId);
    toast(saved ? `Removed from wishlist` : `Saved to wishlist`, {
      description: productName,
      duration: 2000,
    });
  };

  return (
    <m.button
      onClick={handleClick}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={saved}
      whileTap={{ scale: 0.85 }}
      className={cn(
        "flex items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        size === "sm" ? "h-7 w-7" : "h-9 w-9",
        saved
          ? "bg-red-50 text-red-500 hover:bg-red-100"
          : "bg-white/80 text-green-deep/50 hover:bg-white hover:text-red-400",
        className
      )}
    >
      <Heart
        className={cn(size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4", saved && "fill-current")}
      />
    </m.button>
  );
}
