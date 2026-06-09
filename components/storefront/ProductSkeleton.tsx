import { Skeleton } from "@/components/ui/skeleton";

export function ProductSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-sand">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 flex flex-col gap-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-7 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ProductSkeleton key={i} />
      ))}
    </div>
  );
}
