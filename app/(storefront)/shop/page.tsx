import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";

export const metadata: Metadata = { title: "Shop" };

export default function ShopPage() {
  return (
    <section className="py-16 bg-cream min-h-screen">
      <Container>
        <FadeIn>
          <span className="text-eyebrow mb-2 block">All Products</span>
          <h1 className="font-display text-4xl text-green-deep mb-4">Shop</h1>
          <p className="text-muted-foreground">
            Product catalog coming in Phase 2. Check back soon!
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
