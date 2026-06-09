import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Clock, Shield, Leaf, Truck } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/storefront/ProductGallery";
import { ProductOptions } from "@/components/storefront/ProductOptions";
import { ReviewsSection } from "@/components/storefront/ReviewsSection";
import { RelatedProducts } from "@/components/storefront/RelatedProducts";
import { StickyBottomBar } from "@/components/storefront/StickyBottomBar";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { StarRating } from "@/components/storefront/StarRating";
import { getProduct, getRelatedProducts, getMinPrice } from "@/lib/products";
import { formatCurrency, brand } from "@/lib/brand";
import { createClient } from "@/lib/supabase/server";
import type { Review } from "@/types/supabase";
import { Tag } from "lucide-react";

interface PDPProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PDPProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product Not Found" };

  const primaryImage = product.product_images.find((i) => i.is_primary) ?? product.product_images[0];

  return {
    title: product.meta_title ?? product.name,
    description: product.meta_description ?? product.short_description ?? undefined,
    openGraph: {
      title: product.meta_title ?? product.name,
      description: product.meta_description ?? product.short_description ?? undefined,
      images: primaryImage ? [{ url: primaryImage.url, alt: primaryImage.alt_text ?? product.name }] : [],
      type: "website",
    },
  };
}

const TRUST_BADGES = [
  { icon: Leaf, label: "100% Pure" },
  { icon: Shield, label: "Naturally Pressed" },
  { icon: Clock, label: "24h Fresh" },
  { icon: Truck, label: "Island-wide Delivery" },
];

export default async function ProductDetailPage({ params }: PDPProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  // Fetch reviews and related products in parallel
  const supabase = await createClient();
  const [reviewsResult, relatedProducts] = await Promise.all([
    supabase
      .from("reviews")
      .select("*")
      .eq("product_id", product.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    getRelatedProducts(product.id, product.categories.id),
  ]);

  const reviews = (reviewsResult.data ?? []) as Review[];
  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  const minPrice = getMinPrice(product);
  const isBulk = product.purchase_type === "bulk_quote";

  // Sort images by display_order
  const sortedImages = [...product.product_images].sort(
    (a, b) => a.display_order - b.display_order
  );

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.short_description ?? undefined,
    brand: product.brands
      ? { "@type": "Brand", name: product.brands.name }
      : undefined,
    image: sortedImages.map((i) => i.url),
    offers: isBulk
      ? undefined
      : {
          "@type": "AggregateOffer",
          priceCurrency: brand.currency,
          lowPrice: minPrice,
          highPrice: Math.max(...product.product_sizes.map((s) => Number(s.price))),
          offerCount: product.product_sizes.length,
          availability:
            product.stock_tracked && product.stock_quantity === 0
              ? "https://schema.org/OutOfStock"
              : "https://schema.org/InStock",
        },
    aggregateRating:
      avgRating && reviews.length
        ? {
            "@type": "AggregateRating",
            ratingValue: avgRating.toFixed(1),
            reviewCount: reviews.length,
          }
        : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-cream pb-20 md:pb-0">
        <Container className="py-6 md:py-10">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
              <li>
                <Link href="/" className="hover:text-green transition-colors">Home</Link>
              </li>
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <li>
                <Link href="/shop" className="hover:text-green transition-colors">Shop</Link>
              </li>
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <li>
                <Link
                  href={`/shop/category/${product.categories.slug}`}
                  className="hover:text-green transition-colors"
                >
                  {product.categories.name}
                </Link>
              </li>
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <li className="text-green-deep font-medium truncate max-w-[200px]">
                {product.name}
              </li>
            </ol>
          </nav>

          {/* Main product section */}
          <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
            {/* Left: Gallery */}
            <FadeIn>
              <ProductGallery images={sortedImages} productName={product.name} />
            </FadeIn>

            {/* Right: Product info */}
            <FadeIn className="flex flex-col gap-5">
              {/* Brand + badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {product.brands && (
                  <span className="text-eyebrow">{product.brands.name}</span>
                )}
                {product.is_featured && (
                  <Badge className="bg-gold text-green-deep text-xs">Featured</Badge>
                )}
                {product.is_bestseller && (
                  <Badge className="bg-green text-white text-xs">Bestseller</Badge>
                )}
              </div>

              {/* Name */}
              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-green-deep leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              {reviews.length > 0 && avgRating ? (
                <a href="#reviews" className="flex items-center gap-2 hover:text-green transition-colors w-fit">
                  <StarRating rating={avgRating} count={reviews.length} size="md" />
                  <span className="text-xs text-muted-foreground underline underline-offset-2">
                    {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                  </span>
                </a>
              ) : (
                <a href="#reviews" className="text-xs text-muted-foreground hover:text-green transition-colors w-fit underline underline-offset-2">
                  No reviews yet — be the first
                </a>
              )}

              {/* Price */}
              <div>
                {isBulk ? (
                  <div className="flex items-center gap-2 text-green">
                    <Tag className="h-5 w-5" />
                    <span className="font-display text-2xl font-semibold">
                      from {formatCurrency(minPrice)} / L
                    </span>
                  </div>
                ) : (
                  <div className="flex items-baseline gap-2">
                    <span className="font-display text-3xl font-semibold text-green-deep">
                      {formatCurrency(minPrice)}
                    </span>
                    {product.product_sizes.length > 1 && (
                      <span className="text-sm text-muted-foreground">from</span>
                    )}
                  </div>
                )}
              </div>

              {/* Short description */}
              {product.short_description && (
                <p className="text-muted-foreground leading-relaxed">{product.short_description}</p>
              )}

              {/* Options or Quote CTA */}
              {isBulk ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-green/20 bg-green/5 p-4 text-sm text-green-deep">
                    <p className="font-medium mb-1">Bulk / Wholesale Inquiry</p>
                    <p className="text-muted-foreground text-sm">
                      This product is available for bulk orders only. Fill in the quote form below and we&apos;ll send you a tailored price within 24 hours.
                    </p>
                  </div>
                  <Button asChild className="w-full h-12 text-base font-semibold">
                    <Link href={`/bulk-request?product=${product.id}`}>
                      <Tag className="mr-2 h-4 w-4" />
                      Request a Quote
                    </Link>
                  </Button>
                  <div className="flex items-center justify-center">
                    <WishlistButton productId={product.id} productName={product.name} />
                    <span className="text-xs text-muted-foreground ml-2">Save for later</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <ProductOptions product={product} />
                  <div className="flex items-center justify-center">
                    <WishlistButton productId={product.id} productName={product.name} />
                    <span className="text-xs text-muted-foreground ml-2">Save to wishlist</span>
                  </div>
                </div>
              )}

              {/* Estimated delivery */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-sand pt-4">
                <Truck className="h-4 w-4 text-green flex-shrink-0" />
                <span>
                  Estimated delivery: {brand.minLeadTimeHours}h+ after order confirmation. Free delivery on orders over {formatCurrency(brand.freeDeliveryThreshold)}.
                </span>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-4 gap-2 border-t border-sand pt-4">
                {TRUST_BADGES.map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 text-center">
                    <div className="h-8 w-8 rounded-full bg-sage/30 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-green" />
                    </div>
                    <span className="text-[10px] text-muted-foreground leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>

          {/* Below the fold */}
          <div className="mt-12 md:mt-16 max-w-3xl space-y-10">
            {/* Full description */}
            {product.description && (
              <FadeIn>
                <h2 className="font-display text-2xl text-green-deep mb-4">About This Product</h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground [&_p]:mb-3 [&_p:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </FadeIn>
            )}

            {/* Key facts accordion */}
            {product.key_facts && product.key_facts.length > 0 && (
              <FadeIn>
                <Accordion type="multiple" defaultValue={["facts"]}>
                  <AccordionItem value="facts">
                    <AccordionTrigger className="text-base font-display font-semibold">
                      Key Facts &amp; Specifications
                    </AccordionTrigger>
                    <AccordionContent>
                      <dl className="space-y-2">
                        {product.key_facts.map((fact) => (
                          <div key={fact.label} className="flex items-start gap-3">
                            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36 flex-shrink-0 pt-0.5">
                              {fact.label}
                            </dt>
                            <dd className="text-sm text-green-deep">{fact.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="usage">
                    <AccordionTrigger className="text-base font-display font-semibold">
                      How to Use
                    </AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Use for high-heat cooking, stir-frying, and deep-frying</li>
                        <li>• Ideal as a butter substitute in baking</li>
                        <li>• Apply directly to skin and hair as a natural moisturiser</li>
                        <li>• Store in a cool, dry place away from direct sunlight</li>
                        <li>• Natural solidification below 24°C is normal — gently warm to liquefy</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </FadeIn>
            )}

            {/* Reviews */}
            <FadeIn>
              <ReviewsSection reviews={reviews} avgRating={avgRating} />
            </FadeIn>
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <FadeIn>
              <RelatedProducts
                products={relatedProducts}
                categoryName={product.categories.name}
                categorySlug={product.categories.slug}
              />
            </FadeIn>
          )}
        </Container>
      </div>

      {/* Mobile sticky bottom bar */}
      <StickyBottomBar product={product} />
    </>
  );
}
