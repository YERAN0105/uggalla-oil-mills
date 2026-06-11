"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Gift, Clock, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";
import { EmptyState } from "@/components/account/primitives";
import type { LoyaltyTransaction } from "@/types/account";

const TYPE_META: Record<
  LoyaltyTransaction["type"],
  { label: string; icon: typeof Gift; tone: string }
> = {
  earn: { label: "Earn", icon: ArrowUpCircle, tone: "text-green" },
  redeem: { label: "Redeem", icon: ArrowDownCircle, tone: "text-gold-warm" },
  bonus: { label: "Bonus", icon: Gift, tone: "text-green" },
  expire: { label: "Expire", icon: Clock, tone: "text-red-500" },
  adjust: { label: "Adjust", icon: SlidersHorizontal, tone: "text-muted-foreground" },
};

const FILTERS: ("all" | LoyaltyTransaction["type"])[] = [
  "all",
  "earn",
  "redeem",
  "bonus",
  "adjust",
  "expire",
];

export function LoyaltyHistory({ transactions }: { transactions: LoyaltyTransaction[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const rows = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);

  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={<Gift className="h-7 w-7 text-green" />}
        title="No points activity yet"
        description="Earn points on every delivered order — they'll show up here."
        ctaHref="/shop"
        ctaLabel="Start shopping"
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors",
              filter === f
                ? "border-green bg-green text-white"
                : "border-sand bg-white text-green-deep/70 hover:border-green/40"
            )}
          >
            {f === "all" ? "All" : TYPE_META[f].label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-sand bg-white">
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No {filter} transactions.
          </p>
        ) : (
          <ul className="divide-y divide-sand">
            {rows.map((t) => {
              const meta = TYPE_META[t.type];
              const Icon = meta.icon;
              const positive = t.points >= 0;
              return (
                <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <Icon className={cn("h-5 w-5 flex-shrink-0", meta.tone)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-deep">
                      {t.note ?? meta.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(t.created_at)}
                      {t.expires_at ? ` · expires ${formatShortDate(t.expires_at)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-semibold", positive ? "text-green" : "text-gold-warm")}>
                      {positive ? "+" : ""}
                      {t.points.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.balance_after.toLocaleString()} pts</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
