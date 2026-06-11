"use client";

import { useEffect, useRef } from "react";
import { useWishlistStore } from "@/stores/wishlistStore";
import { syncWishlist } from "@/lib/wishlist/actions";

/**
 * Mounted once in the storefront layout. On load it asks the server whether the
 * visitor is signed in; if so it merges the guest's local wishlist into their
 * account and replaces the local store with the authoritative DB list (so the
 * wishlist syncs across devices). Guests keep their localStorage list.
 */
export function WishlistProvider() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const localIds = useWishlistStore.getState().items;
    syncWishlist(localIds)
      .then(({ authed, ids }) => {
        useWishlistStore.getState().setAuthed(authed);
        if (authed) useWishlistStore.getState().setItems(ids);
      })
      .catch(() => {
        /* offline / not signed in — keep the local list */
      });
  }, []);

  return null;
}
