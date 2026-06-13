"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { approveBankTransfer, rejectBankTransfer } from "@/lib/admin/orders";

export function BankReceiptReview({
  receipt,
}: {
  receipt: {
    id: string;
    image_url: string;
    status: string;
    reject_reason: string | null;
  };
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const approve = async () => {
    setPending(true);
    const res = await approveBankTransfer(receipt.id);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    toast.success("Payment approved.");
    router.refresh();
  };

  const reject = async () => {
    if (!reason.trim()) return toast.error("A reason is required.");
    setPending(true);
    const res = await rejectBankTransfer(receipt.id, reason);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    setRejectOpen(false);
    toast.success("Receipt rejected.");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-green-deep">Bank transfer receipt</span>
        <Badge
          variant={
            receipt.status === "approved" ? "sage" : receipt.status === "rejected" ? "destructive" : "secondary"
          }
          className="text-[10px]"
        >
          {receipt.status}
        </Badge>
      </div>

      <a href={receipt.image_url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-sand bg-sand">
          <Image src={receipt.image_url} alt="Receipt" fill className="object-contain" sizes="320px" />
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs">
            <ExternalLink className="h-3 w-3" /> Enlarge
          </span>
        </div>
      </a>

      {receipt.reject_reason && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          Rejected: {receipt.reject_reason}
        </p>
      )}

      {receipt.status === "pending" && (
        <div className="flex gap-2">
          <Button onClick={approve} disabled={pending} className="flex-1 gap-2">
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve
          </Button>
          <Button
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={pending}
            className="flex-1"
          >
            Reject
          </Button>
        </div>
      )}

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject receipt</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Reason (shown to the customer so they can re-upload)…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={reject} disabled={pending} className="gap-2">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
