"use client";

import { useState } from "react";
import { Search, Loader2, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderDetailView } from "@/components/storefront/OrderDetailView";
import { trackOrderAction } from "@/app/(storefront)/orders/track/actions";
import type { OrderWithItems } from "@/types/checkout";

export function GuestTrackForm({ initialOrder = "" }: { initialOrder?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithItems | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await trackOrderAction(orderNumber, contact);
      if (!result.ok) {
        setError(result.error);
        setOrder(null);
      } else {
        setOrder(result.order);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
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

      {order ? (
        <div>
          <h2 className="font-display text-2xl text-green-deep mb-4">Order {order.order_number}</h2>
          <OrderDetailView order={order} />
        </div>
      ) : (
        !error && (
          <div className="text-center text-muted-foreground py-8">
            <PackageSearch className="h-10 w-10 mx-auto mb-3 text-sage" />
            <p className="text-sm">Enter your order details above to see its status.</p>
          </div>
        )
      )}
    </div>
  );
}
