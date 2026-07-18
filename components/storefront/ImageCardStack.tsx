"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { m } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AboutStackImage } from "@/lib/about-stack";

type Orientation = "vertical" | "horizontal";

interface ImageCardStackProps {
  images: AboutStackImage[];
  /** Stack/swipe axis. We use "vertical" on desktop, "horizontal" on phones. */
  orientation?: Orientation;
  showCaptions?: boolean;
  className?: string;
  /** Auto-advance interval (ms). */
  autoPlayMs?: number;
}

const GAP = { vertical: 28, horizontal: 28 }; // px the side cards peek out
const SCALE_STEP = 0.08; // how much smaller the flanking cards are
const SIDE_OPACITY = 0.5; // opacity of the peeking neighbours
const SWIPE_THRESHOLD = 40; // px to count as a swipe
const TAP_THRESHOLD = 8; // px under which a press counts as a tap

export function ImageCardStack({
  images,
  orientation = "vertical",
  showCaptions = false,
  className,
  autoPlayMs = 4500,
}: ImageCardStackProps) {
  const n = images.length;
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pressRef = useRef<{ x: number; y: number } | null>(null);

  const isV = orientation === "vertical";

  const advance = useCallback(
    (dir: number) => setActive((a) => ((a + dir) % n + n) % n),
    [n]
  );

  // Respect prefers-reduced-motion (Framer is JS, so CSS alone won't stop it).
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Only autoplay while actually on screen. This also idles the CSS-hidden
  // duplicate instance (the other orientation), which never intersects.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (n <= 1 || reduced || paused || !inView) return;
    const id = setInterval(() => advance(1), autoPlayMs);
    return () => clearInterval(id);
  }, [n, reduced, paused, inView, autoPlayMs, advance]);

  if (n === 0) return null;

  // ── Swipe + tap via pointer events (drag isn't in the app's Framer bundle) ──
  const onPointerDown = (e: React.PointerEvent) => {
    pressRef.current = { x: e.clientX, y: e.clientY };
    setPaused(true);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pressRef.current;
    pressRef.current = null;
    setPaused(false);
    if (!start || n <= 1) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const primary = isV ? dy : dx; // movement along the stack axis
    const cross = isV ? dx : dy;

    if (Math.abs(primary) >= SWIPE_THRESHOLD && Math.abs(primary) > Math.abs(cross)) {
      // vertical: swipe up = next; horizontal: swipe left = next
      advance(primary < 0 ? 1 : -1);
    } else if (Math.hypot(dx, dy) < TAP_THRESHOLD) {
      advance(1); // simple tap advances
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (n <= 1) return;
    const next = isV ? "ArrowDown" : "ArrowRight";
    const prev = isV ? "ArrowUp" : "ArrowLeft";
    if (e.key === next || e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      advance(1);
    } else if (e.key === prev || e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      advance(-1);
    }
  };

  // Equal breathing room on BOTH sides of the axis so neighbours peek on each
  // side and the stack stays centred.
  const reserve = GAP[orientation] + 6;

  return (
    <div className={cn("isolate w-full select-none", className)}>
      <div
        ref={containerRef}
        role="group"
        aria-roledescription="carousel"
        aria-label="Photos of Uggalla Oil Mills"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pressRef.current = null;
          setPaused(false);
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        className="relative cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        style={{
          paddingTop: isV ? reserve : undefined,
          paddingBottom: isV ? reserve : undefined,
          paddingLeft: isV ? undefined : reserve,
          paddingRight: isV ? undefined : reserve,
          touchAction: isV ? "pan-x" : "pan-y",
        }}
      >
        <div className="relative aspect-[4/3]">
          {images.map((img, i) => {
            // Signed, wrapped distance from the front card: 0 = front,
            // -1 / +1 = the two neighbours peeking on either side, |rel| >= 2 =
            // parked out of sight behind a side slot. Symmetric so neighbours
            // show on BOTH sides (top+bottom / left+right) and stay centred.
            let rel = ((i - active) % n + n) % n; // 0..n-1
            if (rel > n / 2) rel -= n; // fold the far half to the negative side
            const absRel = Math.abs(rel);
            const offset = Math.sign(rel) * GAP[orientation]; // clamped to one slot each side
            return (
              <m.div
                key={img.src}
                initial={false}
                animate={{
                  x: isV ? 0 : offset,
                  y: isV ? offset : 0,
                  scale: absRel === 0 ? 1 : 1 - SCALE_STEP,
                  opacity: absRel === 0 ? 1 : absRel === 1 ? SIDE_OPACITY : 0,
                }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 320, damping: 32 }
                }
                style={{ zIndex: 100 - absRel }}
                className="absolute inset-0 overflow-hidden rounded-2xl bg-sage/30 shadow-2xl"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="object-cover"
                  draggable={false}
                />
                {showCaptions && img.caption && absRel === 0 && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10">
                    <span className="text-sm font-medium text-white">{img.caption}</span>
                  </div>
                )}
              </m.div>
            );
          })}
        </div>
      </div>

      {n > 1 && (
        <div className={cn("flex gap-2", isV ? "mt-4 justify-center" : "mt-3 justify-center")}>
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show ${img.caption || `image ${i + 1}`}`}
              aria-current={i === active}
              className={cn(
                "h-2 rounded-full transition-all",
                i === active ? "w-6 bg-green" : "w-2 bg-green-deep/25 hover:bg-green-deep/40"
              )}
            />
          ))}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {images[active]?.caption
          ? `${images[active].caption}, image ${active + 1} of ${n}`
          : `Image ${active + 1} of ${n}`}
      </span>
    </div>
  );
}
