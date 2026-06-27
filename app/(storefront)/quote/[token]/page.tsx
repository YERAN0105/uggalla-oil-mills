// Public bulk-quote pay-online page (`/quote/[token]`). Optional flow, gated by
// PayHere. The customer reviews the quote the admin sent and pays via PayHere,
// which creates a tracked order linked to the bulk request. Handles every state
// gracefully (link unavailable, expired, already paid, rejected) with a branded
// message rather than erroring.

import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPayHereEnabled } from "@/lib/integrations";
import { brand, formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { signOrderToken } from "@/lib/orders/token";
import { normalizeBulkItems } from "@/lib/bulk/items";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { QuoteAcceptButton } from "@/components/storefront/QuoteAcceptButton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Quote", robots: { index: false } };

/* eslint-disable @typescript-eslint/no-explicit-any */

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-2xl border border-border bg-white p-8 text-center shadow-sm">
        <DropletSVG className="mx-auto h-12 w-12 text-green" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-green-deep">{title}</h1>
        {children}
      </div>
    </div>
  );
}

export default async function QuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!isPayHereEnabled) {
    return (
      <Shell title="This link isn’t available">
        <p className="mt-2 text-muted-foreground">
          Online payment isn’t enabled for this quote. Please get in touch and we’ll arrange payment
          and delivery directly.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{brand.email} · {brand.phone}</p>
      </Shell>
    );
  }

  const db = createAdminClient();
  const { data: br } = await db
    .from("bulk_requests")
    .select("*")
    .eq("quote_token", token)
    .maybeSingle();

  if (!br) {
    return (
      <Shell title="Quote not found">
        <p className="mt-2 text-muted-foreground">
          This quote link isn’t valid. It may have been replaced by a newer quote.
        </p>
        <Link href="/" className="mt-6 inline-block text-green underline">
          Return home
        </Link>
      </Shell>
    );
  }
  const row = br as any;

  // Already converted → point to the order.
  if (row.converted_order_id) {
    const { data: order } = await db
      .from("orders")
      .select("order_number, payment_status")
      .eq("id", row.converted_order_id)
      .maybeSingle();
    const orderNumber = (order as any)?.order_number;
    const paid = (order as any)?.payment_status === "paid";
    return (
      <Shell title={paid ? "Already paid" : "Order started"}>
        <p className="mt-2 text-muted-foreground">
          {paid
            ? "This quote has already been paid — thank you!"
            : "An order was already created from this quote."}
        </p>
        {orderNumber ? (
          <Link
            href={`/orders/${encodeURIComponent(orderNumber)}?t=${signOrderToken(orderNumber)}`}
            className="mt-6 inline-block text-green underline"
          >
            View your order
          </Link>
        ) : null}
      </Shell>
    );
  }

  if (row.status === "rejected") {
    return (
      <Shell title="Quote unavailable">
        <p className="mt-2 text-muted-foreground">This quote is no longer available. Please contact us for a new one.</p>
        <p className="mt-4 text-sm text-muted-foreground">{brand.email} · {brand.phone}</p>
      </Shell>
    );
  }

  if (row.payment_mode !== "online" || !row.quote_token) {
    return (
      <Shell title="This link isn’t available">
        <p className="mt-2 text-muted-foreground">This quote is set up for offline payment. We’ll be in touch to arrange it.</p>
      </Shell>
    );
  }

  const expired = row.quote_expires_at && new Date(row.quote_expires_at).getTime() < Date.now();
  if (expired) {
    return (
      <Shell title="This quote has expired">
        <p className="mt-2 text-muted-foreground">
          For your security this payment link has expired. Please contact us and we’ll send a fresh quote.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">{brand.email} · {brand.phone}</p>
      </Shell>
    );
  }

  const items = normalizeBulkItems(row.items, {
    product_id: row.product_id ?? null,
    name: row.product_id
      ? (await db.from("products").select("name").eq("id", row.product_id).maybeSingle()).data?.name ?? null
      : null,
    quantity: Number(row.quantity) || 0,
    unit: row.unit,
  });
  const total = Number(row.quoted_total ?? 0);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
        <div className="bg-green px-8 py-7 text-center text-white">
          <h1 className="font-display text-2xl font-semibold">Your Quote</h1>
          <p className="mt-1 text-sm text-gold">{brand.name}</p>
        </div>
        <div className="p-8">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="mb-2 text-muted-foreground">
                {items.length > 1 ? "Products" : "Product"}
              </dt>
              <dd>
                <ul className="space-y-1">
                  {items.map((it, i) => (
                    <li key={i} className="flex items-center justify-between gap-2">
                      <span className="font-medium text-green-deep">
                        {it.name ?? "Loose oil"}
                      </span>
                      <span className="text-green-deep">
                        {it.quantity} {it.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            {row.quoted_unit_price ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Unit price</dt>
                <dd className="font-medium text-green-deep">{formatCurrency(Number(row.quoted_unit_price))}</dd>
              </div>
            ) : null}
            {row.preferred_date ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Preferred date</dt>
                <dd className="font-medium text-green-deep">{formatShortDate(row.preferred_date)}</dd>
              </div>
            ) : null}
          </dl>

          {row.quote_message ? (
            <div className="mt-5 rounded-lg bg-sand px-4 py-3 text-sm text-green-deep">{row.quote_message}</div>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="font-display text-lg font-semibold text-green-deep">Total</span>
            <span className="font-display text-2xl font-bold text-green">{formatCurrency(total)}</span>
          </div>

          <div className="mt-6">
            <QuoteAcceptButton token={token} />
          </div>
          {row.quote_expires_at ? (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              This quote is valid until {formatShortDate(row.quote_expires_at)}.
            </p>
          ) : null}
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Secure payment via PayHere. You’ll receive an order confirmation once payment completes.
          </p>
        </div>
      </div>
    </div>
  );
}
