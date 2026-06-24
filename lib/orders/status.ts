// Shared order/payment status presentation — labels, timeline steps, badge tones.
// Used by the storefront order views (success, tracking, account). Keep the
// DB enum (migration 001) as the source of truth; this only maps it to UI.

import type { BadgeProps } from "@/components/ui/badge";

export type OrderStatus =
  | "pending_confirmation"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "ready_for_pickup"
  | "delivered"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending_confirmation: "Pending confirmation",
  confirmed: "Confirmed",
  preparing: "In preparation",
  out_for_delivery: "Out for delivery",
  ready_for_pickup: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting payment",
  pending_transfer: "Awaiting bank transfer",
  cod: "Awaiting payment",
  paid: "Paid",
  rejected: "Payment rejected",
  refunded: "Refunded",
};

/**
 * Human label for an order's payment status. For bank transfers the raw
 * `pending_transfer` is refined by the receipt sub-state so it reads honestly:
 * a receipt under review shows "Payment under review", not "Awaiting bank
 * transfer". The DB `payment_status` stays the source of truth (admin approval
 * → `paid`).
 *
 * `context` controls only the rejected-receipt wording:
 *  - `"live"` (order pages) → "Receipt rejected — please re-upload" (actionable).
 *  - `"invoice"` (printed records) → "Awaiting bank transfer" (factual; the order
 *    has genuinely reverted to awaiting payment, and an invoice shouldn't nag an
 *    action that belongs on the live order page).
 */
export function paymentStatusLabel(input: {
  paymentMethod: string;
  paymentStatus: string;
  receiptStatus?: string | null;
  context?: "live" | "invoice";
  orderStatus?: string;
}): string {
  const { paymentMethod, paymentStatus, receiptStatus, context = "live", orderStatus } = input;
  if (orderStatus === "cancelled" && paymentStatus === "pending_transfer") return "Not paid";
  if (paymentMethod === "bank_transfer" && paymentStatus === "pending_transfer") {
    if (receiptStatus === "rejected") {
      return context === "invoice"
        ? "Awaiting bank transfer"
        : "Receipt rejected — please re-upload";
    }
    if (receiptStatus) return "Payment under review";
    return "Awaiting bank transfer";
  }
  return PAYMENT_STATUS_LABEL[paymentStatus] ?? paymentStatus;
}

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  payhere: "Online (PayHere)",
  bank_transfer: "Bank Transfer",
  cod: "Cash on Delivery",
};

/**
 * Human label for a payment method. The `cod` ("cash") method is the same
 * transaction for delivery and pickup — cash on hand-over — so its wording is
 * fulfillment-aware: "Cash on Delivery" at the door, "Pay at Store" at the store.
 */
export function paymentMethodLabel(
  method: string,
  fulfillmentType?: string | null
): string {
  if (method === "cod" && fulfillmentType === "pickup") return "Pay at Store";
  return PAYMENT_METHOD_LABEL[method] ?? method;
}

export const INTERVAL_LABEL: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
};

/** Badge tone for an order status. */
export function orderStatusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "delivered":
      return "default";
    case "cancelled":
    case "refunded":
      return "destructive";
    case "out_for_delivery":
    case "ready_for_pickup":
      return "gold";
    case "confirmed":
    case "preparing":
      return "sage";
    default:
      return "secondary";
  }
}

/** Customers may cancel an order only before it has been confirmed/prepared. */
export function isCancellable(status: string): boolean {
  return status === "pending_confirmation";
}

export interface TimelineStep {
  key: string;
  label: string;
}

/**
 * Ordered milestones for the order timeline. The "out for delivery" vs
 * "ready for pickup" step depends on the fulfillment type.
 */
export function timelineSteps(fulfillmentType: "delivery" | "pickup"): TimelineStep[] {
  return [
    { key: "pending_confirmation", label: "Placed" },
    { key: "confirmed", label: "Confirmed" },
    { key: "preparing", label: "In preparation" },
    fulfillmentType === "pickup"
      ? { key: "ready_for_pickup", label: "Ready for pickup" }
      : { key: "out_for_delivery", label: "Out for delivery" },
    { key: "delivered", label: "Delivered" },
  ];
}

const STEP_ORDER: Record<string, number> = {
  pending_confirmation: 0,
  confirmed: 1,
  preparing: 2,
  out_for_delivery: 3,
  ready_for_pickup: 3,
  delivered: 4,
};

/** Index of the current status within the timeline (for marking steps reached). */
export function statusStepIndex(status: string): number {
  return STEP_ORDER[status] ?? 0;
}

// ─── Order contacts (recipient vs. account holder) ───────────────────────────

export interface SecondaryContact {
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface OrderContacts {
  /** Who the order is delivered to / picked up by (the address-snapshot recipient). */
  recipientName: string | null;
  recipientPhone: string | null;
  /**
   * The account holder who placed & paid for the order, surfaced as a labelled
   * "secondary contact" — but ONLY when the order was placed on behalf of a
   * different person. It's `null` when the recipient is the account holder, for
   * guest orders, or when there's no recipient on file (e.g. pickup).
   */
  secondaryContact: SecondaryContact | null;
}

const normalizeName = (s: string | null | undefined) =>
  (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Resolve the recipient (primary contact) and, when the order was placed for a
 * different person, the account holder as a secondary contact. Detection is
 * name-based (different recipient name ⇒ third-party); it never fires for guests
 * or when either name is missing. Shape-agnostic so the admin order view, both
 * invoices, and the packing slip can share one rule.
 */
export function deriveOrderContacts(input: {
  recipientName: string | null;
  recipientPhone: string | null;
  accountName: string | null;
  accountPhone: string | null;
  accountEmail: string | null;
  hasAccount: boolean;
}): OrderContacts {
  const recipientName = input.recipientName?.trim() || null;
  const recipientPhone = input.recipientPhone?.trim() || null;
  const accountName = input.accountName?.trim() || null;

  const isThirdParty =
    input.hasAccount &&
    !!recipientName &&
    !!accountName &&
    normalizeName(recipientName) !== normalizeName(accountName);

  return {
    recipientName,
    recipientPhone,
    secondaryContact: isThirdParty
      ? {
          name: accountName,
          phone: input.accountPhone?.trim() || null,
          email: input.accountEmail?.trim() || null,
        }
      : null,
  };
}
