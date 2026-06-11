import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Bell, Truck, Store, Building2, Star, CheckCircle2 } from "lucide-react";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { Badge } from "@/components/ui/badge";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { OrderActions } from "@/components/account/OrderActions";
import { ReviewModal } from "@/components/account/ReviewModal";
import { OrderStatusBadge } from "@/components/account/primitives";
import { BankReceiptUpload } from "@/components/storefront/BankReceiptUpload";
import { CopyableField } from "@/components/storefront/CopyableField";
import { getAccountUser, getAccountOrderDetail } from "@/lib/account/data";
import { getBankDetails, getShopInfo } from "@/lib/settings";
import { signOrderToken } from "@/lib/orders/token";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import {
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  INTERVAL_LABEL,
} from "@/lib/orders/status";

export const metadata: Metadata = { title: "Order Details" };

interface PageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function OrderDetailPage({ params }: PageProps) {
  const user = await getAccountUser();
  const { orderNumber } = await params;
  if (!user) redirect(`/login?redirect=/account/orders/${orderNumber}`);

  const order = await getAccountOrderDetail(user.id, orderNumber);
  if (!order) notFound();

  const isDelivery = order.fulfillment_type === "delivery";
  const addr = order.address_snapshot;
  const isDelivered = order.status === "delivered";

  const token = signOrderToken(order.order_number);
  const shop = await getShopInfo();
  const showBankUpload =
    order.payment_method === "bank_transfer" &&
    order.payment_status === "pending_transfer" &&
    (!order.bank_receipt || order.bank_receipt.status === "rejected");
  const bankDetails = showBankUpload ? await getBankDetails() : null;

  function paymentStatusLabel(): string {
    if (order!.payment_method === "bank_transfer" && order!.payment_status === "pending_transfer") {
      if (order!.bank_receipt?.status === "rejected") return "Receipt rejected — please re-upload";
      if (order!.bank_receipt) return "Payment under review";
      return "Awaiting bank transfer";
    }
    return PAYMENT_STATUS_LABEL[order!.payment_status] ?? order!.payment_status;
  }

  return (
    <div>
      <Link
        href="/account/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-green-deep md:text-3xl">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {formatShortDate(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <Badge variant={order.payment_status === "paid" ? "default" : "gold"}>{paymentStatusLabel()}</Badge>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-6">
        <StatusTimeline status={order.status} fulfillmentType={order.fulfillment_type} history={order.history} />
      </div>

      {/* Actions */}
      <div className="mb-6">
        <OrderActions orderNumber={order.order_number} status={order.status} whatsapp={shop.whatsapp} />
      </div>

      {/* Bank transfer upload */}
      {showBankUpload && bankDetails && (
        <div className="mb-6 rounded-2xl border border-gold-warm/40 bg-gold/5 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-green-deep">
            <Building2 className="h-5 w-5 text-gold-warm" />
            {order.bank_receipt?.status === "rejected" ? "Re-upload your receipt" : "Complete your bank transfer"}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Transfer <strong className="text-green-deep">{formatCurrency(order.total)}</strong> to the account
            below, then upload your receipt so we can verify and confirm your order.
          </p>
          <div className="mb-4 divide-y divide-sand rounded-xl border border-sand bg-white px-4">
            <CopyableField label="Bank" value={bankDetails.bank_name} />
            <CopyableField label="Account name" value={bankDetails.account_name} copyable />
            <CopyableField label="Account number" value={bankDetails.account_number} copyable />
            <CopyableField label="Branch" value={bankDetails.branch} />
            <CopyableField label="Reference" value={order.order_number} copyable />
          </div>
          <BankReceiptUpload orderNumber={order.order_number} token={token} />
        </div>
      )}

      {/* Items */}
      <div className="mb-6 divide-y divide-sand rounded-2xl border border-sand bg-white">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex gap-3 p-4">
            <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-sand">
              {item.product_snapshot.image ? (
                <Image
                  src={item.product_snapshot.image}
                  alt={item.product_snapshot.name}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <DropletSVG className="h-7 w-7 text-sage" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug text-green-deep">{item.product_snapshot.name}</p>
              <p className="text-sm text-muted-foreground">
                {item.product_snapshot.brand ? `${item.product_snapshot.brand} · ` : ""}
                {item.options.size?.label} · Qty {item.quantity}
              </p>
              {item.options.note && (
                <p className="mt-0.5 text-xs italic text-muted-foreground">“{item.options.note}”</p>
              )}
              {item.options.is_subscription && (
                <Badge variant="sage" className="mt-1 gap-1 text-[10px]">
                  <Bell className="h-2.5 w-2.5" />
                  Reorder {INTERVAL_LABEL[item.options.subscription_interval ?? "monthly"]?.toLowerCase()}
                </Badge>
              )}
              {/* Review action on delivered items */}
              {isDelivered && item.product_id && (
                <div className="mt-2">
                  {item.reviewed ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Reviewed
                    </span>
                  ) : (
                    <ReviewModal
                      mode="create"
                      orderItemId={item.id}
                      productId={item.product_id}
                      productName={item.product_snapshot.name}
                      trigger={
                        <button className="inline-flex items-center gap-1 text-xs font-semibold text-green hover:underline">
                          <Star className="h-3.5 w-3.5" /> Write a review
                        </button>
                      }
                    />
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-green-deep">{formatCurrency(item.line_total)}</span>
              <p className="text-xs text-muted-foreground">{formatCurrency(item.unit_price)} each</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing + fulfillment */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Fulfillment */}
        <div className="rounded-2xl border border-sand bg-white p-5">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-deep">
            {isDelivery ? <Truck className="h-4 w-4 text-green" /> : <Store className="h-4 w-4 text-green" />}
            {isDelivery ? "Delivery" : "Pickup"}
          </p>
          {order.delivery_date && (
            <p className="text-sm text-muted-foreground">
              {formatShortDate(order.delivery_date)}
              {order.time_slot?.label ? ` · ${order.time_slot.label}` : ""}
            </p>
          )}
          {isDelivery && addr && (
            <p className="mt-1 text-sm text-muted-foreground">
              {addr.recipient}
              {addr.phone ? ` · ${addr.phone}` : ""}
              <br />
              {[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")}
            </p>
          )}
          {isDelivery && order.delivery_zone?.name && (
            <p className="mt-1 text-xs text-muted-foreground">
              {order.delivery_zone.name}
              {order.delivery_zone.estimated_time ? ` · ${order.delivery_zone.estimated_time}` : ""}
            </p>
          )}
          {!isDelivery && <p className="mt-1 text-sm text-muted-foreground">Collect from {shop.address}</p>}
          {order.notes && (
            <p className="mt-2 border-t border-sand pt-2 text-xs text-muted-foreground">
              <span className="font-medium text-green-deep">Note:</span> {order.notes}
            </p>
          )}
        </div>

        {/* Pricing */}
        <div className="space-y-2 rounded-2xl border border-sand bg-white p-5 text-sm">
          <p className="mb-1 text-sm font-semibold text-green-deep">Payment</p>
          <Line label="Method" value={PAYMENT_METHOD_LABEL[order.payment_method] ?? order.payment_method} />
          <Line label="Subtotal" value={formatCurrency(order.subtotal)} />
          {order.discount_amount > 0 && (
            <Line label="Discount" value={`−${formatCurrency(order.discount_amount)}`} accent />
          )}
          {order.loyalty_discount > 0 && (
            <Line
              label={`Loyalty (${order.loyalty_points_used} pts)`}
              value={`−${formatCurrency(order.loyalty_discount)}`}
              accent
            />
          )}
          {isDelivery && <Line label="Delivery" value={formatCurrency(order.delivery_fee)} />}
          {order.tax_amount > 0 && <Line label="Tax" value={formatCurrency(order.tax_amount)} />}
          <div className="mt-1 flex items-baseline justify-between border-t border-sand pt-3">
            <span className="font-semibold text-green-deep">Total</span>
            <span className="font-display text-xl font-semibold text-green-deep">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${accent ? "text-green" : ""}`}>
      <span className={accent ? "" : "text-muted-foreground"}>{label}</span>
      <span className={accent ? "" : "font-medium text-green-deep"}>{value}</span>
    </div>
  );
}
