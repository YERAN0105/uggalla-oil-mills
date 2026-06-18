// Notification catalog — plain data, no server imports, so both the admin client
// UI and server code can import it. Describes the customer-facing notification
// events for the admin Notifications settings (per-event enable/disable + the
// read-only WhatsApp template reference).

export interface NotificationEventInfo {
  /** Stored key in the `notifications.events` settings map. */
  key: string;
  label: string;
  description: string;
  /** WhatsApp template name + ordered variables (immutable, set in Meta). */
  whatsappTemplate: string;
  whatsappVars: string[];
  /**
   * Transactional events are dispatched via lib/notifications/transactional.ts and
   * honour the per-event toggle. Order-status events flow through the debounced
   * dispatcher and follow the master Email/WhatsApp integration toggles instead.
   */
  group: "transactional" | "order_status";
}

export const NOTIFICATION_EVENTS: NotificationEventInfo[] = [
  {
    key: "welcome",
    label: "Welcome (signup)",
    description: "Sent when a customer creates an account.",
    whatsappTemplate: "welcome",
    whatsappVars: ["name"],
    group: "transactional",
  },
  {
    key: "bulk_request_received",
    label: "Bulk request received",
    description: "Acknowledgement to the customer when a quote request is submitted.",
    whatsappTemplate: "bulk_request_received",
    whatsappVars: ["name"],
    group: "transactional",
  },
  {
    key: "bulk_quote_sent",
    label: "Bulk quote sent",
    description: "The quote, with a pay-online link for online quotes.",
    whatsappTemplate: "bulk_quote_sent",
    whatsappVars: ["name", "product", "quantity", "quoted_total", "message", "payment_link"],
    group: "transactional",
  },
  {
    key: "subscription_reminder",
    label: "Subscription reminder",
    description: "Daily reorder reminder with a one-tap reorder link.",
    whatsappTemplate: "subscription_reminder",
    whatsappVars: ["name", "product", "reorder_link"],
    group: "transactional",
  },
  {
    key: "review_request",
    label: "Review request",
    description: "Sent 2 days after an order is delivered.",
    whatsappTemplate: "review_request",
    whatsappVars: ["name", "order_number"],
    group: "transactional",
  },
  {
    key: "order_placed",
    label: "Order placed",
    description: "Immediate confirmation at checkout.",
    whatsappTemplate: "order_confirmation",
    whatsappVars: ["name", "order_number", "total", "delivery_date"],
    group: "order_status",
  },
  {
    key: "order_status_updates",
    label: "Order status updates",
    description: "Confirmed, preparing, out for delivery, ready for pickup, delivered, cancelled, refunded (debounced).",
    whatsappTemplate: "order_confirmed / order_preparation / out_for_delivery / …",
    whatsappVars: ["name", "order_number"],
    group: "order_status",
  },
  {
    key: "bank_receipt",
    label: "Bank receipt decision",
    description: "Bank transfer approved or rejected (debounced).",
    whatsappTemplate: "payment_received / bank_receipt_rejected",
    whatsappVars: ["name", "order_number", "reason"],
    group: "order_status",
  },
];
