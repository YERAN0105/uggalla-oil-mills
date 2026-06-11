import type { Metadata } from "next";
import { CartPageClient } from "@/components/storefront/CartPageClient";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <section className="bg-cream min-h-screen">
      <CartPageClient />
    </section>
  );
}
