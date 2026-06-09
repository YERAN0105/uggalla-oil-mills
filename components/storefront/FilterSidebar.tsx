"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/brand";
import { cn } from "@/lib/utils";
import type { Category, Brand } from "@/types/supabase";

interface FilterSidebarProps {
  categories: Category[];
  brands: Brand[];
  availableSizes: string[];
  className?: string;
}

const PRICE_MAX_DEFAULT = 5000;

export function FilterSidebar({
  categories,
  brands,
  availableSizes,
  className,
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const selectedCategories = searchParams.getAll("category");
  const selectedBrands = searchParams.getAll("brand");
  const selectedSizes = searchParams.getAll("size");
  const priceMin = Number(searchParams.get("price_min") ?? 0);
  const priceMax = Number(searchParams.get("price_max") ?? PRICE_MAX_DEFAULT);

  const hasFilters =
    selectedCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedSizes.length > 0 ||
    priceMin > 0 ||
    priceMax < PRICE_MAX_DEFAULT;

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      updater(params);
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const toggleMultiValue = (key: string, value: string) => {
    updateParams((params) => {
      const existing = params.getAll(key);
      params.delete(key);
      if (existing.includes(value)) {
        existing.filter((v) => v !== value).forEach((v) => params.append(key, v));
      } else {
        [...existing, value].forEach((v) => params.append(key, v));
      }
    });
  };

  const clearAll = () => {
    updateParams((params) => {
      params.delete("category");
      params.delete("brand");
      params.delete("size");
      params.delete("price_min");
      params.delete("price_max");
    });
  };

  return (
    <aside className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-green-deep font-semibold">
          <SlidersHorizontal className="h-4 w-4" />
          <span>Filters</span>
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-green hover:text-green-700 flex items-center gap-1 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Category
          </h3>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <Checkbox
                  id={`cat-${cat.slug}`}
                  checked={selectedCategories.includes(cat.slug)}
                  onCheckedChange={() => toggleMultiValue("category", cat.slug)}
                />
                <Label
                  htmlFor={`cat-${cat.slug}`}
                  className="text-sm text-green-deep cursor-pointer select-none"
                >
                  {cat.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Brand */}
      {brands.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Brand
          </h3>
          <div className="space-y-2">
            {brands.map((brand) => (
              <div key={brand.id} className="flex items-center gap-2">
                <Checkbox
                  id={`brand-${brand.slug}`}
                  checked={selectedBrands.includes(brand.slug)}
                  onCheckedChange={() => toggleMultiValue("brand", brand.slug)}
                />
                <Label
                  htmlFor={`brand-${brand.slug}`}
                  className="text-sm text-green-deep cursor-pointer select-none"
                >
                  {brand.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
      {availableSizes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Size
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {availableSizes.map((size) => (
              <button
                key={size}
                onClick={() => toggleMultiValue("size", size)}
                className={cn(
                  "text-xs px-3 py-1 rounded-full border transition-colors",
                  selectedSizes.includes(size)
                    ? "bg-green text-white border-green"
                    : "border-sand text-green-deep hover:border-green/50 hover:bg-sage/20"
                )}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Price range */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Price Range
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-green-deep">
            <span>{formatCurrency(priceMin)}</span>
            <span className="text-muted-foreground">—</span>
            <span>{priceMax >= PRICE_MAX_DEFAULT ? `${formatCurrency(PRICE_MAX_DEFAULT)}+` : formatCurrency(priceMax)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={PRICE_MAX_DEFAULT}
            step={100}
            value={priceMin}
            onChange={(e) =>
              updateParams((p) => {
                p.set("price_min", e.target.value);
                if (Number(e.target.value) >= priceMax) p.set("price_max", e.target.value);
              })
            }
            className="w-full accent-green cursor-pointer"
            aria-label="Minimum price"
          />
          <input
            type="range"
            min={0}
            max={PRICE_MAX_DEFAULT}
            step={100}
            value={priceMax}
            onChange={(e) =>
              updateParams((p) => {
                p.set("price_max", e.target.value);
                if (Number(e.target.value) <= priceMin) p.set("price_min", e.target.value);
              })
            }
            className="w-full accent-green cursor-pointer"
            aria-label="Maximum price"
          />
        </div>
      </div>

      {hasFilters && (
        <Button variant="outline" className="w-full" onClick={clearAll}>
          <X className="h-3 w-3 mr-2" />
          Clear Filters
        </Button>
      )}
    </aside>
  );
}
