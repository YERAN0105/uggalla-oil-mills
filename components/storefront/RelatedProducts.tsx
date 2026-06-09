import Link from "next/link";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { ProductWithRelations } from "@/types/supabase";
import { ArrowRight } from "lucide-react";

interface RelatedProductsProps {
  products: ProductWithRelations[];
  categoryName: string;
  categorySlug: string;
}

export function RelatedProducts({ products, categoryName, categorySlug }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className="py-10 border-t border-sand">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl text-green-deep">You May Also Like</h2>
        <Link
          href={`/shop/category/${categorySlug}`}
          className="text-sm text-green hover:text-green-700 flex items-center gap-1 transition-colors"
        >
          View {categoryName}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
