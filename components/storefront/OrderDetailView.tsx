import Image from "next/image";
import { Bell, Truck, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import type { OrderWithItems } from "@/types/checkout";

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  preparing: "Preparing",
  out_for_delivery: "Out for delivery",
  ready_for_pickup: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  pending_transfer: "Awaiting bank transfer",
  cod: "Awaiting payment",
  paid: "Paid",
  rejected: "Payment rejected",
  refunded: "Refunded",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  payhere: "Online (PayHere)",
  bank_transfer: "Bank Transfer",
  cod: "Cash on Delivery",
};

function paymentMethodLabel(method: string, fulfillmentType: string): string {
  if (method === "cod" && fulfillmentType === "pickup") return "Pay at Store";
  return PAYMENT_METHOD_LABEL[method] ?? method;
}

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "weekly",
  biweekly: "every 2 weeks",
  monthly: "monthly",
};

/**
 * Display label for the payment status. For bank transfers the raw
 * `pending_transfer` is refined by the receipt sub-state so it reads honestly:
 * once a receipt is in, payment is "under review", not still "awaiting transfer".
 * The DB `payment_status` stays the source of truth (admin approval → paid).
 */
function paymentStatusLabel(order: OrderWithItems): string {
  if (order.status === "cancelled" && order.payment_status === "pending_transfer") return "Not paid";
  if (order.payment_method === "bank_transfer" && order.payment_status === "pending_transfer") {
    if (order.bank_receipt?.status === "rejected") return "Receipt rejected, please re-upload";
    if (order.bank_receipt) return "Payment under review";
    return "Awaiting bank transfer";
  }
  return PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status;
}

export function OrderDetailView({ order }: { order: OrderWithItems }) {
  const isDelivery = order.fulfillment_type === "delivery";
  const addr = order.address_snapshot;

  return (
    <div className="space-y-6">
      {/* Status chips */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
        <Badge variant={order.payment_status === "paid" ? "default" : "gold"}>
          {paymentStatusLabel(order)}
        </Badge>
      </div>

      {/* Items */}
      <div className="rounded-2xl border border-sand bg-white divide-y divide-sand">
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
            <div className="flex-1 min-w-0">
              <p className="font-medium text-green-deep leading-snug">
                {order.source === "bulk_conversion" ? "Bulk order" : item.product_snapshot.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.options.size?.label} · Qty {item.quantity}
              </p>
              {item.options.note && (
                <p className="text-xs text-muted-foreground italic mt-0.5">“{item.options.note}”</p>
              )}
              {item.options.is_subscription && (
                <Badge variant="sage" className="mt-1 gap-1 text-[10px]">
                  <Bell className="h-2.5 w-2.5" />
                  Reorder {INTERVAL_LABEL[item.options.subscription_interval ?? "monthly"]}
                </Badge>
              )}
            </div>
            <span className="text-sm font-semibold text-green-deep">{formatCurrency(item.line_total)}</span>
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="rounded-2xl border border-sand bg-white p-5 space-y-2 text-sm">
        <Line label="Subtotal" value={formatCurrency(order.subtotal)} />
        {order.discount_amount > 0 && (
          <Line label="Discount" value={`−${formatCurrency(order.discount_amount)}`} accent />
        )}
        {order.loyalty_discount > 0 && (
          <Line label={`Loyalty (${order.loyalty_points_used} pts)`} value={`−${formatCurrency(order.loyalty_discount)}`} accent />
        )}
        {isDelivery && <Line label="Delivery" value={formatCurrency(order.delivery_fee)} />}
        {order.tax_amount > 0 && <Line label="Tax" value={formatCurrency(order.tax_amount)} />}
        <div className="flex items-baseline justify-between border-t border-sand pt-3 mt-1">
          <span className="font-semibold text-green-deep">Total</span>
          <span className="font-display text-xl font-semibold text-green-deep">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>

      {/* Quote details — only for orders created from a bulk quote */}
      {order.quote_note && (
        <div className="rounded-2xl border border-gold-warm/40 bg-gold/5 p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gold-warm">
            Quote details
          </p>
          <p className="whitespace-pre-line text-sm text-green-deep">{order.quote_note}</p>
        </div>
      )}

      {/* Fulfillment + payment */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-sand bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-green-deep mb-2">
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
            <p className="text-sm text-muted-foreground mt-1">
              {addr.recipient}
              <br />
              {[addr.line1, addr.line2, addr.city, addr.postal_code].filter(Boolean).join(", ")}
            </p>
          )}
          {isDelivery && order.delivery_zone?.name && (
            <p className="text-xs text-muted-foreground mt-1">{order.delivery_zone.name}</p>
          )}
        </div>

        <div className="rounded-2xl border border-sand bg-white p-5">
          <p className="text-sm font-semibold text-green-deep mb-2">Payment</p>
          <p className="text-sm text-muted-foreground">
            {paymentMethodLabel(order.payment_method, order.fulfillment_type)}
          </p>
          <p className="text-sm text-muted-foreground">{paymentStatusLabel(order)}</p>
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
