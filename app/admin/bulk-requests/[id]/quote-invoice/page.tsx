import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBulkRequestDetail } from "@/lib/admin/bulk-data";
import { getShopInfo } from "@/lib/settings";
import { PrintInvoiceButton } from "@/components/account/PrintInvoiceButton";
import { Button } from "@/components/ui/button";
import { formatCurrency, brand } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";

export const metadata: Metadata = { title: "Quotation" };

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
  #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
  @page { margin: 16mm; }
}
`;

/** A printable "Quotation" document built from a bulk request's latest quote. */
export default async function QuoteInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await getBulkRequestDetail(id);
  if (!r) notFound();

  const shop = await getShopInfo();
  const hasQuote = r.quoted_total != null && ["quoted", "accepted", "completed"].includes(r.status);
  const isDelivery = r.fulfillment_type === "delivery";
  const addr = r.address_snapshot;
  const quoteRef = `QUO-${r.id.slice(0, 8).toUpperCase()}`;
  // A single unit price is only meaningful for a one-product quote.
  const showUnitPrice = r.items.length <= 1 && r.quoted_unit_price != null;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href={`/admin/bulk-requests/${r.id}`}>
            <ArrowLeft className="h-4 w-4" /> Back to request
          </Link>
        </Button>
        {hasQuote && <PrintInvoiceButton />}
      </div>

      {!hasQuote ? (
        <div className="rounded-2xl border border-sand bg-white p-8 text-center text-muted-foreground">
          <p className="font-medium text-green-deep">No quote to show yet</p>
          <p className="mt-1 text-sm">
            Send a quote on this request first — then you can view it as a quotation here.
          </p>
        </div>
      ) : (
        <div
          id="invoice-print-area"
          className="rounded-2xl border border-sand bg-white p-6 text-green-deep md:p-10"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand pb-6">
            <div>
              <p className="font-display text-2xl font-semibold text-green">{shop.name ?? brand.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{shop.address}</p>
              <p className="text-sm text-muted-foreground">{shop.phone}</p>
              <p className="text-sm text-muted-foreground">{shop.email}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-xl font-semibold">Quotation</p>
              <p className="mt-1 text-sm text-muted-foreground">{quoteRef}</p>
              <p className="text-sm text-muted-foreground">{formatShortDate(r.created_at)}</p>
            </div>
          </div>

          <div className="grid gap-6 py-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Prepared for
              </p>
              <p className="mt-1 font-medium">{r.name}</p>
              {r.phone && <p className="text-sm text-muted-foreground">{r.phone}</p>}
              {r.email && <p className="text-sm text-muted-foreground">{r.email}</p>}
              {isDelivery && addr ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[addr.recipient, addr.line1, addr.line2, addr.city, addr.postal_code]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              ) : (
                <p className="mt-1 text-sm text-muted-foreground">Pickup from mill</p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Details
              </p>
              <p className="mt-1 text-sm">
                Fulfillment: {isDelivery ? "Delivery" : "Mill pickup"}
              </p>
              <p className="text-sm text-muted-foreground">
                Payment: {r.payment_mode === "online" ? "Pay online (secure link)" : "Arranged directly"}
              </p>
              {r.preferred_date && (
                <p className="text-sm text-muted-foreground">
                  Preferred date: {formatShortDate(r.preferred_date)}
                </p>
              )}
              {r.quote_expires_at && (
                <p className="text-sm text-muted-foreground">
                  Valid until: {formatShortDate(r.quote_expires_at)}
                </p>
              )}
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2">Product</th>
                <th className="py-2 text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {r.items.map((it, i) => (
                <tr key={i} className="border-b border-sand/60">
                  <td className="py-2.5 pr-2 font-medium">{it.name ?? "Loose coconut oil"}</td>
                  <td className="py-2.5 text-right">
                    {it.quantity} {it.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
            {showUnitPrice && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit price</span>
                <span className="font-medium">{formatCurrency(r.quoted_unit_price!)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-sand pt-2 text-base font-semibold">
              <span>Quoted total</span>
              <span>{formatCurrency(r.quoted_total!)}</span>
            </div>
          </div>

          {r.quote_message && (
            <div className="mt-6 border-t border-sand pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</p>
              <p className="mt-1 whitespace-pre-line text-sm text-green-deep">{r.quote_message}</p>
            </div>
          )}

          <p className="mt-8 border-t border-sand pt-4 text-center text-xs text-muted-foreground">
            This is a quotation, not a tax invoice. Prices are valid for the period stated above.
            Thank you for considering {shop.name ?? brand.name}. {brand.tagline}
          </p>
        </div>
      )}
    </div>
  );
}
