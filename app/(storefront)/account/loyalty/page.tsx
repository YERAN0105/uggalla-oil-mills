import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award, Coins, Clock, Star } from "lucide-react";
import { AccountPageHeading } from "@/components/account/primitives";
import { LoyaltyHistory } from "@/components/account/LoyaltyHistory";
import { getAccountUser, getLoyalty } from "@/lib/account/data";
import { getLoyaltySettings } from "@/lib/settings";
import { formatCurrency } from "@/lib/brand";

export const metadata: Metadata = { title: "Loyalty Points" };

export default async function LoyaltyPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/loyalty");

  const [{ balance, transactions }, loyalty] = await Promise.all([
    getLoyalty(user.id),
    getLoyaltySettings(),
  ]);

  const perPoint = loyalty.redeem_rate / loyalty.redeem_per_points; // Rs per point
  const cashValue = balance * perPoint;

  return (
    <div>
      <AccountPageHeading
        title="Loyalty Points"
        description="Earn points on every delivered order and redeem them at checkout."
      />

      {/* Balance */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-gold-warm/30 bg-gradient-to-br from-gold/15 to-gold/5 p-6">
        <div className="flex items-center gap-2 text-gold-warm">
          <Award className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Current balance</span>
        </div>
        <p className="mt-2 font-display text-4xl font-semibold text-green-deep">
          {balance.toLocaleString()} <span className="text-2xl">points</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          ≈ {formatCurrency(cashValue)} towards a future order
        </p>
      </div>

      {/* How it works */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <InfoCard
          icon={<Star className="h-4 w-4" />}
          title="Earn"
          body={`${loyalty.earn_rate} point per ${formatCurrency(loyalty.earn_per_amount)} spent, credited when your order is delivered.`}
        />
        <InfoCard
          icon={<Coins className="h-4 w-4" />}
          title="Redeem"
          body={`${loyalty.redeem_per_points} points = ${formatCurrency(loyalty.redeem_rate)} off, up to ${loyalty.max_redeem_percent}% of an order.`}
        />
        <InfoCard
          icon={<Clock className="h-4 w-4" />}
          title="Expiry"
          body={`Points are valid for ${loyalty.expiry_months} months. Bonuses for first orders & reviews.`}
        />
      </div>

      <h2 className="mb-3 font-display text-lg text-green-deep">Transaction history</h2>
      <LoyaltyHistory transactions={transactions} />
    </div>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-4">
      <div className="flex items-center gap-2 text-green">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sage/30">{icon}</div>
        <span className="font-display text-green-deep">{title}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
