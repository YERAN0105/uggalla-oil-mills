"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  Loader2,
  Copy,
  Check,
  StickyNote,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Panel, Field, ConfirmDialog } from "@/components/admin/primitives";
import { bulkStatusVariant } from "@/components/admin/bulk/BulkRequestsClient";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { bulkItemLabel } from "@/lib/bulk/items";
import {
  updateBulkStatus,
  saveBulkInternalNote,
  sendQuote,
  convertBulkToOrder,
} from "@/lib/admin/bulk-requests";
import type { BulkRequestDetail as Detail } from "@/lib/admin/bulk-data";

const STATUS = ["new", "in_progress", "quoted", "accepted", "rejected", "completed"];

export function BulkRequestDetail({
  request,
  payHereEnabled,
}: {
  request: Detail;
  payHereEnabled: boolean;
}) {
  const router = useRouter();
  const r = request;
  // A single "unit price" only makes sense for a one-product request. With
  // multiple products there's no single per-unit number, so we hide the field
  // and quote a single grand total (the breakdown can go in the message).
  const singleItem = r.items.length <= 1;

  const [unitPrice, setUnitPrice] = useState(r.quoted_unit_price != null ? String(r.quoted_unit_price) : "");
  const [total, setTotal] = useState(r.quoted_total != null ? String(r.quoted_total) : "");
  const [message, setMessage] = useState(r.quote_message ?? "");
  const [paymentMode, setPaymentMode] = useState<"offline" | "online">(
    r.payment_mode === "online" && payHereEnabled ? "online" : "offline"
  );
  const [sending, setSending] = useState(false);
  const [quoteConfirmOpen, setQuoteConfirmOpen] = useState(false);
  const [note, setNote] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [quoteLink, setQuoteLink] = useState<string | null>(
    r.quote_token ? `${typeof window !== "undefined" ? window.location.origin : ""}/quote/${r.quote_token}` : null
  );
  const [copied, setCopied] = useState(false);
  const [productsCopied, setProductsCopied] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [converting, setConverting] = useState(false);
  // Offline payment method for the converted order — mirrors a normal order.
  const [convertMethod, setConvertMethod] = useState<"cod" | "bank_transfer">("cod");
  const cashLabel = r.fulfillment_type === "pickup" ? "Pay at Store" : "Cash on Delivery";

  const setStatus = async (status: string) => {
    const res = await updateBulkStatus(r.id, status);
    if (!res.ok) return toast.error(res.error);
    toast.success("Status updated.");
    router.refresh();
  };

  // Open the confirmation popup (after a quick total check) so the admin can
  // review exactly what will be sent before it goes to the customer.
  const openQuoteConfirm = () => {
    if (!(Number(total) > 0)) return toast.error("Enter a quote total.");
    setQuoteConfirmOpen(true);
  };

  const submitQuote = async () => {
    const totalNum = Number(total);
    if (!(totalNum > 0)) return toast.error("Enter a quote total.");
    setSending(true);
    const res = await sendQuote(r.id, {
      unitPrice: singleItem && unitPrice ? Number(unitPrice) : null,
      total: totalNum,
      message,
      paymentMode,
    });
    setSending(false);
    setQuoteConfirmOpen(false);
    if (!res.ok) return toast.error(res.error);
    setQuoteLink(res.data?.quoteLink ?? null);
    toast.success("Quote sent to the customer.");
    router.refresh();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setNoteSaving(true);
    const res = await saveBulkInternalNote(r.id, note);
    setNoteSaving(false);
    if (!res.ok) return toast.error(res.error);
    setNote("");
    toast.success("Note added.");
    router.refresh();
  };

  const convert = async () => {
    setConverting(true);
    const res = await convertBulkToOrder(r.id, convertMethod);
    setConverting(false);
    setConvertOpen(false);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Order ${res.data!.orderNumber} created.`);
    router.push(`/admin/orders/${res.data!.orderNumber}`);
  };

  const copyLink = () => {
    if (!quoteLink) return;
    navigator.clipboard.writeText(quoteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Copy all products as "Name — quantity unit", one per line, so the admin can
  // paste them into the quote message and add a price next to each.
  const copyProducts = () => {
    if (r.items.length === 0) return;
    navigator.clipboard.writeText(r.items.map(bulkItemLabel).join("\n"));
    setProductsCopied(true);
    toast.success("Products copied — paste into the message.");
    setTimeout(() => setProductsCopied(false), 1500);
  };

  const internalLines = (r.internal_notes ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const waPhone = r.phone.replace(/[^0-9]/g, "");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/bulk-requests" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-green-deep">Bulk request</h1>
        <Badge variant={bulkStatusVariant(r.status)} className="capitalize">
          {r.status.replace("_", " ")}
        </Badge>
        {r.converted_order_number && (
          <Link
            href={`/admin/orders/${r.converted_order_number}`}
            className="text-sm text-green hover:underline"
          >
            → {r.converted_order_number}
          </Link>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Request details */}
          <Panel>
            <h2 className="mb-3 font-display text-lg font-semibold text-green-deep">Request</h2>
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Products ({r.items.length})
                </dt>
                {r.items.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={copyProducts}
                    className="h-7 gap-1 text-xs"
                  >
                    {productsCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {productsCopied ? "Copied" : "Copy products"}
                  </Button>
                )}
              </div>
              <ul className="space-y-1">
                {r.items.map((it, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-2 rounded-lg border border-sand bg-sand/40 px-3 py-2 text-sm"
                  >
                    <span className="text-green-deep">{it.name ?? "Loose / unspecified"}</span>
                    <span className="font-medium text-green-deep">
                      {it.quantity} {it.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <Detail2 label="Fulfillment" value={r.fulfillment_type} />
              <Detail2
                label="Preferred date"
                value={r.preferred_date ? formatShortDate(r.preferred_date) : "—"}
              />
            </dl>
            {r.fulfillment_type === "delivery" && r.address_snapshot && (
              <div className="mt-4 border-t border-sand pt-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Delivery address</dt>
                <dd className="mt-1 text-sm text-green-deep">
                  {[
                    r.address_snapshot.recipient,
                    r.address_snapshot.phone,
                    r.address_snapshot.line1,
                    r.address_snapshot.line2,
                    r.address_snapshot.city,
                    r.address_snapshot.postal_code,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            )}
            {r.notes && (
              <div className="mt-4 border-t border-sand pt-3">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Customer note</dt>
                <dd className="mt-1 whitespace-pre-wrap rounded-lg border border-sand bg-sand/40 px-3 py-2 text-sm text-green-deep">
                  {r.notes}
                </dd>
              </div>
            )}
            {r.attachments.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {r.attachments.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                    <div className="relative aspect-square overflow-hidden rounded-lg border border-sand bg-sand">
                      <Image src={url} alt="" fill className="object-cover" sizes="120px" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Panel>

          {/* Quote section */}
          <Panel>
            <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Quote</h2>
            {r.converted_order_id ? (
              <p className="rounded-lg bg-sand/40 px-3 py-2 text-sm text-muted-foreground">
                This request has been converted to an order, so the quote is locked. To change
                pricing, manage the order instead.
              </p>
            ) : (
              <>
            <div className={`grid gap-4 ${singleItem ? "sm:grid-cols-2" : ""}`}>
              {singleItem && (
                <Field label="Unit price (optional)">
                  <Input
                    type="number"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="per unit"
                  />
                </Field>
              )}
              <Field label="Total" required>
                <Input
                  type="number"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                />
              </Field>
            </div>
            {!singleItem && (
              <p className="mt-2 text-xs text-muted-foreground">
                This request has multiple products, so there&apos;s no single unit price. Enter the
                overall total — you can break down the per-product pricing in the message below.
              </p>
            )}
            <div className="mt-4">
              <Field label="Customer message">
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Quote details and next steps for the customer…"
                />
              </Field>
            </div>

            {/* Payment mode */}
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-green-deep">Payment mode</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode("offline")}
                  className={`rounded-xl border-2 p-3 text-left text-sm transition-colors ${
                    paymentMode === "offline" ? "border-green bg-sage/30" : "border-sand"
                  }`}
                >
                  <span className="font-semibold text-green-deep">Offline (default)</span>
                  <p className="text-xs text-muted-foreground">
                    Shop arranges payment &amp; delivery directly.
                  </p>
                </button>
                <button
                  type="button"
                  disabled={!payHereEnabled}
                  onClick={() => setPaymentMode("online")}
                  className={`rounded-xl border-2 p-3 text-left text-sm transition-colors disabled:opacity-50 ${
                    paymentMode === "online" ? "border-green bg-sage/30" : "border-sand"
                  }`}
                  title={payHereEnabled ? undefined : "PayHere not configured"}
                >
                  <span className="font-semibold text-green-deep">Pay online</span>
                  <p className="text-xs text-muted-foreground">
                    {payHereEnabled ? "Generates a secure pay link." : "PayHere not configured"}
                  </p>
                </button>
              </div>
            </div>

            {quoteLink && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-sand bg-sand/30 p-2">
                <code className="flex-1 truncate text-xs text-green-deep">{quoteLink}</code>
                <Button size="sm" variant="ghost" onClick={copyLink} className="gap-1">
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <Button onClick={openQuoteConfirm} disabled={sending} className="gap-2">
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                Send quote
              </Button>
            </div>
              </>
            )}
          </Panel>

          {/* Internal notes */}
          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-green-deep">
              <StickyNote className="h-4 w-4" /> Internal notes
            </h2>
            {internalLines.length > 0 ? (
              <ul className="mb-3 space-y-2">
                {internalLines.map((l, i) => (
                  <li key={i} className="rounded-lg bg-sand/40 px-3 py-2 text-sm text-green-deep">
                    {l}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-3 text-sm text-muted-foreground">No notes yet.</p>
            )}
            {r.converted_order_id ? (
              // Once converted, the order is the live place for notes. Lock this and
              // point the admin to the order (its note was copied over at conversion).
              <p className="rounded-lg border border-sand bg-sand/30 px-3 py-2 text-xs text-muted-foreground">
                This request is now an order. To add or update notes,{" "}
                {r.converted_order_number ? (
                  <Link
                    href={`/admin/orders/${r.converted_order_number}`}
                    className="font-medium text-green hover:underline"
                  >
                    edit them on the order
                  </Link>
                ) : (
                  "edit them on the order"
                )}
                .
              </p>
            ) : (
              <>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Add a note…" />
                <div className="mt-2 flex justify-end">
                  <Button onClick={addNote} disabled={noteSaving || !note.trim()} className="gap-2">
                    {noteSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Add note
                  </Button>
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Panel>
            <h2 className="mb-3 font-display text-base font-semibold text-green-deep">Customer</h2>
            <p className="font-medium text-green-deep">{r.name}</p>
            <div className="mt-2 space-y-1 text-sm">
              <div className="flex items-center gap-3">
                <a href={`tel:${r.phone}`} className="flex items-center gap-1 text-green hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {r.phone}
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green hover:underline"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </div>
              <a href={`mailto:${r.email}`} className="flex items-center gap-1 text-green hover:underline">
                <Mail className="h-3.5 w-3.5" /> {r.email}
              </a>
            </div>
            {r.user_id && (
              <Button asChild variant="ghost" size="sm" className="mt-2 px-0 text-green">
                <Link href={`/admin/customers/${r.user_id}`}>View customer profile →</Link>
              </Button>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 font-display text-base font-semibold text-green-deep">Status</h2>
            <div className="grid grid-cols-2 gap-2">
              {STATUS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={r.status === s ? "default" : "outline"}
                  onClick={() => setStatus(s)}
                  className="capitalize"
                  disabled={r.status === s}
                >
                  {s.replace("_", " ")}
                </Button>
              ))}
            </div>
          </Panel>

          {r.quoted_total != null && (
            <Panel>
              <h2 className="mb-2 font-display text-base font-semibold text-green-deep">Quoted</h2>
              <p className="text-2xl font-bold text-green-deep">{formatCurrency(r.quoted_total)}</p>
              <p className="text-xs capitalize text-muted-foreground">{r.payment_mode} payment</p>
              <Button asChild variant="outline" size="sm" className="mt-3 w-full gap-2">
                <Link href={`/admin/bulk-requests/${r.id}/quote-invoice`} target="_blank">
                  <FileText className="h-4 w-4" /> View as quotation
                </Link>
              </Button>
              {!r.converted_order_id && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-medium text-green-deep">Payment method for the order</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setConvertMethod("cod")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        convertMethod === "cod" ? "border-green bg-sage/30 text-green-deep" : "border-sand text-muted-foreground"
                      }`}
                    >
                      {cashLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConvertMethod("bank_transfer")}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        convertMethod === "bank_transfer" ? "border-green bg-sage/30 text-green-deep" : "border-sand text-muted-foreground"
                      }`}
                    >
                      Bank transfer
                    </button>
                  </div>
                  <Button onClick={() => setConvertOpen(true)} className="w-full">
                    Convert to order
                  </Button>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={quoteConfirmOpen}
        onOpenChange={setQuoteConfirmOpen}
        title="Send this quote to the customer?"
        description={
          <span className="mt-1 block space-y-1">
            <span className="block">
              <strong>Total:</strong> {formatCurrency(Number(total) || 0)}
            </span>
            {singleItem && unitPrice ? (
              <span className="block">
                <strong>Unit price:</strong> {formatCurrency(Number(unitPrice))}
              </span>
            ) : null}
            <span className="block">
              <strong>Payment:</strong>{" "}
              {paymentMode === "online" ? "Pay online (secure link)" : "Offline (you arrange payment)"}
            </span>
            <span className="block whitespace-pre-line">
              <strong>Message:</strong> {message.trim() ? message.trim() : "— none —"}
            </span>
          </span>
        }
        confirmLabel="Send quote"
        destructive={false}
        loading={sending}
        onConfirm={submitQuote}
      />

      <ConfirmDialog
        open={convertOpen}
        onOpenChange={setConvertOpen}
        title="Convert to a tracked order?"
        description={`Creates an order (single bulk line item) set to "${
          convertMethod === "cod" ? cashLabel : "Bank transfer"
        }". You can then manage it like any normal order.`}
        confirmLabel="Create order"
        destructive={false}
        loading={converting}
        onConfirm={convert}
      />
    </div>
  );
}

function Detail2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="capitalize text-green-deep">{value}</dd>
    </div>
  );
}
