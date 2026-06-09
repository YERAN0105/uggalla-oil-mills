import { Container } from "@/components/shared/Container";
import { ProductGridSkeleton } from "@/components/storefront/ProductSkeleton";

export default function ShopLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-green-deep h-28" />
      <Container className="py-8">
        <div className="flex gap-8">
          <aside className="hidden md:block w-56 flex-shrink-0" />
          <div className="flex-1">
            <ProductGridSkeleton count={12} />
          </div>
        </div>
      </Container>
    </div>
  );
}
