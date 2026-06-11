import crypto from "crypto";
import { brand } from "@/lib/brand";

// ─────────────────────────────────────────────────────────────────────────────
// PayHere (https://www.payhere.lk/developers/) — built in full so it works the
// moment PAYHERE_MERCHANT_ID + PAYHERE_MERCHANT_SECRET are added to the env.
// Until then `isPayHereEnabled` is false and checkout never offers this method,
// but none of this code throws when the keys are blank.
// ─────────────────────────────────────────────────────────────────────────────

export const PAYHERE_CHECKOUT_URL_SANDBOX = "https://sandbox.payhere.lk/pay/checkout";
export const PAYHERE_CHECKOUT_URL_LIVE = "https://www.payhere.lk/pay/checkout";

export function getCheckoutUrl(): string {
  return process.env.PAYHERE_MODE === "live"
    ? PAYHERE_CHECKOUT_URL_LIVE
    : PAYHERE_CHECKOUT_URL_SANDBOX;
}

/** PayHere requires amounts as a plain string with exactly 2 decimals, no commas. */
export function formatPayHereAmount(amount: number): string {
  return amount.toFixed(2);
}

function md5(input: string): string {
  return crypto.createHash("md5").update(input).digest("hex");
}

export interface PayHereOrderInput {
  orderNumber: string;
  amount: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  itemsLabel: string;
}

export interface PayHereCheckoutParams {
  sandbox: boolean;
  merchant_id: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  order_id: string;
  items: string;
  currency: string;
  amount: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  hash: string;
  checkoutUrl: string;
}

/**
 * Build the hidden-form fields for PayHere's hosted checkout, including the
 * MD5 `hash` per the PayHere spec:
 *   hash = strtoupper(md5(merchant_id + order_id + amount + currency +
 *            strtoupper(md5(merchant_secret))))
 */
export function generateCheckoutParams(order: PayHereOrderInput): PayHereCheckoutParams {
  const merchantId = process.env.PAYHERE_MERCHANT_ID ?? "";
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const currency = brand.currency; // "LKR"
  const amount = formatPayHereAmount(order.amount);

  const hashedSecret = md5(merchantSecret).toUpperCase();
  const hash = md5(merchantId + order.orderNumber + amount + currency + hashedSecret).toUpperCase();

  return {
    sandbox: process.env.PAYHERE_MODE !== "live",
    merchant_id: merchantId,
    return_url: process.env.PAYHERE_RETURN_URL || `${appUrl}/order-success/${order.orderNumber}`,
    cancel_url: process.env.PAYHERE_CANCEL_URL || `${appUrl}/checkout/failed/${order.orderNumber}`,
    notify_url: process.env.PAYHERE_NOTIFY_URL || `${appUrl}/api/payments/payhere/webhook`,
    order_id: order.orderNumber,
    items: order.itemsLabel,
    currency,
    amount,
    first_name: order.firstName,
    last_name: order.lastName,
    email: order.email,
    phone: order.phone,
    address: order.address,
    city: order.city,
    country: "Sri Lanka",
    hash,
    checkoutUrl: getCheckoutUrl(),
  };
}

export interface PayHereNotification {
  merchant_id: string;
  order_id: string;
  payment_id: string;
  payhere_amount: string;
  payhere_currency: string;
  status_code: string;
  md5sig: string;
  [key: string]: string;
}

/**
 * Verify a webhook payload's signature:
 *   local_sig = strtoupper(md5(merchant_id + order_id + payhere_amount +
 *     payhere_currency + status_code + strtoupper(md5(merchant_secret))))
 */
export function verifyNotification(payload: PayHereNotification): boolean {
  const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET ?? "";
  if (!merchantSecret || !payload.md5sig) return false;
  const hashedSecret = md5(merchantSecret).toUpperCase();
  const local = md5(
    payload.merchant_id +
      payload.order_id +
      payload.payhere_amount +
      payload.payhere_currency +
      payload.status_code +
      hashedSecret
  ).toUpperCase();
  return local === payload.md5sig.toUpperCase();
}

export type PayHerePaymentOutcome = "paid" | "pending" | "cancelled" | "failed" | "chargedback";

/** Map PayHere `status_code` to our internal outcome. */
export function mapPayHereStatus(statusCode: string): PayHerePaymentOutcome {
  switch (statusCode) {
    case "2":
      return "paid";
    case "0":
      return "pending";
    case "-1":
      return "cancelled";
    case "-3":
      return "chargedback";
    case "-2":
    default:
      return "failed";
  }
}

/** Split a full name into PayHere's first/last fields. */
export function splitName(full: string): { firstName: string; lastName: string } {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0] || "Customer", lastName: "." };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}
