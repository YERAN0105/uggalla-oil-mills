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
  getCategoryBySlug,
  type SortOption,
} from "@/lib/products";
import { brand } from "@/lib/brand";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const PAGE_SIZE = 12;

function getStringArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category Not Found" };
  const categoryBrand = category.is_bulk ? brand.name : brand.productBrand;
  return {
    title: category.name,
    description:
      category.description ??
      `Browse ${categoryBrand} oil products in the ${category.name} category.`,
    openGraph: {
      images: category.image_url ? [{ url: category.image_url }] : [],
    },
  };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const sp = await searchParams;

  const [category, allCategories, allBrands, availableSizes] = await Promise.all([
    getCategoryBySlug(slug),
    getCategories(),
    getBrands(),
    getAvailableSizes(),
  ]);

  if (!category) notFound();

  const brands = getStringArray(sp.brand);
  const sizes = getStringArray(sp.size);
  const priceMin = sp.price_min ? Number(sp.price_min) : undefined;
  const priceMax = sp.price_max ? Number(sp.price_max) : undefined;
  const sort = (sp.sort as SortOption) ?? "newest";
  const query = (sp.q as string) ?? "";
  const page = sp.page ? Number(sp.page) : 1;

  const { products, totalCount } = await getProducts({
    categories: [slug],
    brands,
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
      { "@type": "ListItem", position: 3, name: category.name, item: `${appUrl}/shop/category/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-cream">
      <JsonLd data={breadcrumbLd} />
      {/* Category hero */}
      <div className="relative bg-green-deep text-white overflow-hidden flex items-center min-h-[220px] sm:min-h-[300px]">
        {category.image_url && (
          <>
            <Image
              src={category.image_url}
              alt={category.name}
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
            {/* Readability gradient — dark where the text sits, fading clear.
               Neutral (no green) so the banner reads as the photo, not a tint. */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/15" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </>
        )}
        <Container className="relative py-12 sm:py-16">
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex items-center gap-1.5 text-xs text-white/60 flex-wrap">
              <li><Link href="/" className="hover:text-white transition-colors">Home</Link></li>
              <ChevronRight className="h-3 w-3" />
              <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
              <ChevronRight className="h-3 w-3" />
              <li className="text-white font-medium">{category.name}</li>
            </ol>
          </nav>
          <span className="text-gold text-xs font-semibold uppercase tracking-widest">
            {category.is_bulk ? brand.name : brand.productBrand}
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1 mb-2">
            {category.name}
          </h1>
          {category.description && (
            <p className="text-white/70 text-sm max-w-xl">{category.description}</p>
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
                  hideCategories
                  hideBrands
                  hideSizes={category.is_bulk}
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
                    hideCategories
                    hideBrands
                    hideSizes={category.is_bulk}
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
