import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";

export const metadata: Metadata = { title: "Bulk Orders" };

export default function BulkRequestPage() {
  return (
    <section className="py-16 bg-cream min-h-screen">
      <Container>
        <FadeIn>
          <span className="text-eyebrow mb-2 block">Wholesale & Bulk</span>
          <h1 className="font-display text-4xl text-green-deep mb-4">Request a Bulk Quote</h1>
          <p className="text-muted-foreground">
            Bulk quote form coming in Phase 2. Contact us directly in the meantime.
          </p>
        </FadeIn>
      </Container>
    </section>
  );
}
