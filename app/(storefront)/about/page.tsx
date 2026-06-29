import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";
import { getAboutStackImages } from "@/lib/about-stack";
import { ImageCardStack } from "@/components/storefront/ImageCardStack";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${brand.name}: who we are and what we stand for.`,
};

export default function AboutPage() {
  // Auto-loaded from `public/about-stack/`; the section hides itself when empty.
  const aboutImages = getAboutStackImages();
  return (
    <>
      {/* Hero */}
      <section className="relative py-24 bg-green-deep text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/hero.jpeg"
            alt="Uggalla Oil Mills shop in Padukka, Sri Lanka"
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
              From the heart of Padukka, Sri Lanka. Pure, natural oils for every home.
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16 bg-cream">
        <Container size="narrow">
          <FadeIn>
            <div className="prose prose-green max-w-none space-y-6 text-body">
              <h2 className="font-display text-3xl text-green-deep">Who We Are</h2>
              <p>
                Uggalla Oil Mills is a Padukka-based shop bringing Sri Lankan homes pure, premium
                oils: coconut, sunflower and rice bran for the kitchen, plus specialty oils such as
                hair oil and lamp oil. What started small has grown into a name our customers trust for
                quality and honest value.
              </p>
              <p>
                We&apos;re selective about quality. Every product on our shelves is chosen for its
                purity and freshness, so you get oils you can feel good about bringing into
                your home.
              </p>
              <h2 className="font-display text-3xl text-green-deep">Our Promise</h2>
              <p>
                We believe good oil should be simple and honest. No additives. No
                preservatives. No shortcuts, just pure oil and fair prices, delivered fresh to
                your door across Sri Lanka.
              </p>
              <p>
                Our retail brand, <strong>Royal Coco</strong>, brings you carefully selected
                oils in convenient bottle and packet formats for homes across Sri Lanka.
              </p>
            </div>
          </FadeIn>
        </Container>
      </section>

      {/* Photo card-stack — only renders when photos exist in public/about-stack/.
          Vertical on desktop, horizontal on phones (mirrors the homepage). */}
      {aboutImages.length > 0 && (
        <section className="py-16 bg-sand" aria-label="Inside our shop">
          <Container>
            <FadeIn>
              <div className="text-center mb-10">
                <span className="text-eyebrow mb-2 block">Inside Our Shop</span>
                <h2 className="font-display text-3xl text-green-deep">A look around</h2>
              </div>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="mx-auto max-w-md">
                <div className="hidden lg:block">
                  <ImageCardStack images={aboutImages} orientation="vertical" />
                </div>
                <div className="lg:hidden">
                  <ImageCardStack images={aboutImages} orientation="horizontal" />
                </div>
              </div>
            </FadeIn>
          </Container>
        </section>
      )}
    </>
  );
}
