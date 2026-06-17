"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Thumbnail row for customer review photos with a click-to-enlarge lightbox.
 * Client component so the storefront ReviewsSection can stay a server component.
 */
export function ReviewPhotos({ images, authorName }: { images: string[]; authorName: string }) {
  const [active, setActive] = useState<number | null>(null);

  if (images.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 pt-0.5">
        {images.map((url, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            className="h-16 w-16 overflow-hidden rounded-lg border border-sand transition-opacity hover:opacity-80 focus-visible:ring-2"
            aria-label={`View photo ${i + 1} from ${authorName}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-2xl p-2" aria-describedby={undefined}>
          <DialogTitle className="sr-only">
            {active !== null ? `Photo from ${authorName}` : "Review photo"}
          </DialogTitle>
          {active !== null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[active]}
              alt={`Photo from ${authorName}`}
              className="max-h-[75vh] w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
