import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return (
    <section className="py-16 bg-cream min-h-screen">
      <Container>
        <FadeIn>
          <h1 className="font-display text-4xl text-green-deep mb-4">Wishlist</h1>
          <p className="text-muted-foreground">Wishlist coming in Phase 4.</p>
        </FadeIn>
      </Container>
    </section>
  );
}
