"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WishlistStore {
  items: string[];
  /** True once we know the visitor is signed in (DB-backed wishlist). */
  authed: boolean;
  toggle: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  count: () => number;
  setItems: (ids: string[]) => void;
  setAuthed: (v: boolean) => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      authed: false,
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
      setItems: (ids) => set({ items: [...new Set(ids)] }),
      setAuthed: (v) => set({ authed: v }),
    }),
    {
      name: "uggalla-wishlist",
      // Persist only the durable id list (guests). Auth state is transient.
      partialize: (state) => ({ items: state.items }),
    }
  )
);
