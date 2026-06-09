/**
 * Feature flags for optional integrations.
 * Only Supabase env vars are required — all others are optional.
 * Add the missing env vars to .env.local and restart the dev server to enable a feature.
 */

export const isResendEnabled = Boolean(process.env.RESEND_API_KEY);

export const isGoogleAuthEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

export const isPayHereEnabled = Boolean(
  process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET
);

export const isWhatsAppEnabled = Boolean(
  process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN
);

/**
 * Call this at startup (e.g., in middleware or server layout) to fail loudly
 * if required Supabase env vars are missing.
 */
export function assertRequiredEnv() {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}.\n` +
        `Copy .env.example to .env.local and fill in your Supabase credentials.`
    );
  }
}
