"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, XCircle, MessageCircle, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart";
import { reorderItems } from "@/lib/account/reorder";
import { cancelOrder } from "@/lib/account/actions";
import { isCancellable } from "@/lib/orders/status";

const REASONS = [
  "Changed my mind",
  "Ordered by mistake",
  "Found a better option",
  "Delivery date no longer works",
  "Other",
];

interface Props {
  orderNumber: string;
  status: string;
  whatsapp: string;
}

export function OrderActions({ orderNumber, status, whatsapp }: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const openDrawer = useCartStore((s) => s.openDrawer);

  const [reordering, setReordering] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [cancelling, setCancelling] = useState(false);

  const handleReorder = async () => {
    setReordering(true);
    try {
      const res = await reorderItems(orderNumber);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      res.items.forEach((item) => addItem(item));
      if (res.items.length > 0) {
        openDrawer();
        toast.success(`Added ${res.items.length} item${res.items.length === 1 ? "" : "s"} to your cart.`);
      }
      if (res.unavailable.length > 0) {
        toast.warning(
          `Some items couldn't be added: ${res.unavailable.join(", ")}`,
          { duration: 5000 }
        );
      }
      if (res.items.length === 0 && res.unavailable.length === 0) {
        toast.info("There's nothing to reorder from this order.");
      }
    } finally {
      setReordering(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelOrder(orderNumber, reason);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Your order has been cancelled.");
      setCancelOpen(false);
      router.refresh();
    } finally {
      setCancelling(false);
    }
  };

  const waDigits = whatsapp.replace(/[^\d]/g, "");
  const waLink = `https://wa.me/${waDigits}?text=${encodeURIComponent(
    `Hi, I'd like help with my order ${orderNumber}.`
  )}`;

  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={handleReorder} disabled={reordering} variant="default" className="gap-2">
        {reordering ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        Reorder
      </Button>

      <Button asChild variant="outline" className="gap-2">
        <a href={`/account/orders/${orderNumber}/invoice`} target="_blank" rel="noopener noreferrer">
          <FileText className="h-4 w-4" />
          Invoice
        </a>
      </Button>

      <Button asChild variant="outline" className="gap-2">
        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" />
          Contact support
        </a>
      </Button>

      {isCancellable(status) && (
        <Button onClick={() => setCancelOpen(true)} variant="ghost" className="gap-2 text-red-600 hover:bg-red-50">
          <XCircle className="h-4 w-4" />
          Cancel order
        </Button>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>
              This will release any held stock and reverse coupons or loyalty points used. This can&apos;t be
              undone.
            </DialogDescription>
          </DialogHeader>

          <div>
            <label htmlFor="cancel-reason" className="text-sm font-medium text-green-deep">
              Reason
            </label>
            <select
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 h-10 w-full rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
            >
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={cancelling}>
              Keep order
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling} className="gap-2">
              {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
