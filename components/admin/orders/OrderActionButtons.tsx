"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Printer, FileText, MessageCircle, Ban, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cancelOrderAdmin, refundOrder } from "@/lib/admin/orders";

export function OrderActionButtons({
  orderId,
  orderNumber,
  status,
  paymentStatus,
  whatsappEnabled,
}: {
  orderId: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  whatsappEnabled: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"cancel" | "refund" | null>(null);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const isClosed = status === "cancelled" || status === "refunded";
  const canRefund = paymentStatus === "paid";

  const submit = async () => {
    if (!reason.trim()) return toast.error("Please provide a reason.");
    setPending(true);
    const res =
      mode === "cancel"
        ? await cancelOrderAdmin(orderId, reason)
        : await refundOrder(orderId, reason);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    setMode(null);
    setReason("");
    toast.success(mode === "cancel" ? "Order cancelled." : "Order refunded.");
    router.refresh();
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={`/admin/orders/${orderNumber}/print/invoice`} target="_blank" rel="noopener noreferrer">
            <Printer className="h-4 w-4" /> Invoice
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <a href={`/admin/orders/${orderNumber}/print/packing-slip`} target="_blank" rel="noopener noreferrer">
            <FileText className="h-4 w-4" /> Packing slip
          </a>
        </Button>
      </div>

      <div className="space-y-1">
        <Button
          variant="outline"
          size="sm"
          disabled={!whatsappEnabled}
          className="w-full gap-2"
          title={whatsappEnabled ? undefined : "WhatsApp not configured"}
        >
          <MessageCircle className="h-4 w-4" /> Send status update via WhatsApp
        </Button>
        {!whatsappEnabled && (
          <p className="text-center text-[11px] text-muted-foreground">WhatsApp not configured</p>
        )}
      </div>

      {!isClosed && (
        <div className="grid grid-cols-2 gap-2">
          {canRefund && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMode("refund")}
              className="gap-2 text-amber-700"
            >
              <RotateCcw className="h-4 w-4" /> Refund
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMode("cancel")}
            className={`gap-2 text-red-600 ${canRefund ? "" : "col-span-2"}`}
          >
            <Ban className="h-4 w-4" /> Cancel order
          </Button>
        </div>
      )}

      <Dialog open={!!mode} onOpenChange={(o) => !o && setMode(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === "cancel" ? "Cancel order" : "Refund order"}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setMode(null)} disabled={pending}>
              Back
            </Button>
            <Button variant="destructive" onClick={submit} disabled={pending} className="gap-2">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "cancel" ? "Cancel order" : "Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
