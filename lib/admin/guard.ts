import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/types/admin";

/**
 * The signed-in admin (auth user + profile) or null. Uses the service-role
 * client to read the role so it works regardless of RLS context. Mirrors the
 * `getAccountUser()` pattern used on the storefront.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("name, role, blocked")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin" || profile.blocked) return null;

  return { id: user.id, name: profile.name ?? null, email: user.email ?? "" };
}

/**
 * Server-side admin guard for pages and actions. Middleware already blocks
 * /admin/* for non-admins; this is defense in depth and gives actions the
 * acting admin's id for activity logging.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/login?redirect=/admin");
  return user;
}
