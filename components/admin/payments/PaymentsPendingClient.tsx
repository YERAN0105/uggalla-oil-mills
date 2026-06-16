"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2, ExternalLink, Wallet } from "lucide-react";
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
import { AdminPageHeader, AdminEmpty, Panel, ConfirmDialog } from "@/components/admin/primitives";
import { approveBankTransfer, rejectBankTransfer } from "@/lib/admin/orders";
import { formatCurrency } from "@/lib/brand";
import { formatDateTime } from "@/lib/date";

interface Row {
  receipt_id: string;
  order_id: string;
  order_number: string;
  customer: string;
  amount: number;
  uploaded_at: string;
  image_url: string;
}

export function PaymentsPendingClient({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const approve = async () => {
    if (!approveId) return;
    setPendingId(approveId);
    const res = await approveBankTransfer(approveId);
    setPendingId(null);
    setApproveId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Payment approved.");
    router.refresh();
  };

  const reject = async () => {
    if (!rejectId) return;
    if (!reason.trim()) return toast.error("A reason is required.");
    setPendingId(rejectId);
    const res = await rejectBankTransfer(rejectId, reason);
    setPendingId(null);
    if (!res.ok) return toast.error(res.error);
    setRejectId(null);
    setReason("");
    toast.success("Receipt rejected.");
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader
        title="Payments Pending"
        description="Bank transfers awaiting review."
      />

      {rows.length === 0 ? (
        <AdminEmpty
          icon={<Wallet className="h-7 w-7" />}
          title="Nothing to review"
          description="Bank transfer receipts will appear here when customers upload them."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Panel key={r.receipt_id} className="flex flex-col gap-3">
              <a href={r.image_url} target="_blank" rel="noopener noreferrer">
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-sand bg-sand">
                  <Image src={r.image_url} alt="Receipt" fill className="object-contain" sizes="320px" />
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs">
                    <ExternalLink className="h-3 w-3" /> View
                  </span>
                </div>
              </a>
              <div>
                <Link
                  href={`/admin/orders/${r.order_number}`}
                  className="font-semibold text-green-deep hover:underline"
                >
                  {r.order_number}
                </Link>
                <p className="text-sm text-muted-foreground">{r.customer}</p>
                <p className="text-sm font-medium text-green-deep">{formatCurrency(r.amount)}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(r.uploaded_at)}</p>
              </div>
              <div className="mt-auto flex gap-2">
                <Button
                  onClick={() => setApproveId(r.receipt_id)}
                  disabled={pendingId === r.receipt_id}
                  className="flex-1 gap-2"
                  size="sm"
                >
                  {pendingId === r.receipt_id && <Loader2 className="h-4 w-4 animate-spin" />}
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectId(r.receipt_id)}
                  className="flex-1"
                >
                  Reject
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Dialog open={!!rejectId} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject receipt</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason (shown to the customer)…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={!!pendingId} className="gap-2">
              {pendingId && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!approveId}
        onOpenChange={(o) => !o && setApproveId(null)}
        title="Approve this bank transfer?"
        description="This marks the order as paid and confirms it. You can reopen it for review from the order page if needed."
        confirmLabel="Approve payment"
        destructive={false}
        loading={!!pendingId}
        onConfirm={approve}
      />
    </>
  );
}
