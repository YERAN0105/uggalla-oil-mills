"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackOrderAction } from "@/app/(storefront)/orders/track/actions";

/**
 * Guest order lookup. On a successful match it redirects to the single canonical
 * order page (`/orders/[orderNumber]?t=token`) — the same page the email "View
 * Order" link opens — so there's one consistent order view (progress bar, details,
 * receipt upload) instead of a second inline copy here.
 */
export function GuestTrackForm({ initialOrder = "" }: { initialOrder?: string }) {
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await trackOrderAction(orderNumber, contact);
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // Hand off to the canonical order page; the token grants read access there.
      router.push(`/orders/${encodeURIComponent(result.order.order_number)}?t=${result.token}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-sand bg-white p-6 space-y-4">
      <div className="space-y-1">
        <Label htmlFor="t-order">Order Number</Label>
        <Input
          id="t-order"
          placeholder="UOM-20260611-AB12CD"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="t-contact">Email or Phone</Label>
        <Input
          id="t-contact"
          placeholder="you@example.com or +94771234567"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        Track Order
      </Button>
    </form>
  );
}
