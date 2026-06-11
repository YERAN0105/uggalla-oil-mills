"use client";

import { useState } from "react";
import { Search, Loader2, PackageSearch, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderDetailView } from "@/components/storefront/OrderDetailView";
import { BankReceiptUpload } from "@/components/storefront/BankReceiptUpload";
import { CopyableField } from "@/components/storefront/CopyableField";
import { trackOrderAction } from "@/app/(storefront)/orders/track/actions";
import type { OrderWithItems, BankDetails } from "@/types/checkout";

export function GuestTrackForm({
  initialOrder = "",
  bankDetails,
}: {
  initialOrder?: string;
  bankDetails: BankDetails;
}) {
  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await trackOrderAction(orderNumber, contact);
      if (!result.ok) {
        setError(result.error);
        setOrder(null);
        setToken(null);
      } else {
        setOrder(result.order);
        setToken(result.token);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Bank-transfer orders awaiting payment, with no receipt yet, can upload here.
  const canUploadReceipt =
    order != null &&
    token != null &&
    order.payment_method === "bank_transfer" &&
    order.payment_status !== "paid" &&
    !order.bank_receipt;

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

          {canUploadReceipt && (
            <div className="mt-6 rounded-2xl border border-gold-warm/40 bg-gold/5 p-5">
              <h3 className="flex items-center gap-2 font-display text-lg text-green-deep mb-3">
                <Building2 className="h-5 w-5 text-gold-warm" />
                Complete your bank transfer
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We haven&apos;t received your receipt yet. Transfer the total to the account below, then
                upload your receipt so we can verify and confirm your order.
              </p>
              <div className="rounded-xl border border-sand bg-white px-4 divide-y divide-sand mb-2">
                <CopyableField label="Bank" value={bankDetails.bank_name} />
                <CopyableField label="Account name" value={bankDetails.account_name} copyable />
                <CopyableField label="Account number" value={bankDetails.account_number} copyable />
                <CopyableField label="Branch" value={bankDetails.branch} />
                <CopyableField label="Reference" value={order.order_number} copyable />
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Please add the <strong>reference</strong> ({order.order_number}) to your transfer so we can
                match your payment.
              </p>
              <BankReceiptUpload
                orderNumber={order.order_number}
                token={token!}
                onUploaded={() =>
                  setOrder((o) =>
                    o ? { ...o, bank_receipt: { id: "pending", status: "pending" } } : o
                  )
                }
              />
            </div>
          )}
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
