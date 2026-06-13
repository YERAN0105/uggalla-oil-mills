import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Write an audit-trail row. Fire-and-forget: failures are logged, never thrown,
 * so a logging hiccup can't break the action that triggered it. Pass the acting
 * admin's id (from `requireAdmin()`) to avoid a second auth round-trip.
 */
export async function logActivity(
  adminId: string | null,
  entry: {
    action: string;
    targetTable?: string;
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("activity_logs").insert({
      user_id: adminId,
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (e) {
    console.error("[activity_logs] insert failed:", e);
  }
}
