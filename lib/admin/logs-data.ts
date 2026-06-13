import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminActivityLog } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LogParams {
  action?: string;
  admin?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
}

const PER_PAGE = 50;

export async function listActivityLogs(
  params: LogParams
): Promise<{ rows: AdminActivityLog[]; total: number; admins: { id: string; name: string }[]; actions: string[] }> {
  const db = createAdminClient();
  const page = Math.max(1, params.page ?? 1);

  let query = db
    .from("activity_logs")
    .select("*, user:users(name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.action) query = query.eq("action", params.action);
  if (params.admin) query = query.eq("user_id", params.admin);
  if (params.dateFrom) query = query.gte("created_at", params.dateFrom);
  if (params.dateTo) query = query.lte("created_at", `${params.dateTo}T23:59:59`);

  query = query.range((page - 1) * PER_PAGE, page * PER_PAGE - 1);

  const { data, count } = await query;
  const rows: AdminActivityLog[] = ((data as any[]) ?? []).map((l) => ({
    id: l.id,
    user_id: l.user_id,
    admin_name: l.user?.name ?? null,
    action: l.action,
    target_table: l.target_table,
    target_id: l.target_id,
    metadata: l.metadata,
    created_at: l.created_at,
  }));

  // Distinct admins + actions for filters (best-effort from recent rows).
  const [{ data: adminRows }, { data: actionRows }] = await Promise.all([
    db.from("users").select("id, name").eq("role", "admin"),
    db.from("activity_logs").select("action").limit(1000),
  ]);
  const admins = ((adminRows as any[]) ?? []).map((a) => ({ id: a.id, name: a.name ?? "Admin" }));
  const actions = [...new Set(((actionRows as any[]) ?? []).map((a) => a.action))].sort();

  return { rows, total: count ?? rows.length, admins, actions };
}

export { PER_PAGE as LOGS_PER_PAGE };
