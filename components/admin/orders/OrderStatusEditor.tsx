"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/admin/primitives";
import { updateOrderStatus } from "@/lib/admin/orders";
import {
  ORDER_STATUS_LABEL,
  timelineSteps,
  statusStepIndex,
} from "@/lib/orders/status";
import { formatDateTime } from "@/lib/date";
import type { OrderStatusHistoryRow } from "@/lib/admin/orders-data";

const ALL_STATUSES = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "refunded",
];

export function OrderStatusEditor({
  orderId,
  status,
  fulfillmentType,
  history,
  placedAt,
}: {
  orderId: string;
  status: string;
  fulfillmentType: "delivery" | "pickup";
  history: OrderStatusHistoryRow[];
  /**
   * The order's original creation time. "Placed" is pinned to this and never
   * changes — an order is only ever placed once, even though the DB reuses the
   * `pending_confirmation` status when an order is reverted back to pending.
   */
  placedAt: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  const steps = timelineSteps(fulfillmentType);
  const reached = statusStepIndex(status);

  const apply = async () => {
    if (!next) return;
    setPending(true);
    const res = await updateOrderStatus(orderId, next, note || undefined);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    if (res.data && res.data.earnedPoints > 0) {
      toast.success(`Customer earned ${res.data.earnedPoints} loyalty points`);
    } else {
      toast.success("Status updated.");
    }
    setNext("");
    setNote("");
    router.refresh();
  };

  return (
    <Panel>
      <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Status timeline</h2>

      <ol className="relative ml-3 space-y-4 border-l border-sand pl-6">
        {steps.map((step, i) => {
          const done = i <= reached && status !== "cancelled" && status !== "refunded";
          // Latest entry for this status (history is oldest-first), so a reverted
          // and re-reached step shows its new time/admin, not the original stale one.
          const hist = [...history].reverse().find((h) => h.status === step.key);
          // "Placed" is the exception: always show the original creation time,
          // never a later revert-to-pending entry (same status, different meaning).
          const displayTime = step.key === "pending_confirmation" ? placedAt : hist?.changed_at;
          return (
            <li key={step.key} className="relative">
              <span
                className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full ${
                  done ? "bg-green text-white" : "bg-sand text-muted-foreground"
                }`}
              >
                {done && <Check className="h-3 w-3" />}
              </span>
              <p className={`text-sm font-medium ${done ? "text-green-deep" : "text-muted-foreground"}`}>
                {step.label}
              </p>
              {/* Only show the time/admin for steps currently reached, so a
                  reverted (unchecked) step never shows a stale time. Placed shows
                  the original creation time with no admin attribution. */}
              {done && displayTime && (
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(displayTime)}
                  {step.key !== "pending_confirmation" && hist?.changed_by_name
                    ? ` · ${hist.changed_by_name}`
                    : ""}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {(status === "cancelled" || status === "refunded") && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          This order is {ORDER_STATUS_LABEL[status].toLowerCase()}.
        </p>
      )}

      <div className="mt-5 space-y-2 border-t border-sand pt-4">
        <p className="text-sm font-medium text-green-deep">Change status</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="h-10 rounded-lg border border-sand bg-white px-3 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green sm:w-56"
          >
            <option value="">Select status…</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s} disabled={s === status}>
                {ORDER_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className="flex-1"
          />
          <Button onClick={apply} disabled={!next || pending} className="gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Update
          </Button>
        </div>
      </div>
    </Panel>
  );
}
