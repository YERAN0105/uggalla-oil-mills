import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone, MessageCircle, Mail, User, MapPin, StickyNote } from "lucide-react";
import { getOrderDetail } from "@/lib/admin/orders-data";
import { isWhatsAppEnabled } from "@/lib/integrations";
import { formatCurrency } from "@/lib/brand";
import { formatDateTime, formatShortDate } from "@/lib/date";
import {
  ORDER_STATUS_LABEL,
  paymentStatusLabel,
  paymentMethodLabel,
  INTERVAL_LABEL,
  orderStatusVariant,
  deriveOrderContacts,
} from "@/lib/orders/status";
import { Panel } from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { OrderStatusEditor } from "@/components/admin/orders/OrderStatusEditor";
import { OrderInternalNotes } from "@/components/admin/orders/OrderInternalNotes";
import { OrderActionButtons } from "@/components/admin/orders/OrderActionButtons";
import { BankReceiptReview } from "@/components/admin/orders/BankReceiptReview";

export const metadata: Metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const order = await getOrderDetail(orderNumber);
  if (!order) notFound();

  const waPhone = order.customer_phone?.replace(/[^0-9]/g, "");
  const addr = order.address_snapshot;
  const contacts = deriveOrderContacts({
    recipientName: addr?.recipient ?? null,
    recipientPhone: addr?.phone ?? null,
    accountName: order.customer_name,
    accountPhone: order.customer_phone,
    accountEmail: order.customer_email,
    hasAccount: !!order.user_id,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/orders" aria-label="Back to orders">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-green-deep">{order.order_number}</h1>
          <Badge variant={orderStatusVariant(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Badge>
          <Badge variant={order.payment_status === "paid" ? "sage" : "secondary"}>
            {paymentStatusLabel({
              paymentMethod: order.payment_method,
              paymentStatus: order.payment_status,
            })}
          </Badge>
          <span className="text-sm text-muted-foreground">{formatDateTime(order.created_at)}</span>
          {order.bulk_request_id && (
            <Link
              href={`/admin/bulk-requests/${order.bulk_request_id}`}
              className="text-sm text-green hover:underline"
            >
              ← Converted from bulk request
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-5 lg:col-span-2">
          <OrderStatusEditor
            orderId={order.id}
            status={order.status}
            fulfillmentType={order.fulfillment_type}
            history={order.history}
            placedAt={order.created_at}
          />

          {/* Items */}
          <Panel>
            <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Items</h2>
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="flex gap-3 border-b border-sand/60 pb-3 last:border-0 last:pb-0">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {it.product_snapshot.image && (
                      <Image
                        src={it.product_snapshot.image}
                        alt={it.product_snapshot.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-green-deep">
                      {order.bulk_request_id ? "Bulk order" : it.product_snapshot.name}
                    </p>
                    {it.product_snapshot.brand && (
                      <p className="text-xs text-muted-foreground">{it.product_snapshot.brand}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      {it.options.size?.label && (
                        <Badge variant="secondary" className="text-[10px]">{it.options.size.label}</Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px]">Qty {it.quantity}</Badge>
                      {it.options.is_subscription && (
                        <Badge variant="gold" className="text-[10px]">
                          Subscription · {INTERVAL_LABEL[it.options.subscription_interval ?? ""] ?? "—"}
                        </Badge>
                      )}
                    </div>
                    {it.options.note && (
                      <p className="mt-1 rounded bg-gold/15 px-2 py-1 text-xs text-green-deep">
                        <StickyNote className="mr-1 inline h-3 w-3" />
                        {it.options.note}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-sm">
                    <p className="text-muted-foreground">{formatCurrency(it.unit_price)}</p>
                    <p className="font-medium text-green-deep">{formatCurrency(it.line_total)}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className="mt-4 space-y-1 border-t border-sand pt-4 text-sm">
              <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
              <Row label="Delivery fee" value={formatCurrency(order.delivery_fee)} />
              {order.discount_amount > 0 && (
                <Row
                  label={`Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}`}
                  value={`− ${formatCurrency(order.discount_amount)}`}
                />
              )}
              {order.loyalty_discount > 0 && (
                <Row
                  label={`Loyalty (${order.loyalty_points_used} pts)`}
                  value={`− ${formatCurrency(order.loyalty_discount)}`}
                />
              )}
              {order.tax_amount > 0 && <Row label="Tax" value={formatCurrency(order.tax_amount)} />}
              <div className="flex justify-between border-t border-sand pt-2 text-base font-semibold text-green-deep">
                <span>Total</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>
          </Panel>

          <OrderInternalNotes orderId={order.id} notes={order.internal_notes} />
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-green-deep">
              <User className="h-4 w-4" /> Customer
            </h2>
            <p className="font-medium text-green-deep">{order.customer_name ?? "Guest"}</p>
            {contacts.secondaryContact && contacts.recipientName && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Ordering on behalf of {contacts.recipientName}
              </p>
            )}
            <div className="mt-2 space-y-1 text-sm">
              {order.customer_phone && (
                <div className="flex items-center gap-3">
                  <a href={`tel:${order.customer_phone}`} className="flex items-center gap-1 text-green hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {order.customer_phone}
                  </a>
                  {waPhone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi, regarding your order ${order.order_number}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-green hover:underline"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  )}
                </div>
              )}
              {order.customer_email && (
                <a href={`mailto:${order.customer_email}`} className="flex items-center gap-1 text-green hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {order.customer_email}
                </a>
              )}
            </div>
            {order.user_id && (
              <Button asChild variant="ghost" size="sm" className="mt-2 px-0 text-green">
                <Link href={`/admin/customers/${order.user_id}`}>View customer profile →</Link>
              </Button>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-green-deep">
              <MapPin className="h-4 w-4" /> Fulfillment
            </h2>
            <p className="text-sm font-medium capitalize text-green-deep">{order.fulfillment_type}</p>
            {order.fulfillment_type === "delivery" && addr && (
              <div className="mt-1 text-sm text-muted-foreground">
                <p className="font-medium text-green-deep">{addr.recipient}</p>
                {contacts.recipientPhone && (
                  <a
                    href={`tel:${contacts.recipientPhone}`}
                    className="flex items-center gap-1 text-green hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" /> {contacts.recipientPhone}
                  </a>
                )}
                <p>{[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    [addr.line1, addr.city].filter(Boolean).join(", ")
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green hover:underline"
                >
                  Open in maps →
                </a>
              </div>
            )}
            <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
              {order.delivery_zone && (
                <p>
                  Zone: {order.delivery_zone.name} ({formatCurrency(order.delivery_zone.fee)})
                </p>
              )}
              {order.delivery_date && <p>Date: {formatShortDate(order.delivery_date)}</p>}
              {order.time_slot && <p>Slot: {order.time_slot.label}</p>}
            </div>

            {order.notes && (
              <div className="mt-3 rounded-lg border-l-4 border-green/50 bg-sage/20 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Customer note
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-green-deep">{order.notes}</p>
              </div>
            )}

            {contacts.secondaryContact && (
              <div className="mt-3 rounded-lg border border-sand bg-sand/30 p-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Secondary contact
                </p>
                <p className="mt-0.5 text-sm font-medium text-green-deep">
                  {contacts.secondaryContact.name}
                </p>
                <div className="space-y-0.5 text-sm">
                  {contacts.secondaryContact.phone && (
                    <a
                      href={`tel:${contacts.secondaryContact.phone}`}
                      className="flex items-center gap-1 text-green hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" /> {contacts.secondaryContact.phone}
                    </a>
                  )}
                  {contacts.secondaryContact.email && (
                    <a
                      href={`mailto:${contacts.secondaryContact.email}`}
                      className="flex items-center gap-1 text-green hover:underline"
                    >
                      <Mail className="h-3.5 w-3.5" /> {contacts.secondaryContact.email}
                    </a>
                  )}
                </div>
              </div>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 font-display text-base font-semibold text-green-deep">Payment</h2>
            <p className="text-sm text-green-deep">
              {paymentMethodLabel(order.payment_method, order.fulfillment_type)}
            </p>
            <Badge variant={order.payment_status === "paid" ? "sage" : "secondary"} className="mt-1 text-[10px]">
              {paymentStatusLabel({
                paymentMethod: order.payment_method,
                paymentStatus: order.payment_status,
              })}
            </Badge>

            {order.bank_receipt && (
              <div className="mt-4">
                <BankReceiptReview receipt={order.bank_receipt} />
              </div>
            )}

            {order.payment?.gateway_transaction_id && (
              <p className="mt-3 text-xs text-muted-foreground">
                Txn: {order.payment.gateway_transaction_id}
              </p>
            )}
            {order.payment?.raw_response != null && (
              <details className="mt-2 text-xs">
                <summary className="cursor-pointer text-green">Gateway response</summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-sand/40 p-2 text-[10px]">
                  {JSON.stringify(order.payment.raw_response, null, 2)}
                </pre>
              </details>
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 font-display text-base font-semibold text-green-deep">Actions</h2>
            <OrderActionButtons
              orderId={order.id}
              orderNumber={order.order_number}
              status={order.status}
              paymentStatus={order.payment_status}
              whatsappEnabled={isWhatsAppEnabled}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-green-deep">{value}</span>
    </div>
  );
}
