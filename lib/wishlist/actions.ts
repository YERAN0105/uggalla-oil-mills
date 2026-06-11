"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();

/** Current user's wishlisted product ids (newest first), or [] when signed out. */
export async function getWishlistIdsAction(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("wishlist")
    .select("product_id, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });
  return (data ?? []).map((w: { product_id: string }) => w.product_id);
}

/**
 * One-shot sync called by the client wishlist provider on mount: tells us
 * whether the visitor is signed in and, if so, merges their guest list and
 * returns the authoritative id list. Guests get `{ authed: false }` and keep
 * their local list untouched.
 */
export async function syncWishlist(
  localIds: string[]
): Promise<{ authed: boolean; ids: string[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authed: false, ids: [] };
  const ids = await mergeWishlist(localIds);
  return { authed: true, ids };
}

export type ToggleWishlistResult =
  | { ok: true; inWishlist: boolean }
  | { ok: false; error: string };

/** Add/remove a product from the signed-in user's wishlist. */
export async function toggleWishlistDb(productId: string): Promise<ToggleWishlistResult> {
  if (!idSchema.safeParse(productId).success) return { ok: false, error: "Invalid product." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in to save items." };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("wishlist")
    .select("product_id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    await admin.from("wishlist").delete().eq("user_id", user.id).eq("product_id", productId);
    return { ok: true, inWishlist: false };
  }
  const { error } = await admin.from("wishlist").insert({ user_id: user.id, product_id: productId });
  if (error) return { ok: false, error: "Could not update your wishlist." };
  return { ok: true, inWishlist: true };
}

/**
 * Merge a guest's local wishlist into the account on login, then return the
 * full, de-duplicated id list. Ignores ids that don't reference a real product.
 */
export async function mergeWishlist(localIds: string[]): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const admin = createAdminClient();

  const valid = [...new Set(localIds.filter((id) => idSchema.safeParse(id).success))];
  if (valid.length > 0) {
    // Only insert ids that correspond to existing products (avoid FK errors).
    const { data: realProducts } = await admin.from("products").select("id").in("id", valid);
    const realIds = new Set((realProducts ?? []).map((p: { id: string }) => p.id));
    const rows = valid
      .filter((id) => realIds.has(id))
      .map((id) => ({ user_id: user.id, product_id: id }));
    if (rows.length > 0) {
      await admin.from("wishlist").upsert(rows, { onConflict: "user_id,product_id" });
    }
  }

  const { data } = await admin
    .from("wishlist")
    .select("product_id, added_at")
    .eq("user_id", user.id)
    .order("added_at", { ascending: false });
  return (data ?? []).map((w: { product_id: string }) => w.product_id);
}
