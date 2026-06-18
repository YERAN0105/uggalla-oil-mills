// One-tap reorder landing (`/reorder?sub=<id>`). Used by subscription reminders.
// Validates the subscription belongs to the logged-in user (prompts login when
// not signed in), resolves the line(s) server-side against the live catalog, and
// hands off to a client component that fills the cart and redirects to /cart.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reorderItems, reorderSubscription } from "@/lib/account/reorder";
import { ReorderClient } from "@/components/storefront/ReorderClient";

export const metadata = { title: "Reorder", robots: { index: false } };

export default async function ReorderPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; order?: string }>;
}) {
  const { sub, order } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const back = sub ? `/reorder?sub=${sub}` : order ? `/reorder?order=${order}` : "/reorder";
    redirect(`/login?redirect=${encodeURIComponent(back)}`);
  }

  const result = sub
    ? await reorderSubscription(sub)
    : order
      ? await reorderItems(order)
      : { ok: false as const, error: "Nothing to reorder." };

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold text-green-deep">We couldn&apos;t load your reorder</h1>
        <p className="mt-2 text-muted-foreground">{result.error}</p>
        <Link href="/shop" className="mt-6 inline-block text-green underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return <ReorderClient items={result.items} unavailable={result.unavailable} />;
}
