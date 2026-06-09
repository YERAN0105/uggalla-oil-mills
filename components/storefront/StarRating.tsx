import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  count?: number;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  count,
  size = "sm",
  showCount = true,
  className,
}: StarRatingProps) {
  const starSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              starSize,
              star <= Math.round(rating)
                ? "fill-gold text-gold"
                : "fill-sand text-sand"
            )}
          />
        ))}
      </div>
      {showCount && count !== undefined && (
        <span className="text-xs text-muted-foreground">({count})</span>
      )}
    </div>
  );
}
