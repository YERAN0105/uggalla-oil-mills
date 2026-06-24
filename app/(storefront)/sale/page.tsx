import type { Metadata } from "next";
import { Suspense } from "react";
import { Tag } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FilterSidebar } from "@/components/storefront/FilterSidebar";
import { MobileFilterDrawer } from "@/components/storefront/MobileFilterDrawer";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { ProductGridSkeleton } from "@/components/storefront/ProductSkeleton";
import { SortSelect } from "@/components/storefront/SortSelect";
import { Pagination } from "@/components/storefront/Pagination";
import {
  getProducts,
  getCategories,
  getBrands,
  getAvailableSizes,
  type SortOption,
} from "@/lib/products";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sale",
  description: `Discounted ${brand.name} coconut oil — shop products currently on offer while stocks last.`,
};

const PAGE_SIZE = 12;

interface SalePageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function getStringArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export default async function SalePage({ searchParams }: SalePageProps) {
  const params = await searchParams;

  const categories = getStringArray(params.category);
  const brands = getStringArray(params.brand);
  const sizes = getStringArray(params.size);
  const priceMin = params.price_min ? Number(params.price_min) : undefined;
  const priceMax = params.price_max ? Number(params.price_max) : undefined;
  const sort = (params.sort as SortOption) ?? "newest";
  const page = params.page ? Number(params.page) : 1;

  const [{ products, totalCount }, allCategories, allBrands, availableSizes] =
    await Promise.all([
      getProducts({
        onSale: true,
        categories,
        brands,
        sizes,
        priceMin,
        priceMax,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
      getCategories(),
      getBrands(),
      getAvailableSizes(),
    ]);

  const hasFilters =
    categories.length > 0 || brands.length > 0 || sizes.length > 0 || !!priceMin || !!priceMax;

  return (
    <div className="min-h-screen bg-cream">
      {/* Page header */}
      <div className="bg-green-deep text-white py-10">
        <Container>
          <span className="inline-flex items-center gap-1.5 text-gold text-xs font-semibold uppercase tracking-widest">
            <Tag className="h-3.5 w-3.5" />
            On Sale
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1 mb-2">
            Special Offers
          </h1>
          <p className="text-white/70 text-sm max-w-xl">
            Grab our coconut oil at a discount — limited-time prices while stocks last.
          </p>
        </Container>
      </div>

      <Container className="py-8">
        <div className="flex gap-8">
          {/* Filter sidebar — desktop */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <Suspense fallback={null}>
                <FilterSidebar
                  categories={allCategories}
                  brands={allBrands}
                  availableSizes={availableSizes}
                />
              </Suspense>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {totalCount > 0
                  ? `${totalCount} product${totalCount !== 1 ? "s" : ""} on sale${hasFilters ? " (filtered)" : ""}`
                  : "No products on sale right now"}
              </p>
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <MobileFilterDrawer
                    categories={allCategories}
                    brands={allBrands}
                    availableSizes={availableSizes}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <SortSelect />
                </Suspense>
              </div>
            </div>

            {/* Product grid */}
            <Suspense fallback={<ProductGridSkeleton count={PAGE_SIZE} />}>
              <ProductGrid products={products} />
            </Suspense>

            {/* Pagination */}
            {totalCount > PAGE_SIZE && (
              <Suspense fallback={null}>
                <Pagination
                  totalCount={totalCount}
                  pageSize={PAGE_SIZE}
                  currentPage={page}
                />
              </Suspense>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
