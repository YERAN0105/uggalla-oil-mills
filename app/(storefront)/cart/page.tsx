import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <section className="py-16 bg-cream min-h-screen">
      <Container>
        <FadeIn>
          <h1 className="font-display text-4xl text-green-deep mb-4">Your Cart</h1>
          <p className="text-muted-foreground">Cart functionality coming in Phase 3.</p>
        </FadeIn>
      </Container>
    </section>
  );
}
