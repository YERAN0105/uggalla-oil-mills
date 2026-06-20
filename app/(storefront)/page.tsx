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
import { getProducts, getCategories } from "@/lib/products";
import { getHeroBanners } from "@/lib/banners";
import { HeroCarousel, type HeroSlide } from "@/components/storefront/HeroCarousel";
import { brand } from "@/lib/brand";

const trustPoints = [
  {
    icon: Leaf,
    title: "100% Pure",
    description: "Directly from mature Sri Lankan coconuts. No additives, no preservatives.",
  },
  {
    icon: Droplets,
    title: "Naturally Pressed",
    description: "Cold-pressed at our Padukka mill using traditional methods for full flavour.",
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
    description: "Secure checkout with your preferred payment method — PayHere, bank transfer, or COD.",
  },
  {
    step: "3",
    icon: Truck,
    title: "Delivered fresh",
    description: "We pack and ship straight from the mill. Track your order every step.",
  },
];

const testimonials = [
  {
    name: "Amali P.",
    location: "Colombo 7",
    text: "The freshest coconut oil I've ever bought. You can actually smell the difference — pure, clean, and rich. My family won't use anything else.",
    rating: 5,
  },
  {
    name: "Roshan K.",
    location: "Kandy",
    text: "We buy in bulk for our restaurant. Uggalla Oil Mills have been reliable every time — quality is consistent and the pricing is fair.",
    rating: 5,
  },
  {
    name: "Dilani S.",
    location: "Galle",
    text: "Love the reorder reminder feature. I set it once and never run out of oil. Fast delivery too — arrived the next morning!",
    rating: 5,
  },
];

export default async function HomePage() {
  let { products: featuredProducts } = await getProducts({ featured: true, pageSize: 4 });
  if (featuredProducts.length === 0) {
    const fallback = await getProducts({ pageSize: 4 });
    featuredProducts = fallback.products;
  }
  // Category showcase comes from the database (Admin → Categories). getCategories()
  // already filters to active only, so hidden categories drop off automatically.
  const categories = (await getCategories()).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    image: c.image_url,
    href: `/shop/category/${c.slug}`,
    isBulk: c.is_bulk,
  }));

  // Hero slideshow from Admin → Banners (active "hero" banners, in order). Falls
  // back to a single built-in default slide when there are none. Each field falls
  // back independently, so a banner can change just the image, just the text, etc.
  const DEFAULT_HERO_SUB =
    "Naturally pressed at our mill in Padukka since generations. From our coconut groves to your kitchen — pure, fresh, and full of flavour.";
  const heroBanners = await getHeroBanners();
  const heroSlides: HeroSlide[] =
    heroBanners.length > 0
      ? heroBanners.map((b) => {
          const hasCta = !!(b.cta_text?.trim() && b.cta_link?.trim());
          return {
            image: b.image_url || "/hero.jpeg",
            headline: b.headline?.trim() || null,
            subheadline: b.subheadline?.trim() || DEFAULT_HERO_SUB,
            ctaText: hasCta ? b.cta_text!.trim() : "Shop Now",
            ctaLink: hasCta ? b.cta_link!.trim() : "/shop",
          };
        })
      : [{ image: "/hero.jpeg", headline: null, subheadline: DEFAULT_HERO_SUB, ctaText: "Shop Now", ctaLink: "/shop" }];

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

  return (
    <>
      <JsonLd data={websiteLd} />
      {/* ── Hero (slideshow from Admin → Banners) ─────────────────────────── */}
      <HeroCarousel slides={heroSlides} />

      {/* ── Brand Story Strip ─────────────────────────────────────────────── */}
      <section className="py-16 bg-cream" aria-label="Our mill">
        <Container>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn direction="right">
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
            </FadeIn>

            <FadeIn direction="left">
              <div className="space-y-6">
                <span className="text-eyebrow">Our Mill</span>
                <h2 className="font-display text-4xl text-green-deep leading-tight">
                  From our mill<br />
                  <span className="text-green italic">in Padukka</span>
                </h2>
                <div className="space-y-4 text-body">
                  <p>
                    Deep in the coconut belt of Sri Lanka, our mill has pressed pure coconut oil for generations.
                    We source only the finest mature coconuts from trusted growers, pressing them fresh
                    to preserve every drop of natural goodness.
                  </p>
                  <p>
                    No chemicals. No heat treatment. No shortcuts. Just honest, naturally pressed
                    coconut oil the way it was always meant to be made.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {["Cold-pressed", "No additives", "Sri Lankan origin", "Freshly packed"].map((tag) => (
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

      {/* ── Category Showcase ─────────────────────────────────────────────── */}
      {categories.length > 0 && (
        <section className="py-16 bg-sand" aria-label="Product categories">
          <Container>
            <FadeIn>
              <div className="text-center mb-10">
                <span className="text-eyebrow mb-2 block">Our Products</span>
                <h2 className="font-display text-4xl text-green-deep">
                  Choose your format
                </h2>
              </div>
            </FadeIn>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((cat, i) => (
                <FadeIn key={cat.slug} delay={i * 0.1}>
                  <Link
                    href={cat.href}
                    className="group block rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 bg-white"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {cat.image ? (
                        <Image
                          src={cat.image}
                          alt={cat.name}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        // Fallback when a category has no image uploaded yet.
                        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sage to-green/40">
                          <DropletSVG className="h-16 w-16 text-white/50" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-green-deep/60 to-transparent" />
                      {cat.isBulk && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="gold">Get a Quote</Badge>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <h3 className="font-display text-xl font-semibold text-white">{cat.name}</h3>
                        {cat.description && (
                          <p className="text-white/70 text-sm">{cat.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="p-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-green">
                        {cat.isBulk ? "Browse & request quote" : "Browse products"}
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

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <section className="py-16 bg-green" aria-label="Why our oil">
        <Container>
          <FadeIn>
            <div className="text-center mb-10">
              <span className="text-eyebrow text-gold/80 mb-2 block">The Uggalla Difference</span>
              <h2 className="font-display text-4xl text-white">Why our oil</h2>
            </div>
          </FadeIn>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {trustPoints.map((point, i) => (
              <FadeIn key={point.title} delay={i * 0.1}>
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full bg-gold/20 flex items-center justify-center">
                    <point.icon className="h-6 w-6 text-gold" aria-hidden="true" />
                  </div>
                  <h3 className="font-semibold text-white">{point.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{point.description}</p>
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
                Join our newsletter for coconut oil recipes, health tips, and seasonal offers.
                No spam — just pure goodness.
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
