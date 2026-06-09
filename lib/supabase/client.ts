import { createBrowserClient } from "@supabase/ssr";

// Type-safe client — run `supabase gen types typescript` once your project is set up
// to replace this with a fully-typed client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
