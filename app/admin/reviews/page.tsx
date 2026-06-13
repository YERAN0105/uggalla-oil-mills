import type { Metadata } from "next";
import { listReviews, getReviewCounts } from "@/lib/admin/reviews-data";
import { ReviewsClient } from "@/components/admin/reviews/ReviewsClient";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "all";
  const [reviews, counts] = await Promise.all([listReviews(status), getReviewCounts()]);
  return <ReviewsClient reviews={reviews} counts={counts} status={status} />;
}
