import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import {
  Leaf,
  Droplets,
  Truck,
  ShieldCheck,
  Star,
  ChevronRight,
  Bell,
  Package,
  ShoppingBag,
  Check,
} from "lucide-react";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FadeIn } from "@/components/shared/FadeIn";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { ProductCard } from "@/components/storefront/ProductCard";
import { JsonLd } from "@/components/shared/JsonLd";
import { getProducts, getBrands } from "@/lib/products";
import { getHeroBanners } from "@/lib/banners";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/HeroCarousel";
import { LogoMarquee, type MarqueeLogo } from "@/components/storefront/LogoMarquee";
import { ImageCardStack } from "@/components/storefront/ImageCardStack";
import { getAboutStackImages } from "@/lib/about-stack";
import { brand } from "@/lib/brand";

const trustPoints = [
  {
    icon: Leaf,
    title: "100% Pure",
    description: "Pure and unadulterated. No additives, no preservatives, no dilution.",
  },
  {
    icon: Droplets,
    title: "Pure & Natural",
    description: "Naturally good oils with no additives or preservatives, full of natural goodness.",
  },
  {
    icon: ShieldCheck,
    title: "Quality Assured",
    description: "Each batch tested and certified before it reaches your kitchen.",
  },
  {
    icon: Truck,
    title: "Island-Wide Delivery",
    description: "Fast, careful delivery to every corner of Sri Lanka.",
  },
];

// ⚠️ PLACEHOLDERS — replace with your REAL certifications, retailers, and B2B
// clients. Only list certifications you actually hold. To use a logo image, drop
// the file in `public/trust-logos/` and set `src`; omit `src` to show the name as
// a text wordmark. Remove any entry you don't have — an empty list hides the strip.
const trustLogos: MarqueeLogo[] = [
  { name: "SLS Certified" /* src: "/trust-logos/sls.png" */ },
  { name: "ISO 22000" /* src: "/trust-logos/iso-22000.png" */ },
  { name: "HACCP" /* src: "/trust-logos/haccp.png" */ },
  { name: "Retailer Name" /* src: "/trust-logos/retailer-1.png" */ },
  { name: "Partner Brand" /* src: "/trust-logos/partner-1.png" */ },
  { name: "Wholesale Client" /* src: "/trust-logos/client-1.png" */ },
];

// Optional portrait crop for the *default* hero, used only on phones. Drop a file
// at `public/hero-mobile.jpeg` and it's picked up automatically; if it's absent
// the wide `hero.jpeg` is used on every screen (current behaviour). Checked once
// at module load — a new deploy (or dev restart) re-evaluates it.
const DEFAULT_HERO_MOBILE = fs.existsSync(path.join(process.cwd(), "public", "hero-mobile.jpeg"))
  ? "/hero-mobile.jpeg"
  : undefined;

const howItWorks = [
  {
    step: "1",
    icon: ShoppingBag,
    title: "Choose your oil",
    description: "Browse bottles, packets, or request a quote for bulk quantities.",
  },
  {
    step: "2",
    icon: Package,
    title: "Place your order",
    description: "Secure checkout with your preferred payment method: PayHere, bank transfer, or COD.",
  },
  {
    step: "3",
    icon: Truck,
    title: "Delivered fresh",
    description: "We pack and ship your order fresh from our store. Track it every step.",
  },
];

const testimonials = [
  {
    name: "Amali P.",
    location: "Colombo 7",
    text: "The freshest coconut oil I've ever bought. You can actually smell the difference: pure, clean, and rich. My family won't use anything else.",
    rating: 5,
  },
  {
    name: "Roshan K.",
    location: "Kandy",
    text: "We buy in bulk for our restaurant. Uggalla Oil Mills have been reliable every time. Quality is consistent and the pricing is fair.",
    rating: 5,
  },
  {
    name: "Dilani S.",
    location: "Galle",
    text: "Love the reorder reminder feature. I set it once and never run out of oil. Fast delivery too. Arrived the next morning!",
    rating: 5,
  },
];

export default async function HomePage() {
  let { products: featuredProducts } = await getProducts({ featured: true, pageSize: 4 });
  if (featuredProducts.length === 0) {
    const fallback = await getProducts({ pageSize: 4 });
    featuredProducts = fallback.products;
  }
  // Brand showcase comes from the database (Admin → Brands). getBrands() already
  // filters to active only, so hidden brands drop off automatically. The wholesale
  // brand shares the company name (lib/brand.ts) — it's the bulk / quote brand, so
  // it keeps the "Get a Quote" badge.
  const brandCards = (await getBrands()).map((b) => ({
    slug: b.slug,
    name: b.name,
    image: b.image_url,
    href: `/shop/brand/${b.slug}`,
    isBulk: b.name === brand.name,
  }));

  // Hero slideshow from Admin → Banners (active "hero" banners, in order). Falls
  // back to a single built-in default slide when there are none. Each field falls
  // back independently, so a banner can change just the image, just the text, etc.
  const DEFAULT_HERO_SUB =
    "Pure, fresh coconut, rice bran and sunflower oils from Padukka to your home. Naturally good, no additives, delivered island-wide.";
  const heroBanners = await getHeroBanners();
  const heroSlides: HeroSlide[] =
    heroBanners.length > 0
      ? heroBanners.map((b) => {
          const hasCta = !!(b.cta_text?.trim() && b.cta_link?.trim());
          return {
            image: b.image_url || "/hero.jpeg",
            // A banner's own mobile crop if set; else fall back to the wide image
            // on phones (never mix in the default hero's mobile crop).
            mobileImage: b.mobile_image_url || undefined,
            headline: b.headline?.trim() || null,
            subheadline: b.subheadline?.trim() || DEFAULT_HERO_SUB,
            ctaText: hasCta ? b.cta_text!.trim() : "Shop Now",
            ctaLink: hasCta ? b.cta_link!.trim() : "/shop",
          };
        })
      : [
          {
            image: "/hero.jpeg",
            mobileImage: DEFAULT_HERO_MOBILE,
            headline: null,
            subheadline: DEFAULT_HERO_SUB,
            ctaText: "Shop Now",
            ctaLink: "/shop",
          },
        ];

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: brand.name,
    url: appUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${appUrl}/shop?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  // Store photo — shared between the desktop left column and the mobile in-flow
  // copy (rendered right under the heading) so the markup stays in one place.
  const storeImage = (
    <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-[4/3]">
      <Image
        src="/hero.jpeg"
        alt="Uggalla Oil Mills shop in Padukka, Sri Lanka"
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 50vw"
      />
      {/* Accent badge */}
      <div className="absolute bottom-4 left-4 bg-gold text-green-deep px-4 py-2 rounded-full font-semibold text-sm">
        Padukka, Sri Lanka
      </div>
    </div>
  );

  // Optional photo card-stack for the About section — auto-loaded from
  // `public/about-stack/` (filename = order + caption). Falls back to the single
  // store photo when the folder is empty. Rendered twice to reuse the two-slot
  // responsive pattern below: vertical on desktop, horizontal on phones. Only one
  // is ever visible (the other is display:none and its autoplay stays idle).
  const aboutImages = getAboutStackImages();
  const aboutMedia = (orientation: "vertical" | "horizontal") =>
    aboutImages.length > 0 ? (
      <ImageCardStack images={aboutImages} orientation={orientation} />
    ) : (
      storeImage
    );

  return (
    <>
      <JsonLd data={websiteLd} />
      {/* ── Hero (slideshow from Admin → Banners) ─────────────────────────── */}
      <HeroCarousel slides={heroSlides} />

      {/* ── Trust / Certification Marquee ─────────────────────────────────── */}
      <div className="mt-8 sm:mt-12">
        <LogoMarquee logos={trustLogos} eyebrow="Trusted, Certified & Stocked Nationwide" />
      </div>

      {/* ── Brand Story Strip ─────────────────────────────────────────────── */}
      <section className="py-16 bg-cream" aria-label="About us">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Desktop: image in the left column. Hidden on mobile, where it
                appears under the heading instead. */}
            <FadeIn direction="right" className="hidden lg:block">
              {aboutMedia("vertical")}
            </FadeIn>

            <FadeIn direction="left">
              <div className="space-y-6">
                <span className="text-eyebrow">About Us</span>
                <h2 className="font-display text-4xl text-green-deep leading-tight">
                  Pure, natural oils<br />
                  <span className="text-green italic">from Padukka</span>
                </h2>
                {/* Mobile: image sits right under the heading. */}
                <div className="lg:hidden">{aboutMedia("horizontal")}</div>
                <div className="space-y-4 text-body">
                  <p>
                    From the heart of Padukka, we bring Sri Lankan homes pure, natural oils,
                    chosen for their quality and freshness so every drop keeps its natural goodness.
                  </p>
                  <p>
                    No additives. No preservatives. No shortcuts. Just honest, pure oil
                    the way it was always meant to be.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {["Pure & natural", "No additives", "Sri Lankan origin", "Freshly delivered"].map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sage/50 text-green-deep text-sm font-medium"
                    >
                      <Check className="h-3.5 w-3.5 text-green" />
                      {tag}
                    </span>
                  ))}
                </div>
                <Button variant="outline" asChild>
                  <Link href="/about">Read Our Story <ChevronRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>

      {/* ── Brand Showcase ────────────────────────────────────────────────── */}
      {brandCards.length > 0 && (
        <section className="py-16 bg-sand" aria-label="Our brands">
          <Container>
            <FadeIn>
              <div className="text-center mb-10">
                <span className="text-eyebrow mb-2 block">Our Brands</span>
                <h2 className="font-display text-4xl text-green-deep">
                  Shop by brand
                </h2>
              </div>
            </FadeIn>

            <div className="flex flex-wrap justify-center gap-6">
              {brandCards.map((b, i) => (
                <FadeIn
                  key={b.slug}
                  delay={i * 0.1}
                  className="w-full sm:w-[calc(50%_-_12px)] lg:w-[calc(33.333%_-_16px)]"
                >
                  <Link
                    href={b.href}
                    className="group block rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 bg-white"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {b.image ? (
                        <Image
                          src={b.image}
                          alt={b.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        // Fallback when a brand has no image uploaded yet.
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sage to-green/40">
                          <DropletSVG className="h-16 w-16 text-white/50" />
                        </div>
                      )}
                      {/* Base scrim — light, so the photo stays prominent by
                          default while keeping the bottom label legible. */}
                      <div className="absolute inset-0 bg-gradient-to-t from-green-deep/65 via-green-deep/10 to-transparent" />
                      {/* Hover scrim — the darker treatment fades in on hover for
                          an interactive emphasis (paired with the image zoom). */}
                      <div className="absolute inset-0 bg-gradient-to-t from-green-deep via-green-deep/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      {b.isBulk && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="gold">Get a Quote</Badge>
                        </div>
                      )}
                      {/* text-shadow (inherited by the children) is the safety net
                          for any bright spot in the image directly under the text. */}
                      <div className="absolute bottom-0 left-0 right-0 p-5 [text-shadow:0_1px_4px_rgba(0,0,0,0.6)]">
                        <h3 className="font-display text-xl font-semibold text-white">{b.name}</h3>
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-green">
                        {b.isBulk ? "Browse & request quote" : "Browse products"}
                      </span>
                      <ChevronRight className="h-4 w-4 text-green transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                </FadeIn>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ── Featured Products placeholder ─────────────────────────────────── */}
      <section className="py-16 bg-cream" aria-label="Featured products">
        <Container>
          <FadeIn>
            <div className="flex items-end justify-between mb-10">
              <div>
                <span className="text-eyebrow mb-2 block">Hand-picked</span>
                <h2 className="font-display text-4xl text-green-deep">Featured Products</h2>
              </div>
              <Button variant="outline" asChild className="hidden sm:flex">
                <Link href="/shop">View All <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </FadeIn>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featuredProducts.map((product, i) => (
              <FadeIn key={product.id} delay={i * 0.08}>
                <ProductCard product={product} />
              </FadeIn>
            ))}
          </div>

          <div className="mt-8 flex justify-center sm:hidden">
            <Button variant="outline" asChild>
              <Link href="/shop">View All Products <ChevronRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* ── Trust Strip ───────────────────────────────────────────────────── */}
      <section className="py-16 bg-sand" aria-label="Why our oil">
        <Container>
          <FadeIn>
            <div className="text-center mb-10">
              <span className="text-eyebrow mb-2 block">The Uggalla Difference</span>
              <h2 className="font-display text-4xl text-green-deep">Why our oil</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustPoints.map((point, i) => (
              <FadeIn key={point.title} delay={i * 0.1}>
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full bg-cream border border-gold/30 flex items-center justify-center">
                    <point.icon className="h-6 w-6 text-green" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-green-deep">{point.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{point.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-cream" aria-label="How it works">
        <Container>
          <FadeIn>
            <div className="text-center mb-12">
              <span className="text-eyebrow mb-2 block">Simple & Easy</span>
              <h2 className="font-display text-4xl text-green-deep">How it works</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div
              className="hidden sm:block absolute top-10 left-1/6 right-1/6 h-[1px] bg-gradient-to-r from-transparent via-gold-warm/40 to-transparent"
              aria-hidden="true"
            />
            {howItWorks.map((step, i) => (
              <FadeIn key={step.step} delay={i * 0.15}>
                <div className="text-center space-y-4 relative">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-sand border-2 border-gold/30 flex items-center justify-center relative">
                    <step.icon className="h-8 w-8 text-green" aria-hidden="true" />
                    <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gold text-green-deep font-bold text-sm flex items-center justify-center">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-green-deep">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Subscription Teaser ───────────────────────────────────────────── */}
      <section className="py-12 bg-gradient-to-r from-green-deep to-green" aria-label="Subscription feature">
        <Container>
          <FadeIn>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-full bg-gold/20 flex-shrink-0 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-gold" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-2xl text-white font-semibold">
                    Never run out of oil
                  </h3>
                  <p className="text-white/60 text-sm">
                    Set a reorder reminder and we&apos;ll nudge you when it&apos;s time to restock.
                  </p>
                </div>
              </div>
              <Button variant="gold" size="lg" className="flex-shrink-0" asChild>
                <Link href="/shop">Set a Reminder <ChevronRight className="h-4 w-4" /></Link>
              </Button>
            </div>
          </FadeIn>
        </Container>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────────── */}
      <section className="py-16 bg-sand" aria-label="Customer testimonials">
        <Container>
          <FadeIn>
            <div className="text-center mb-10">
              <span className="text-eyebrow mb-2 block">Happy Customers</span>
              <h2 className="font-display text-4xl text-green-deep">What people say</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-border space-y-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                  <div className="flex items-center gap-3 pt-2 border-t border-sand">
                    <div className="w-9 h-9 rounded-full bg-sage/50 flex items-center justify-center text-green font-semibold text-sm">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-deep">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.location}</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Newsletter Band ───────────────────────────────────────────────── */}
      <section className="py-14 bg-cream border-t border-sand" aria-label="Newsletter signup">
        <Container>
          <FadeIn>
            <div className="max-w-xl mx-auto text-center space-y-4">
              <span className="text-eyebrow">Stay Connected</span>
              <h2 className="font-display text-3xl text-green-deep">
                Get recipes, tips & exclusive offers
              </h2>
              <p className="text-muted-foreground text-sm">
                Join our newsletter for recipes, tips, and seasonal offers.
                No spam, just pure goodness.
              </p>
              <NewsletterForm />
              <p className="text-xs text-muted-foreground">
                Unsubscribe at any time. See our{" "}
                <Link href="/privacy" className="underline hover:text-green">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
