import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderDetail } from "@/lib/admin/orders-data";
import { getShopInfo } from "@/lib/settings";
import { PrintInvoiceButton } from "@/components/account/PrintInvoiceButton";
import { formatCurrency, brand } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { paymentMethodLabel, deriveOrderContacts, paymentStatusLabel } from "@/lib/orders/status";

export const metadata: Metadata = { title: "Invoice" };

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
  #invoice-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
  @page { margin: 16mm; }
}
`;

export default async function AdminInvoicePage({
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
  const billedName = contacts.recipientName ?? order.customer_name ?? "Customer";
  const billedPhone = isDelivery
    ? contacts.recipientPhone ?? order.customer_phone
    : order.customer_phone;

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="mb-4 flex justify-end print:hidden">
        <PrintInvoiceButton />
      </div>

      <div id="invoice-print-area" className="rounded-2xl border border-sand bg-white p-6 text-green-deep md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-sand pb-6">
          <div>
            <p className="font-display text-2xl font-semibold text-green">{shop.name ?? brand.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{shop.address}</p>
            <p className="text-sm text-muted-foreground">{shop.phone}</p>
            <p className="text-sm text-muted-foreground">{shop.email}</p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl font-semibold">Invoice</p>
            <p className="mt-1 text-sm text-muted-foreground">{order.order_number}</p>
            <p className="text-sm text-muted-foreground">{formatShortDate(order.created_at)}</p>
          </div>
        </div>

        <div className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billed to</p>
            <p className="mt-1 font-medium">{billedName}</p>
            {billedPhone && <p className="text-sm text-muted-foreground">{billedPhone}</p>}
            {isDelivery && addr && (
              <p className="text-sm text-muted-foreground">
                {[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")}
              </p>
            )}
            {!isDelivery && <p className="text-sm text-muted-foreground">Pickup order</p>}
            {contacts.secondaryContact && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-green-deep">Secondary contact:</span>{" "}
                {contacts.secondaryContact.name}
                {contacts.secondaryContact.phone ? ` · ${contacts.secondaryContact.phone}` : ""}
              </p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payment</p>
            <p className="mt-1 text-sm">{paymentMethodLabel(order.payment_method, order.fulfillment_type)}</p>
            <p className="text-sm text-muted-foreground">
              {paymentStatusLabel({
                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,
                receiptStatus: order.bank_receipt?.status,
                orderStatus: order.status,
                context: "invoice",
              })}
            </p>
            {order.delivery_date && (
              <p className="mt-1 text-sm text-muted-foreground">
                {isDelivery ? "Delivery" : "Pickup"}: {formatShortDate(order.delivery_date)}
                {order.time_slot?.label ? ` · ${order.time_slot.label}` : ""}
              </p>
            )}
          </div>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-sand/60">
                <td className="py-2.5 pr-2">
                  <p className="font-medium">{item.product_snapshot.name}</p>
                  <p className="text-xs text-muted-foreground">{item.options.size?.label}</p>
                </td>
                <td className="py-2.5 text-center">{item.quantity}</td>
                <td className="py-2.5 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2.5 text-right">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto mt-4 max-w-xs space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
          {order.discount_amount > 0 && <Row label="Discount" value={`−${formatCurrency(order.discount_amount)}`} />}
          {order.loyalty_discount > 0 && (
            <Row label={`Loyalty (${order.loyalty_points_used} pts)`} value={`−${formatCurrency(order.loyalty_discount)}`} />
          )}
          {isDelivery && <Row label="Delivery" value={formatCurrency(order.delivery_fee)} />}
          {order.tax_amount > 0 && <Row label="Tax" value={formatCurrency(order.tax_amount)} />}
          <div className="flex justify-between border-t border-sand pt-2 text-base font-semibold">
            <span>Total</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        <p className="mt-8 border-t border-sand pt-4 text-center text-xs text-muted-foreground">
          Thank you for choosing {shop.name ?? brand.name}. {brand.tagline}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
