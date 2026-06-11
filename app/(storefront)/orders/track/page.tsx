import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { GuestTrackForm } from "@/components/storefront/GuestTrackForm";

export const metadata: Metadata = { title: "Track Your Order" };

interface TrackPageProps {
  searchParams: Promise<{ order?: string }>;
}

export default async function TrackOrderPage({ searchParams }: TrackPageProps) {
  const { order } = await searchParams;

  return (
    <section className="bg-cream min-h-screen">
      <Container className="py-12 md:py-16">
        <FadeIn className="max-w-xl mx-auto">
          <h1 className="font-display text-3xl md:text-4xl text-green-deep mb-2">Track Your Order</h1>
          <p className="text-muted-foreground mb-8">
            Enter your order number and the email or phone you used at checkout to see your order status.
          </p>
          <GuestTrackForm initialOrder={order ?? ""} />
        </FadeIn>
      </Container>
    </section>
  );
}
