import { Container } from "@/components/shared/Container";
import { Skeleton } from "@/components/ui/skeleton";

export default function PDPLoading() {
  return (
    <div className="min-h-screen bg-cream">
      <Container className="py-10">
        <Skeleton className="h-4 w-48 mb-8" />
        <div className="grid md:grid-cols-2 gap-8 lg:gap-14">
          <Skeleton className="aspect-square rounded-2xl w-full" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </Container>
    </div>
  );
}
