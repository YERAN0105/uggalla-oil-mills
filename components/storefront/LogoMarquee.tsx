import Image from "next/image";

export interface MarqueeLogo {
  /** Display name — used as the alt text and as the visible label when no image is set. */
  name: string;
  /** Optional logo file in /public (e.g. "/trust-logos/sls.png"). Omit to show the name as a text wordmark. */
  src?: string;
}

interface LogoMarqueeProps {
  logos: MarqueeLogo[];
  /** Small label above the strip. */
  eyebrow?: string;
}

/**
 * Auto-scrolling logo strip ("trusted by" marquee). The track renders the logos
 * twice and animates -50% so the loop is seamless; it pauses on hover and stops
 * for reduced-motion users (handled globally in globals.css). Renders nothing
 * when there are no logos, so an empty list never ships a broken strip.
 */
export function LogoMarquee({ logos, eyebrow = "Trusted & Certified" }: LogoMarqueeProps) {
  if (logos.length === 0) return null;

  // Two copies back-to-back make the -50% translate loop seamlessly.
  const track = [...logos, ...logos];

  return (
    <section className="py-10 bg-cream" aria-label="Certifications and partners">
      {eyebrow && (
        <p className="text-eyebrow text-center mb-6 px-4">{eyebrow}</p>
      )}
      {/* marquee-group enables pause-on-hover; the masks fade the edges. */}
      <div
        className="marquee-group relative overflow-hidden
          [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]
          [-webkit-mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      >
        <ul className="animate-marquee flex w-max items-center gap-12 sm:gap-16">
          {track.map((logo, i) => (
            <li
              key={`${logo.name}-${i}`}
              aria-hidden={i >= logos.length}
              className="flex shrink-0 items-center justify-center"
            >
              {logo.src ? (
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={160}
                  height={56}
                  className="h-10 w-auto object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0 sm:h-12"
                />
              ) : (
                <span className="font-display whitespace-nowrap text-xl text-green-deep/60 transition hover:text-green-deep sm:text-2xl">
                  {logo.name}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
