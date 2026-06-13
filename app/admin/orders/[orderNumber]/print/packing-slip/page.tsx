import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/admin/orders-data";
import { getShopInfo } from "@/lib/settings";
import { PrintInvoiceButton } from "@/components/account/PrintInvoiceButton";
import { brand } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";

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
            <p className="mt-1 text-lg font-bold">{addr?.recipient ?? order.customer_name ?? "Customer"}</p>
            <p className="text-lg font-bold">📞 {order.customer_phone ?? "—"}</p>
            {isDelivery && addr && (
              <p className="text-sm">
                {[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")}
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

        {/* Items — large + bold */}
        <table className="w-full border-t-2 border-green-deep">
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
                <td className="py-3 text-lg font-bold">{item.product_snapshot.name}</td>
                <td className="py-3 text-lg font-semibold">{item.options.size?.label ?? "—"}</td>
                <td className="py-3 text-right text-2xl font-extrabold">×{item.quantity}</td>
              </tr>
            ))}
          </tbody>
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
