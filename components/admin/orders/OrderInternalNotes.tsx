"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Panel } from "@/components/admin/primitives";
import { addInternalNote } from "@/lib/admin/orders";
import { formatDateTime } from "@/lib/date";

/**
 * Notes are stored one per line as "[ISO time] author: text". Parse that into a
 * friendly header (date · author) + body so each note reads clearly. Lines that
 * don't match the format are shown as-is.
 */
function parseNote(line: string): { meta: string | null; body: string; author: string | null } {
  const m = line.match(/^\[([^\]]+)\]\s*([^:]+):\s*([\s\S]*)$/);
  if (!m) return { meta: null, body: line, author: null };
  const [, iso, author, body] = m;
  const date = Number.isNaN(Date.parse(iso)) ? iso : formatDateTime(iso);
  return { meta: `${date} · ${author.trim()}`, body: body.trim(), author: author.trim() };
}

/** Split an inherited body "Label — content" into its label + content. */
function splitLabel(body: string): { label: string | null; content: string } {
  const idx = body.indexOf(" — ");
  if (idx === -1) return { label: null, content: body };
  return { label: body.slice(0, idx), content: body.slice(idx + 3).trim() };
}

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

  const parsed = (notes ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map(parseNote);
  const inherited = parsed.filter((n) => n.author === "Bulk request");
  const ownNotes = parsed.filter((n) => n.author !== "Bulk request");
  const hasAny = parsed.length > 0;

  // Group inherited entries by their label ("Quote message to customer",
  // "Internal note") so each label is ONE card, with its notes listed on separate
  // lines inside (multiple internal notes never share a line).
  const inheritedGroups = new Map<string, string[]>();
  for (const n of inherited) {
    const { label, content } = splitLabel(n.body);
    const key = label ?? "Note";
    const arr = inheritedGroups.get(key) ?? [];
    arr.push(content);
    inheritedGroups.set(key, arr);
  }

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
      {/* Inherited from the bulk request — one card per label; multiple notes under
          a label are listed on separate lines inside that one card. No per-line
          date/author here (it's all a snapshot taken at conversion). */}
      {inheritedGroups.size > 0 && (
        <div className="mb-4 rounded-xl border border-gold/50 bg-cream p-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-green">
            From the bulk request
          </p>
          <div className="space-y-2">
            {[...inheritedGroups.entries()].map(([label, items], i) => (
              <div key={i} className="rounded-lg border border-sand bg-white px-3 py-2">
                <p className="text-xs font-semibold text-green-deep">{label}</p>
                <div className="mt-1 space-y-1">
                  {items.map((content, j) => (
                    <p key={j} className="whitespace-pre-wrap text-sm text-green-deep">
                      {content}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes added on the order. */}
      {ownNotes.length > 0 && (
        <ul className="mb-4 space-y-2">
          {ownNotes.map((n, i) => (
            <li key={i} className="rounded-lg bg-sand/40 px-3 py-2 text-sm text-green-deep">
              {n.meta && (
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {n.meta}
                </p>
              )}
              <p className="whitespace-pre-wrap">{n.body}</p>
            </li>
          ))}
        </ul>
      )}

      {!hasAny && <p className="mb-4 text-sm text-muted-foreground">No internal notes yet.</p>}
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
