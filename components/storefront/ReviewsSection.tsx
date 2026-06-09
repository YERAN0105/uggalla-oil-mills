import { Star } from "lucide-react";
import type { Review } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface ReviewsSectionProps {
  reviews: Review[];
  avgRating?: number | null;
}

function StarBar({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-3 text-muted-foreground">{rating}</span>
      <Star className="h-3 w-3 fill-gold text-gold flex-shrink-0" />
      <div className="flex-1 h-2 rounded-full bg-sand overflow-hidden">
        <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs w-6 text-right text-muted-foreground">{count}</span>
    </div>
  );
}

export function ReviewsSection({ reviews, avgRating }: ReviewsSectionProps) {
  const approved = reviews.filter((r) => r.status === "approved");

  if (approved.length === 0) {
    return (
      <div id="reviews" className="py-8 text-center border-t border-sand">
        <div className="inline-flex flex-col items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-6 w-6 fill-sand text-sand" />
            ))}
          </div>
          <p className="text-base font-display text-green-deep">No reviews yet</p>
          <p className="text-sm text-muted-foreground">Be the first to share your experience</p>
        </div>
      </div>
    );
  }

  const starCounts = [5, 4, 3, 2, 1].map((s) => ({
    rating: s,
    count: approved.filter((r) => r.rating === s).length,
  }));

  return (
    <div id="reviews" className="space-y-6 border-t border-sand pt-8">
      <h2 className="font-display text-2xl text-green-deep">Customer Reviews</h2>

      {/* Summary */}
      <div className="flex gap-8 items-start">
        <div className="text-center">
          <div className="text-5xl font-display font-semibold text-green-deep">
            {(avgRating ?? 0).toFixed(1)}
          </div>
          <div className="flex gap-0.5 justify-center mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={cn(
                  "h-4 w-4",
                  s <= Math.round(avgRating ?? 0) ? "fill-gold text-gold" : "fill-sand text-sand"
                )}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{approved.length} reviews</p>
        </div>
        <div className="flex-1 space-y-1.5">
          {starCounts.map((s) => (
            <StarBar key={s.rating} rating={s.rating} count={s.count} total={approved.length} />
          ))}
        </div>
      </div>

      {/* Reviews list */}
      <div className="space-y-5">
        {approved.map((review) => (
          <div key={review.id} className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn(
                      "h-3.5 w-3.5",
                      s <= review.rating ? "fill-gold text-gold" : "fill-sand text-sand"
                    )}
                  />
                ))}
              </div>
              {review.title && (
                <span className="text-sm font-semibold text-green-deep">{review.title}</span>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(review.created_at).toLocaleDateString("en-LK", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            {review.body && (
              <p className="text-sm text-green-deep/80 leading-relaxed">{review.body}</p>
            )}
            {review.admin_reply && (
              <div className="ml-4 pl-3 border-l-2 border-green/20">
                <p className="text-xs font-semibold text-green mb-0.5">Uggalla Oil Mills</p>
                <p className="text-xs text-muted-foreground">{review.admin_reply}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
