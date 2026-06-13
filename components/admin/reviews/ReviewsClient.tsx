"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Check, EyeOff, Trash2, MessageSquare, Loader2, Star } from "lucide-react";
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
import { AdminPageHeader, AdminEmpty, Panel, ConfirmDialog } from "@/components/admin/primitives";
import { formatShortDate } from "@/lib/date";
import { setReviewStatus, deleteReview, replyToReview } from "@/lib/admin/reviews";
import type { AdminReviewRow } from "@/types/admin";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "hidden", label: "Hidden" },
];

export function ReviewsClient({
  reviews,
  counts,
  status,
}: {
  reviews: AdminReviewRow[];
  counts: Record<string, number>;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const go = (s: string) => router.push(`${pathname}?status=${s}`);

  const act = async (id: string, fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) => {
    setPendingId(id);
    const res = await fn();
    setPendingId(null);
    if (!res.ok) return toast.error(res.error ?? "Failed.");
    toast.success(msg);
    router.refresh();
  };

  const submitReply = async () => {
    if (!replyId) return;
    setPendingId(replyId);
    const res = await replyToReview(replyId, reply);
    setPendingId(null);
    if (!res.ok) return toast.error(res.error);
    setReplyId(null);
    setReply("");
    toast.success("Reply saved.");
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader title="Reviews" description="Moderate customer reviews." />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => go(t.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              status === t.key ? "border-green bg-green text-white" : "border-sand text-muted-foreground"
            }`}
          >
            {t.label} ({counts[t.key] ?? 0})
          </button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <AdminEmpty icon={<Star className="h-7 w-7" />} title="No reviews here" />
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Panel key={r.id}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gold">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                    <span className="font-medium text-green-deep">{r.product_name}</span>
                    <Badge
                      variant={r.status === "approved" ? "sage" : r.status === "hidden" ? "secondary" : "gold"}
                      className="text-[10px] capitalize"
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.customer_name ?? "Customer"} · {formatShortDate(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {pendingId === r.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {r.status !== "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-green"
                      onClick={() => act(r.id, () => setReviewStatus(r.id, "approved"), "Approved.")}
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </Button>
                  )}
                  {r.status !== "hidden" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() => act(r.id, () => setReviewStatus(r.id, "hidden"), "Hidden.")}
                    >
                      <EyeOff className="h-3.5 w-3.5" /> Hide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    onClick={() => {
                      setReplyId(r.id);
                      setReply(r.admin_reply ?? "");
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 text-red-600"
                    onClick={() => setDelId(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {r.title && <p className="mt-2 font-medium text-green-deep">{r.title}</p>}
              {r.body && <p className="mt-1 text-sm text-green-deep">{r.body}</p>}

              {r.images.length > 0 && (
                <div className="mt-2 flex gap-2">
                  {r.images.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                      <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-sand">
                        <Image src={url} alt="" fill className="object-cover" sizes="64px" />
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {r.admin_reply && (
                <div className="mt-3 rounded-lg bg-sage/30 px-3 py-2 text-sm">
                  <span className="font-medium text-green-deep">Shop reply: </span>
                  <span className="text-green-deep">{r.admin_reply}</span>
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}

      <Dialog open={!!replyId} onOpenChange={(o) => !o && setReplyId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to review</DialogTitle>
          </DialogHeader>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={4}
            placeholder="Your public reply (shown on the product page)…"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReplyId(null)}>
              Cancel
            </Button>
            <Button onClick={submitReply} disabled={!!pendingId}>
              Save reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delId}
        onOpenChange={(o) => !o && setDelId(null)}
        title="Delete this review?"
        description="This permanently removes the review and its images."
        confirmLabel="Delete review"
        onConfirm={async () => {
          if (!delId) return;
          const res = await deleteReview(delId);
          setDelId(null);
          if (!res.ok) return toast.error(res.error);
          toast.success("Review deleted.");
          router.refresh();
        }}
      />
    </>
  );
}
