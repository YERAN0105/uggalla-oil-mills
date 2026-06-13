"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/admin/primitives";
import { addInternalNote } from "@/lib/admin/orders";

export function OrderInternalNotes({
  orderId,
  notes,
}: {
  orderId: string;
  notes: string | null;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);

  const lines = (notes ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const add = async () => {
    if (!text.trim()) return;
    setPending(true);
    const res = await addInternalNote(orderId, text);
    setPending(false);
    if (!res.ok) return toast.error(res.error);
    setText("");
    toast.success("Note added.");
    router.refresh();
  };

  return (
    <Panel>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-green-deep">
        <StickyNote className="h-4 w-4" /> Internal notes
      </h2>
      {lines.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {lines.map((l, i) => (
            <li key={i} className="rounded-lg bg-sand/40 px-3 py-2 text-sm text-green-deep">
              {l}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-muted-foreground">No internal notes yet.</p>
      )}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="Add a private note (not visible to the customer)…"
      />
      <div className="mt-2 flex justify-end">
        <Button onClick={add} disabled={pending || !text.trim()} className="gap-2">
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Add note
        </Button>
      </div>
    </Panel>
  );
}
