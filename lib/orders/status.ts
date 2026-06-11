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
  cod: "Pay on delivery",
  paid: "Paid",
  rejected: "Payment rejected",
  refunded: "Refunded",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  payhere: "Online (PayHere)",
  bank_transfer: "Bank Transfer",
  cod: "Cash on Delivery",
};

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
