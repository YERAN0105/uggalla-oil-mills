"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/brand";
import { getMinPrice, getSizeDiscount, getDisplayDiscount } from "@/lib/product-utils";
import type { ProductWithRelations } from "@/types/supabase";

type SizeOption = ProductWithRelations["product_sizes"][0];

interface PdpContextValue {
  selectedSize: SizeOption | null;
  setSelectedSize: (size: SizeOption | null) => void;
}

const PdpContext = createContext<PdpContextValue | null>(null);

/**
 * Shares the selected size across the product page so the price heading, the
 * size picker (ProductOptions) and the mobile sticky bar all stay in sync.
 * A single-size product is auto-selected so its real price shows immediately.
 */
export function PdpPurchaseProvider({
  product,
  children,
}: {
  product: ProductWithRelations;
  children: ReactNode;
}) {
  const sorted = [...product.product_sizes].sort(
    (a, b) => a.display_order - b.display_order
  );
  const [selectedSize, setSelectedSize] = useState<SizeOption | null>(
    sorted.length === 1 ? sorted[0] : null
  );

  return (
    <PdpContext.Provider value={{ selectedSize, setSelectedSize }}>
      {children}
    </PdpContext.Provider>
  );
}

export function usePdpSize(): PdpContextValue {
  const ctx = useContext(PdpContext);
  if (!ctx) throw new Error("usePdpSize must be used within a PdpPurchaseProvider");
  return ctx;
}

/**
 * The main price line under the product name. Reflects the selected size's
 * price (and that size's own discount) once chosen; otherwise the "from"
 * minimum price. Retail only — bulk renders its own price line.
 */
export function PdpPriceHeading({ product }: { product: ProductWithRelations }) {
  const { selectedSize } = usePdpSize();
  const multiSize = product.product_sizes.length > 1;

  const price = selectedSize ? Number(selectedSize.price) : getMinPrice(product);
  const discount = selectedSize
    ? getSizeDiscount(selectedSize.price, selectedSize.compare_at_price)
    : getDisplayDiscount(product);
  const showFrom = multiSize && !selectedSize;

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <span className="font-display text-3xl font-semibold text-green-deep">
        {formatCurrency(price)}
      </span>
      {discount && (
        <>
          <span className="text-lg text-muted-foreground line-through whitespace-nowrap">
            {formatCurrency(discount.original)}
          </span>
          <Badge className="bg-red-600 text-white text-xs font-bold">
            {discount.percent}% OFF
          </Badge>
        </>
      )}
      {showFrom && <span className="text-sm text-muted-foreground">from</span>}
    </div>
  );
}
