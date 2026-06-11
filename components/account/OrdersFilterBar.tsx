"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_confirmation", label: "Awaiting confirmation" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "In preparation" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

interface Props {
  status: string;
  search: string;
  from: string;
  to: string;
}

export function OrdersFilterBar({ status, search, from, to }: Props) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState(search);

  const apply = (overrides: Partial<Props>) => {
    const next = { status, search: searchValue, from, to, ...overrides };
    const params = new URLSearchParams();
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.search.trim()) params.set("search", next.search.trim());
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    const qs = params.toString();
    router.push(qs ? `/account/orders?${qs}` : "/account/orders");
  };

  const hasFilters = (status && status !== "all") || search || from || to;

  return (
    <div className="mb-5 space-y-3 rounded-2xl border border-sand bg-white p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          apply({});
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by order number…"
            className="pl-9"
            aria-label="Search orders by number"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-end gap-3">
        {/* Status chips */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => apply({ status: opt.value })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                (status || "all") === opt.value
                  ? "border-green bg-green text-white"
                  : "border-sand bg-white text-green-deep/70 hover:border-green/40"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-2">
          <label className="text-xs text-muted-foreground">
            From
            <Input
              type="date"
              defaultValue={from}
              onChange={(e) => apply({ from: e.target.value })}
              className="mt-1 h-9"
              aria-label="From date"
            />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <Input
              type="date"
              defaultValue={to}
              onChange={(e) => apply({ to: e.target.value })}
              className="mt-1 h-9"
              aria-label="To date"
            />
          </label>
          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchValue("");
                router.push("/account/orders");
              }}
              className="gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
