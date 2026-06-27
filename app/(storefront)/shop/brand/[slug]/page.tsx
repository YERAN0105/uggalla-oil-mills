import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FilterSidebar } from "@/components/storefront/FilterSidebar";
import { ProductGrid } from "@/components/storefront/ProductGrid";
import { ProductGridSkeleton } from "@/components/storefront/ProductSkeleton";
import { SortSelect } from "@/components/storefront/SortSelect";
import { Pagination } from "@/components/storefront/Pagination";
import { MobileFilterDrawer } from "@/components/storefront/MobileFilterDrawer";
import { JsonLd } from "@/components/shared/JsonLd";
import {
  getProducts,
  getCategories,
  getBrands,
  getAvailableSizes,
  getBrandBySlug,
  type SortOption,
} from "@/lib/products";
import { brand } from "@/lib/brand";

interface BrandPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PAGE_SIZE = 12;

function getStringArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brandRow = await getBrandBySlug(slug);
  if (!brandRow) return { title: "Brand Not Found" };
  return {
    title: brandRow.name,
    description:
      brandRow.description ?? `Browse ${brandRow.name} oils — fresh from Padukka, Sri Lanka.`,
    openGraph: {
      images: brandRow.image_url ? [{ url: brandRow.image_url }] : [],
    },
  };
}

export default async function BrandPage({ params, searchParams }: BrandPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const [brandRow, allCategories, allBrands, availableSizes] = await Promise.all([
    getBrandBySlug(slug),
    getCategories(),
    getBrands(),
    getAvailableSizes(),
  ]);

  if (!brandRow) notFound();

  // The wholesale brand shares the company name (see lib/brand.ts) — it's the
  // bulk / quote brand, so it gets the "Wholesale & Bulk" eyebrow and hides the
  // category/size filters (bulk products have no sizes). This mirrors the bulk
  // treatment on the category landing page.
  const isBulk = brandRow.name === brand.name;

  const categories = getStringArray(sp.category);
  const sizes = getStringArray(sp.size);
  const priceMin = sp.price_min ? Number(sp.price_min) : undefined;
  const priceMax = sp.price_max ? Number(sp.price_max) : undefined;
  const sort = (sp.sort as SortOption) ?? "newest";
  const query = (sp.q as string) ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const { products, totalCount } = await getProducts({
    brands: [slug],
    categories,
    sizes,
    priceMin,
    priceMax,
    sort,
    query,
    page,
    pageSize: PAGE_SIZE,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${appUrl}/` },
      { "@type": "ListItem", position: 2, name: "Shop", item: `${appUrl}/shop` },
      { "@type": "ListItem", position: 3, name: brandRow.name, item: `${appUrl}/shop/brand/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-cream">
      <JsonLd data={breadcrumbLd} />
      {/* Brand hero */}
      <div className="relative bg-green-deep text-white overflow-hidden">
        {brandRow.image_url && (
          <Image
            src={brandRow.image_url}
            alt={brandRow.name}
            fill
            className="object-cover opacity-20"
            sizes="100vw"
            priority
          />
        )}
        <Container className="relative py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-1.5 text-xs text-white/60 flex-wrap">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <ChevronRight className="h-3 w-3" />
              <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
              <ChevronRight className="h-3 w-3" />
              <li className="text-white font-medium">{brandRow.name}</li>
            </ol>
          </nav>
          <span className="text-gold text-xs font-semibold uppercase tracking-widest">
            {isBulk ? "Wholesale & Bulk" : "Our Range"}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1 mb-2">
            {brandRow.name}
          </h1>
          {brandRow.description && (
            <p className="text-white/70 text-sm max-w-xl">{brandRow.description}</p>
          )}
        </Container>
      </div>

      <Container className="py-8">
        <div className="flex gap-8">
          {/* Filter sidebar */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-24">
              <Suspense fallback={null}>
                <FilterSidebar
                  categories={allCategories}
                  brands={allBrands}
                  availableSizes={availableSizes}
                  hideBrands
                  hideCategories={isBulk}
                  hideSizes={isBulk}
                />
              </Suspense>
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {totalCount} product{totalCount !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-3">
                <Suspense fallback={null}>
                  <MobileFilterDrawer
                    categories={allCategories}
                    brands={allBrands}
                    availableSizes={availableSizes}
                    hideBrands
                    hideCategories={isBulk}
                    hideSizes={isBulk}
                  />
                </Suspense>
                <Suspense fallback={null}>
                  <SortSelect />
                </Suspense>
              </div>
            </div>

            <Suspense fallback={<ProductGridSkeleton count={PAGE_SIZE} />}>
              <ProductGrid products={products} />
            </Suspense>

            {totalCount > PAGE_SIZE && (
              <Suspense fallback={null}>
                <Pagination totalCount={totalCount} pageSize={PAGE_SIZE} currentPage={page} />
              </Suspense>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
