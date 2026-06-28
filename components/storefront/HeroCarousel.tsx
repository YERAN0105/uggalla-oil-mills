"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { cn } from "@/lib/utils";

export type HeroSlide = {
  /** Resolved wide image (banner image or the built-in default); used on ≥sm. */
  image: string;
  /**
   * Optional tall/portrait crop shown only on phones (<sm). When omitted the
   * wide `image` is used at every screen size, exactly as before.
   */
  mobileImage?: string | null;
  /** null → render the styled default headline. */
  headline: string | null;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
};

const AUTO_MS = 6000;

/**
 * Homepage hero. Shows one slide statically, or rotates through several as a
 * slideshow (auto-advance + dots/arrows) when there is more than one.
 */
export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const multi = count > 1;
  const [active, setActive] = useState(0);

  const go = useCallback((i: number) => setActive(((i % count) + count) % count), [count]);

  // Auto-advance — paused for visitors who prefer reduced motion.
  useEffect(() => {
    if (!multi) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setActive((a) => (a + 1) % count), AUTO_MS);
    return () => clearInterval(t);
  }, [multi, count]);

  const slide = slides[active] ?? slides[0];

  return (
    <section
      className="relative flex min-h-[85vh] items-center overflow-hidden bg-green-deep"
      aria-label="Hero"
      aria-roledescription={multi ? "carousel" : undefined}
    >
      {/* Background images — stacked for a smooth crossfade between slides. When a
          slide has a mobileImage we render two: a portrait crop shown only on
          phones (sm:hidden) and the wide one shown from sm up (hidden sm:block).
          Without a mobileImage we render the single wide image as before. */}
      <div className="absolute inset-0">
        {slides.map((s, i) => {
          const alt = s.headline ?? "Uggalla Oil Mills shop in Padukka, Sri Lanka";
          const base = cn(
            "object-cover object-center transition-opacity duration-700",
            i === active ? "opacity-100" : "opacity-0"
          );
          return (
            <Fragment key={i}>
              {s.mobileImage ? (
                <>
                  <Image
                    src={s.mobileImage}
                    alt={alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className={cn(base, "sm:hidden")}
                  />
                  <Image
                    src={s.image}
                    alt={alt}
                    fill
                    priority={i === 0}
                    sizes="100vw"
                    className={cn(base, "hidden sm:block")}
                  />
                </>
              ) : (
                <Image
                  src={s.image}
                  alt={alt}
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={base}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      {/* Decorative droplet */}
      <div className="absolute right-8 top-1/4 hidden opacity-10 lg:block" aria-hidden="true">
        <DropletSVG size={300} className="text-gold" />
      </div>

      <Container className="relative z-10 py-24">
        <FadeIn>
          <div className="max-w-2xl">
            <span className="text-eyebrow mb-4 block text-gold/80 [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">Pure · Natural · Premium</span>
            <h1 className="mb-6 font-display text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">
              {slide.headline ?? (
                <>
                  Sri Lanka&apos;s finest
                  <span className="block text-gold">pure oils</span>
                </>
              )}
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-white/70 [text-shadow:0_2px_12px_rgba(0,0,0,0.55)]">{slide.subheadline}</p>
            <div className="flex flex-wrap gap-4">
              <Button size="xl" variant="gold" asChild>
                <Link href={slide.ctaLink}>
                  {slide.ctaText} <ChevronRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="xl"
                variant="outline"
                className="border-white/30 text-white hover:border-white/50 hover:bg-white/10 hover:text-white"
                asChild
              >
                <Link href="/about">Our Story</Link>
              </Button>
            </div>
          </div>
        </FadeIn>
      </Container>

      {/* Arrows + dots — only when there's more than one slide. */}
      {multi && (
        <>
          <button
            type="button"
            onClick={() => go(active - 1)}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors hover:bg-white/25 sm:left-5"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(active + 1)}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur transition-colors hover:bg-white/25 sm:right-5"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-16 left-0 right-0 z-20 flex justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === active}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === active ? "w-6 bg-gold" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        </>
      )}

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
        <svg viewBox="0 0 1440 60" className="block w-full fill-cream" preserveAspectRatio="none">
          <path d="M0,0 C480,60 960,60 1440,0 L1440,60 L0,60 Z" />
        </svg>
        {/* Solid cream backstop over the wave's flat bottom edge. The curve never
            dips into this strip, so it can't hide the wave — but a rectangular
            fill paints to the section's true bottom without the sub-pixel gap
            the rasterized SVG leaves, which was showing as a dark hairline on
            high-DPI screens. */}
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-cream" />
      </div>
    </section>
  );
}
