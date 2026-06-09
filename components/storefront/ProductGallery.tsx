"use client";

import { useState } from "react";
import Image from "next/image";
import { m, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductWithRelations } from "@/types/supabase";

type ProductImage = ProductWithRelations["product_images"][0];

interface ProductGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-sand/40 rounded-2xl flex items-center justify-center">
        <span className="text-8xl opacity-30">🥥</span>
      </div>
    );
  }

  const activeImage = images[activeIdx];

  return (
    <>
      <div className="space-y-3">
        {/* Main image */}
        <div
          className="relative aspect-square rounded-2xl overflow-hidden bg-sand/30 cursor-zoom-in group"
          onClick={() => setLightboxOpen(true)}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={activeIdx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0"
            >
              <Image
                src={activeImage.url}
                alt={activeImage.alt_text ?? productName}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </m.div>
          </AnimatePresence>

          {/* Zoom hint */}
          <div className="absolute bottom-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <ZoomIn className="h-4 w-4 text-green-deep" />
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product images">
            {images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setActiveIdx(idx)}
                role="tab"
                aria-selected={activeIdx === idx}
                aria-label={img.alt_text ?? `Product image ${idx + 1}`}
                className={cn(
                  "relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all duration-200",
                  activeIdx === idx
                    ? "border-green shadow-sm"
                    : "border-sand hover:border-green/40"
                )}
              >
                <Image
                  src={img.url}
                  alt={img.alt_text ?? `Product image ${idx + 1}`}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-green-deep/90 backdrop-blur-sm p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
              aria-label="Close lightbox"
            >
              <X className="h-5 w-5" />
            </button>

            <m.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-3xl w-full aspect-square rounded-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={activeImage.url}
                alt={activeImage.alt_text ?? productName}
                fill
                sizes="(max-width: 1200px) 90vw, 768px"
                className="object-contain"
              />
            </m.div>

            {images.length > 1 && (
              <div
                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      activeIdx === idx ? "bg-gold" : "bg-white/40 hover:bg-white/70"
                    )}
                    aria-label={`Go to image ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
