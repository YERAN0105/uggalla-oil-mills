import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${brand.name} — our mill, our people, and our process.`,
};

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative py-24 bg-green-deep text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?w=1400&q=75"
            alt="Coconut palms"
            fill
            className="object-cover"
            sizes="100vw"
          />
        </div>
        <Container className="relative z-10">
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Our Story</span>
            <h1 className="font-display text-5xl font-bold mb-4">About Uggalla Oil Mills</h1>
            <p className="text-white/70 max-w-xl text-lg">
              From the heart of Padukka, Sri Lanka — a legacy of pure, naturally pressed coconut oil.
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16 bg-cream">
        <Container size="narrow">
          <FadeIn>
            <div className="prose prose-green max-w-none space-y-6 text-body">
              <h2 className="font-display text-3xl text-green-deep">Our Heritage</h2>
              <p>
                Uggalla Oil Mills has been pressing pure coconut oil in Padukka for generations.
                What started as a small family operation has grown into one of Sri Lanka&apos;s
                most trusted names in premium coconut oil — but our methods remain unchanged.
              </p>
              <p>
                We source only the finest mature coconuts from carefully chosen growers within
                the coconut belt of Sri Lanka. Each coconut is inspected, cracked, and pressed
                fresh at our Padukka mill — preserving the full flavour, aroma, and nutritional
                value that makes our oil distinctive.
              </p>
              <h2 className="font-display text-3xl text-green-deep">Our Process</h2>
              <p>
                Unlike mass-produced oils that rely on chemical solvents and high-heat processing,
                we use a cold-press method that retains the oil&apos;s natural properties. No additives.
                No preservatives. No shortcuts. Just honest oil the way it was always meant to be made.
              </p>
              <p>
                Our flagship brand, <strong>Royal Coco</strong>, represents the pinnacle of this
                process — carefully graded, fresh-packed, and available in bottle and packet formats
                for homes across Sri Lanka.
              </p>
            </div>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
