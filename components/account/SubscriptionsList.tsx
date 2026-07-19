"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Pause, Play, RotateCcw, X, Loader2 } from "lucide-react";
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
import { DropletSVG } from "@/components/shared/DropletSVG";
import { EmptyState } from "@/components/account/primitives";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { INTERVAL_LABEL } from "@/lib/orders/status";
import {
  setSubscriptionStatus,
  changeSubscriptionFrequency,
} from "@/lib/account/actions";
import { validateCartItem } from "@/lib/cart/actions";
import { useCartStore } from "@/stores/cart";
import type { AccountSubscription } from "@/types/account";

const INTERVALS: AccountSubscription["interval"][] = ["weekly", "biweekly", "monthly"];

export function SubscriptionsList({ subscriptions }: { subscriptions: AccountSubscription[] }) {
  const active = subscriptions.filter((s) => s.status !== "cancelled");
  const cancelled = subscriptions.filter((s) => s.status === "cancelled");

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        icon={<RotateCcw className="h-7 w-7 text-green" />}
        title="No subscriptions yet"
        description="Set a reorder reminder on any subscription-eligible product at checkout and it'll show up here."
        ctaHref="/shop"
        ctaLabel="Browse products"
      />
    );
  }

  return (
    <div className="space-y-3">
      {active.map((sub) => (
        <SubscriptionCard key={sub.id} sub={sub} />
      ))}
      {cancelled.length > 0 && (
        <details className="rounded-2xl border border-sand bg-white p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            Cancelled subscriptions ({cancelled.length})
          </summary>
          <div className="mt-3 space-y-3">
            {cancelled.map((sub) => (
              <SubscriptionCard key={sub.id} sub={sub} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function SubscriptionCard({ sub }: { sub: AccountSubscription }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const isCancelled = sub.status === "cancelled";
  const isPaused = sub.status === "paused";

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(true);
    try {
      const res = await fn();
      if (!res.ok) {
        toast.error(res.error ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleReorderNow = async () => {
    setBusy(true);
    try {
      const res = await validateCartItem({
        productId: sub.product_id,
        sizeId: sub.size_id,
        quantity: sub.quantity,
        note: "",
        isSubscription: false,
        subscriptionInterval: null,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      addItem(res.item);
      openDrawer();
      toast.success("Added to your cart.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("rounded-2xl border border-sand bg-white p-4", isCancelled && "opacity-70")}>
      <div className="flex gap-3">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
          {sub.image ? (
            <Image src={sub.image} alt={sub.product_name} fill sizes="64px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <DropletSVG className="h-7 w-7 text-sage" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              {sub.product_slug ? (
                <Link
                  href={`/shop/${sub.product_slug}`}
                  className="font-medium text-green-deep hover:text-green"
                >
                  {sub.product_name}
                </Link>
              ) : (
                <span className="font-medium text-green-deep">{sub.product_name}</span>
              )}
              <p className="text-sm text-muted-foreground">
                {sub.size_label ? `${sub.size_label} · ` : ""}Qty {sub.quantity}
                {sub.size_price != null ? ` · ${formatCurrency(sub.size_price)}` : ""}
              </p>
            </div>
            <Badge
              variant={
                isCancelled
                  ? "destructive"
                  : !sub.is_available
                    ? "secondary"
                    : isPaused
                      ? "secondary"
                      : "sage"
              }
            >
              {isCancelled
                ? "Cancelled"
                : !sub.is_available
                  ? "Unavailable"
                  : isPaused
                    ? "Paused"
                    : "Active"}
            </Badge>
          </div>

          {!isCancelled && (
            <p className="mt-1 text-xs text-muted-foreground">
              {INTERVAL_LABEL[sub.interval]} ·{" "}
              {isPaused || !sub.is_available
                ? "Reminders paused"
                : `Next reminder ${formatShortDate(sub.next_reminder_date)}`}
            </p>
          )}

          {!sub.is_available && !isCancelled && (
            <p className="mt-1 text-xs font-medium text-red-600">
              This product is no longer available to buy.
            </p>
          )}

          {/* Actions */}
          {!isCancelled && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* Frequency */}
              <select
                value={sub.interval}
                disabled={busy}
                onChange={(e) =>
                  run(
                    () =>
                      changeSubscriptionFrequency(
                        sub.id,
                        e.target.value as AccountSubscription["interval"]
                      ),
                    "Frequency updated."
                  )
                }
                aria-label="Reminder frequency"
                className="h-8 rounded-lg border border-input bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
              >
                {INTERVALS.map((iv) => (
                  <option key={iv} value={iv}>
                    {INTERVAL_LABEL[iv]}
                  </option>
                ))}
              </select>

              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  run(
                    () => setSubscriptionStatus(sub.id, isPaused ? "active" : "paused"),
                    isPaused ? "Subscription resumed." : "Subscription paused."
                  )
                }
                className="gap-1"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                {isPaused ? "Resume" : "Pause"}
              </Button>

              {sub.is_available && (
                <Button size="sm" variant="outline" disabled={busy} onClick={handleReorderNow} className="gap-1">
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reorder now
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setCancelOpen(true)}
                className="gap-1 text-red-600 hover:bg-red-50"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          )}
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel this reminder?</DialogTitle>
            <DialogDescription>
              You won&apos;t receive reorder reminders for {sub.product_name} anymore. You can always set a new
              one later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                run(() => setSubscriptionStatus(sub.id, "cancelled"), "Subscription cancelled.").then(() =>
                  setCancelOpen(false)
                )
              }
            >
              Cancel subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
