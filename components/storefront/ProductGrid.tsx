"use client";

import { useState } from "react";
import { ProductCard } from "@/components/storefront/ProductCard";
import { QuickViewModal } from "@/components/storefront/QuickViewModal";
import type { ProductWithRelations } from "@/types/supabase";

interface ProductGridProps {
  products: ProductWithRelations[];
}

export function ProductGrid({ products }: ProductGridProps) {
  const [quickViewProduct, setQuickViewProduct] = useState<ProductWithRelations | null>(null);

  if (products.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4 opacity-30">🥥</div>
        <h3 className="font-display text-xl text-green-deep mb-2">No products found</h3>
        <p className="text-muted-foreground text-sm max-w-sm">
          Try adjusting your filters or search terms to find what you&apos;re looking for.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onQuickView={setQuickViewProduct}
          />
        ))}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        open={quickViewProduct !== null}
        onClose={() => setQuickViewProduct(null)}
      />
    </>
  );
}
