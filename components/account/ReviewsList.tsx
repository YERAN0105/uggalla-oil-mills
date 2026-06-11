"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BadgeProps } from "@/components/ui/badge";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { ReviewModal } from "@/components/account/ReviewModal";
import { EmptyState } from "@/components/account/primitives";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";
import { deleteReview } from "@/lib/reviews/actions";
import type { AccountReview } from "@/types/account";

const STATUS: Record<AccountReview["status"], { label: string; variant: BadgeProps["variant"] }> = {
  pending: { label: "Pending moderation", variant: "secondary" },
  approved: { label: "Published", variant: "default" },
  hidden: { label: "Hidden", variant: "destructive" },
};

export function ReviewsList({ reviews }: { reviews: AccountReview[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (reviews.length === 0) {
    return (
      <EmptyState
        icon={<Star className="h-7 w-7 text-green" />}
        title="No reviews yet"
        description="Once an order is delivered you can review the items you bought."
        ctaHref="/account/orders"
        ctaLabel="Browse your orders"
      />
    );
  }

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await deleteReview(deleteId);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Review deleted.");
      setDeleteId(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl border border-sand bg-white p-4">
          <div className="flex gap-3">
            <Link
              href={`/shop/${review.product_slug}`}
              className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-sand"
            >
              {review.image ? (
                <Image src={review.image} alt={review.product_name} fill sizes="56px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <DropletSVG className="h-6 w-6 text-sage" />
                </div>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <Link href={`/shop/${review.product_slug}`} className="font-medium text-green-deep hover:text-green">
                  {review.product_name}
                </Link>
                <Badge variant={STATUS[review.status].variant}>{STATUS[review.status].label}</Badge>
              </div>

              <div className="mt-1 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={cn("h-3.5 w-3.5", s <= review.rating ? "fill-gold text-gold" : "fill-sand text-sand")}
                  />
                ))}
                <span className="ml-1 text-xs text-muted-foreground">{formatShortDate(review.created_at)}</span>
              </div>

              {review.title && <p className="mt-1 text-sm font-semibold text-green-deep">{review.title}</p>}
              {review.body && <p className="mt-0.5 text-sm text-green-deep/80">{review.body}</p>}

              {review.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {review.images.map((src, i) => (
                    <div key={i} className="relative h-12 w-12 overflow-hidden rounded-lg border border-sand">
                      <Image src={src} alt="" fill sizes="48px" className="object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {review.admin_reply && (
                <div className="mt-2 ml-1 border-l-2 border-green/20 pl-3">
                  <p className="text-xs font-semibold text-green">Uggalla Oil Mills</p>
                  <p className="text-xs text-muted-foreground">{review.admin_reply}</p>
                </div>
              )}

              {/* Actions */}
              <div className="mt-3 flex items-center gap-2">
                {review.status === "pending" && (
                  <ReviewModal
                    mode="edit"
                    reviewId={review.id}
                    productName={review.product_name}
                    initial={{ rating: review.rating, title: review.title ?? "", body: review.body ?? "" }}
                    trigger={
                      <button className="inline-flex items-center gap-1 text-xs font-semibold text-green hover:underline">
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                    }
                  />
                )}
                <button
                  onClick={() => setDeleteId(review.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this review?</DialogTitle>
            <DialogDescription>This permanently removes your review. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting} className="gap-2">
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
