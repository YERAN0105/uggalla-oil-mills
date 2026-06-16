import { Check, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date";
import { timelineSteps, statusStepIndex } from "@/lib/orders/status";
import type { StatusHistoryEntry } from "@/types/account";

interface Props {
  status: string;
  fulfillmentType: "delivery" | "pickup";
  history: StatusHistoryEntry[];
}

/** Horizontal (desktop) / vertical (mobile) stepper of order milestones. */
export function StatusTimeline({ status, fulfillmentType, history }: Props) {
  const steps = timelineSteps(fulfillmentType);
  const currentIndex = statusStepIndex(status);
  const isCancelled = status === "cancelled" || status === "refunded";

  // Latest timestamp recorded for each status key. History is oldest-first, so a
  // plain overwrite leaves the most recent occurrence — correct when a status was
  // reverted and re-reached (we want the new time, not the original stale one).
  const reachedAt = new Map<string, string>();
  for (const h of history) {
    reachedAt.set(h.status, h.changed_at);
  }

  if (isCancelled) {
    const cancelEntry = history.find((h) => h.status === status);
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/60 p-5">
        <div className="flex items-start gap-3">
          <XCircle className="h-6 w-6 flex-shrink-0 text-red-500" />
          <div>
            <p className="font-display text-lg text-green-deep">
              {status === "refunded" ? "Order refunded" : "Order cancelled"}
            </p>
            {cancelEntry?.note && <p className="text-sm text-muted-foreground">{cancelEntry.note}</p>}
            {cancelEntry?.changed_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                {formatDateTime(cancelEntry.changed_at)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sand bg-white p-5">
      <ol className="flex flex-col gap-0 md:flex-row md:gap-0">
        {steps.map((step, i) => {
          const reached = i <= currentIndex;
          const isCurrent = i === currentIndex;
          const ts = reachedAt.get(step.key);
          return (
            <li key={step.key} className="flex flex-1 gap-3 md:flex-col md:items-center md:text-center">
              {/* Connector + node */}
              <div className="flex flex-col items-center md:w-full md:flex-row">
                <div className="hidden flex-1 md:block">
                  <div className={cn("h-0.5 w-full", i === 0 ? "bg-transparent" : reached ? "bg-green" : "bg-sand")} />
                </div>
                <div
                  className={cn(
                    "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                    reached
                      ? "border-green bg-green text-white"
                      : "border-sand bg-white text-muted-foreground",
                    isCurrent && "ring-4 ring-green/15"
                  )}
                >
                  {reached ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="hidden flex-1 md:block">
                  <div
                    className={cn(
                      "h-0.5 w-full",
                      i === steps.length - 1 ? "bg-transparent" : i < currentIndex ? "bg-green" : "bg-sand"
                    )}
                  />
                </div>
                {/* Mobile vertical connector */}
                {i < steps.length - 1 && (
                  <div className={cn("my-1 h-6 w-0.5 md:hidden", reached ? "bg-green" : "bg-sand")} />
                )}
              </div>

              <div className="pb-4 md:mt-2 md:pb-0">
                <p className={cn("text-sm font-medium", reached ? "text-green-deep" : "text-muted-foreground")}>
                  {step.label}
                </p>
                {/* Only show the timestamp for steps currently reached, so a
                    reverted (unchecked) step never shows a stale time. */}
                {reached && ts && <p className="text-xs text-muted-foreground">{formatDateTime(ts)}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
