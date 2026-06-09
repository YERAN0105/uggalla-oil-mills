/**
 * Creates an admin user in Supabase Auth and sets role = 'admin' in public.users.
 * Usage: npm run seed-admin
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import ws from "ws";
// Node.js < 22 has no native WebSocket — polyfill before Supabase client initialises
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).WebSocket = ws;

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_SEED_EMAIL;
const password = process.env.ADMIN_SEED_PASSWORD;

if (!url || !key || !email || !password) {
  console.error(
    "Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD"
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log(`Creating admin user: ${email}`);

  // Create or retrieve auth user
  const { data: existing } = await supabase.auth.admin.listUsers();
  const existingUser = existing?.users?.find((u) => u.email === email);

  let userId: string;

  if (existingUser) {
    console.log("Auth user already exists — updating password.");
    const { error } = await supabase.auth.admin.updateUserById(existingUser.id, { password });
    if (error) throw error;
    userId = existingUser.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    userId = data.user.id;
    console.log("Auth user created.");
  }

  // Upsert into public.users with admin role
  const { error: profileError } = await supabase.from("users").upsert(
    {
      id: userId,
      name: "Admin",
      role: "admin",
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;

  console.log(`✅ Admin user ready. ID: ${userId}`);
  console.log(`   Email: ${email}`);
  console.log(`   Log in at /login`);
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
