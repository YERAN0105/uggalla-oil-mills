import crypto from "crypto";

// Guest order access uses a stateless HMAC token of the order number, so a guest
// can view their order via a link without an account. The signing secret is
// server-only (never NEXT_PUBLIC). SUPABASE_SERVICE_ROLE_KEY is always present.
function getSecret(): string {
  return (
    process.env.ORDER_TOKEN_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "uggalla-dev-order-secret"
  );
}

export function signOrderToken(orderNumber: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(orderNumber)
    .digest("hex")
    .slice(0, 32);
}

/** Constant-time comparison to avoid leaking validity via timing. */
export function verifyOrderToken(orderNumber: string, token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = signOrderToken(orderNumber);
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
