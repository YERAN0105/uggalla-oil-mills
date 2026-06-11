import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPageHeading } from "@/components/account/primitives";
import { WishlistGrid } from "@/components/account/WishlistGrid";
import { getAccountUser, getWishlistProductIds } from "@/lib/account/data";
import { getPublishedProductsByIds } from "@/lib/products";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Wishlist" };

export default async function WishlistPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/wishlist");

  const ids = await getWishlistProductIds(user.id);
  const products = await getPublishedProductsByIds(ids);

  // Keep the wishlist order (newest added first).
  const order = new Map(ids.map((id, i) => [id, i]));
  products.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  // Any saved id without a published product is "no longer available".
  const availableIds = new Set(products.map((p) => p.id));
  const missingIds = ids.filter((id) => !availableIds.has(id));
  let unavailable: { id: string; name: string }[] = [];
  if (missingIds.length > 0) {
    const admin = createAdminClient();
    const { data } = await admin.from("products").select("id, name").in("id", missingIds);
    unavailable = (data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }));
  }

  return (
    <div>
      <AccountPageHeading
        title="Wishlist"
        description="Your saved oils, synced across your devices."
      />
      <WishlistGrid products={products} unavailable={unavailable} />
    </div>
  );
}
