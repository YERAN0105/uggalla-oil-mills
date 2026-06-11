import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPageHeading } from "@/components/account/primitives";
import { ReviewsList } from "@/components/account/ReviewsList";
import { getAccountUser, getAccountReviews } from "@/lib/account/data";

export const metadata: Metadata = { title: "My Reviews" };

export default async function ReviewsPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/reviews");
  const reviews = await getAccountReviews(user.id);

  return (
    <div>
      <AccountPageHeading
        title="Reviews"
        description="Reviews you've written. Pending ones appear publicly once approved."
      />
      <ReviewsList reviews={reviews} />
    </div>
  );
}
