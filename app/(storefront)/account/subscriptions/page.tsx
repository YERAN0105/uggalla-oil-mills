import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Bell, RefreshCcw, ShieldCheck } from "lucide-react";
import { AccountPageHeading } from "@/components/account/primitives";
import { SubscriptionsList } from "@/components/account/SubscriptionsList";
import { getAccountUser, getAccountSubscriptions } from "@/lib/account/data";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/subscriptions");
  const subscriptions = await getAccountSubscriptions(user.id);

  return (
    <div>
      <AccountPageHeading
        title="Subscriptions"
        description="Reorder reminders for the products you buy regularly."
      />

      {/* How it works */}
      <div className="mb-5 grid gap-3 rounded-2xl border border-sage/60 bg-sage/10 p-5 sm:grid-cols-3">
        <Explainer icon={<Bell className="h-4 w-4" />} title="We remind you" body="A gentle nudge on your schedule — weekly, fortnightly, or monthly." />
        <Explainer icon={<RefreshCcw className="h-4 w-4" />} title="Reorder in one tap" body="Each reminder pre-fills your cart with the same product and size." />
        <Explainer icon={<ShieldCheck className="h-4 w-4" />} title="Never auto-charged" body="You always check out yourself. We never store or charge a card." />
      </div>

      <SubscriptionsList subscriptions={subscriptions} />
    </div>
  );
}

function Explainer({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green text-gold">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-green-deep">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
