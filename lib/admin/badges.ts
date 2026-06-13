import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminBadgeCounts } from "@/types/admin";

/** Sidebar badge counts for items that need admin attention. */
export async function getBadgeCounts(): Promise<AdminBadgeCounts> {
  const db = createAdminClient();

  const [pendingOrders, newBulkRequests, pendingPayments, pendingReviews] = await Promise.all([
    db
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_confirmation"),
    db.from("bulk_requests").select("*", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("bank_transfer_receipts")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    db.from("reviews").select("*", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  return {
    pendingOrders: pendingOrders.count ?? 0,
    newBulkRequests: newBulkRequests.count ?? 0,
    pendingPayments: pendingPayments.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
  };
}
