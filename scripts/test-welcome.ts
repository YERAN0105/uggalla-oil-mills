/**
 * Sends the real "welcome" notification to an email of your choice, without
 * creating an account. Useful for previewing the welcome email during dev.
 *
 * Usage:
 *   npm run test-welcome you@youremail.com
 *   npm run test-welcome you@youremail.com "Your Name"
 *
 * Requires (in .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * RESEND_API_KEY, RESEND_FROM_EMAIL.
 *
 * Note: in Resend test mode (no verified domain) the email can only be delivered
 * to the address you registered your Resend account with.
 */

import * as dotenv from "dotenv";
import * as path from "path";
import ws from "ws";
// Node < 22 has no native WebSocket — polyfill before the Supabase client loads.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = ws;

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function main() {
  const email = process.argv[2];
  const name = process.argv[3] ?? "there";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Usage: npm run test-welcome you@youremail.com ["Your Name"]');
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error(
      "⚠  RESEND_API_KEY is not set in .env.local — email is switched off, so nothing will send."
    );
    process.exit(1);
  }

  // Imported after dotenv so the env vars are already loaded.
  const { sendWelcome } = await import("../lib/notifications/transactional");

  console.log(`Sending welcome email to ${email} ...`);
  await sendWelcome({ name, email, phone: null });
  console.log("✓ Done. Check that inbox (and your spam folder).");
  console.log(
    "If nothing arrives: in Resend test mode the address must match your Resend account email."
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
