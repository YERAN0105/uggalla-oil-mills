import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";

export const metadata: Metadata = { title: "My Account" };

export default function AccountPage() {
  return (
    <section className="py-16 bg-cream min-h-screen">
      <Container>
        <FadeIn>
          <h1 className="font-display text-4xl text-green-deep mb-4">My Account</h1>
          <p className="text-muted-foreground">Account dashboard coming in Phase 4.</p>
        </FadeIn>
      </Container>
    </section>
  );
}
