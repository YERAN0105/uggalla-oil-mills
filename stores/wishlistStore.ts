"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  items: string[];
  toggle: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      toggle: (productId) => {
        const { items } = get();
        set({
          items: items.includes(productId)
            ? items.filter((id) => id !== productId)
            : [...items, productId],
        });
      },
      isInWishlist: (productId) => get().items.includes(productId),
      count: () => get().items.length,
    }),
    { name: "uggalla-wishlist" }
  )
);
