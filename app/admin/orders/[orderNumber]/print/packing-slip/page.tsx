import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/admin/orders-data";
import { getShopInfo } from "@/lib/settings";
import { PrintInvoiceButton } from "@/components/account/PrintInvoiceButton";
import { brand, formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { deriveOrderContacts, paymentMethodLabel } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Packing slip" };

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #packing-print-area, #packing-print-area * { visibility: visible !important; }
  #packing-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
  @page { margin: 16mm; }
}
`;

export default async function PackingSlipPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderDetail(orderNumber);
  if (!order) notFound();
  const shop = await getShopInfo();
  const isDelivery = order.fulfillment_type === "delivery";
  const addr = order.address_snapshot;
  const contacts = deriveOrderContacts({
    recipientName: addr?.recipient ?? null,
    recipientPhone: addr?.phone ?? null,
    accountName: order.customer_name,
    accountPhone: order.customer_phone,
    accountEmail: order.customer_email,
    hasAccount: !!order.user_id,
  });
  const deliverToName = contacts.recipientName ?? order.customer_name ?? "Customer";
  const deliverToPhone = isDelivery
    ? contacts.recipientPhone ?? order.customer_phone
    : order.customer_phone;

  // Payment hand-over guidance: cash is collected only for an unpaid cash order
  // (method `cod`); everything else is paid elsewhere, so the driver/counter must
  // not collect cash. Wording relies on words + size + borders so it survives B/W printing.
  const isPaid = order.payment_status === "paid";
  const collectCash = order.payment_method === "cod" && !isPaid;
  const methodLabel = paymentMethodLabel(order.payment_method, order.fulfillment_type);

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="mb-4 flex justify-end print:hidden">
        <PrintInvoiceButton label="Print packing slip" />
      </div>

      <div id="packing-print-area" className="rounded-2xl border border-sand bg-white p-6 text-green-deep md:p-10">
        <div className="flex items-start justify-between border-b-2 border-green-deep pb-4">
          <div>
            <p className="font-display text-2xl font-bold">{shop.name ?? brand.name}</p>
            <p className="text-sm text-muted-foreground">Packing slip</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">{formatShortDate(order.created_at)}</p>
          </div>
        </div>

        {/* Customer + delivery */}
        <div className="grid gap-4 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isDelivery ? "Deliver to" : "Pickup by"}
            </p>
            <p className="mt-1 text-lg font-bold">{deliverToName}</p>
            <p className="text-lg font-bold">📞 {deliverToPhone ?? "—"}</p>
            {isDelivery && addr && (
              <p className="text-sm">
                {[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")}
              </p>
            )}
            {contacts.secondaryContact && (
              <p className="mt-1 text-sm font-semibold">
                Secondary contact: {contacts.secondaryContact.name}
                {contacts.secondaryContact.phone ? ` · 📞 ${contacts.secondaryContact.phone}` : ""}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isDelivery ? "Delivery" : "Pickup"} time
            </p>
            <p className="mt-1 text-lg font-bold">
              {order.delivery_date ? formatShortDate(order.delivery_date) : "—"}
            </p>
            {order.time_slot?.label && <p className="text-lg font-bold">{order.time_slot.label}</p>}
          </div>
        </div>

        {/* Payment hand-over banner — always shown so the driver/counter is never unsure */}
        {collectCash ? (
          <div className="rounded-xl border-2 border-green-deep p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Amount due on {isDelivery ? "delivery" : "collection"}
            </p>
            <p className="mt-1 text-3xl font-bold">Cash to collect: {formatCurrency(order.total)}</p>
            <p className="text-base font-semibold">{methodLabel} · payment not yet received</p>
          </div>
        ) : isPaid ? (
          <div className="rounded-xl border-2 border-sage bg-sage/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment status
            </p>
            <p className="mt-1 text-2xl font-bold">Paid in full</p>
            <p className="text-base font-semibold">{methodLabel} · no collection required</p>
          </div>
        ) : (
          <div className="rounded-xl border-2 border-green-deep p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Payment status
            </p>
            <p className="mt-1 text-2xl font-bold">Awaiting payment</p>
            <p className="text-base font-semibold">{methodLabel} · do not collect cash</p>
          </div>
        )}

        {/* Items — large + bold */}
        <table className="mt-5 w-full border-t-2 border-green-deep">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2">Product</th>
              <th className="py-2">Size</th>
              <th className="py-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-sand">
                {/* For a quote-converted (bulk) order the product list lives in the
                    Size column, so the Product column just shows "Bulk order" — this
                    also tidies older orders whose name embedded the same list. Normal
                    orders (no bulk_request_id) show their real product name. */}
                <td className="py-3 text-lg font-bold">
                  {order.bulk_request_id ? "Bulk order" : item.product_snapshot.name}
                </td>
                <td className="py-3 text-lg font-semibold">{item.options.size?.label ?? "—"}</td>
                <td className="py-3 text-right text-2xl font-extrabold">×{item.quantity}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-green-deep">
              <td className="py-3 text-base font-bold" colSpan={2}>
                Total
              </td>
              <td className="py-3 text-right text-xl font-extrabold">{formatCurrency(order.total)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Notes box */}
        {(order.notes || order.items.some((i) => i.options.note)) && (
          <div className="mt-6 rounded-xl border-2 border-gold bg-gold/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-green-deep">Notes</p>
            {order.notes && <p className="mt-1 text-base font-semibold">{order.notes}</p>}
            {order.items
              .filter((i) => i.options.note)
              .map((i) => (
                <p key={i.id} className="mt-1 text-base font-semibold">
                  {i.product_snapshot.name}: {i.options.note}
                </p>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
