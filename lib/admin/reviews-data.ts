import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminReviewRow } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function listReviews(status?: string): Promise<AdminReviewRow[]> {
  const db = createAdminClient();
  let query = db
    .from("reviews")
    .select(
      "id, product_id, rating, title, body, status, admin_reply, created_at, product:products(name), user:users(name), review_images(url)"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (status && status !== "all") query = query.eq("status", status);

  const { data } = await query;
  return ((data as any[]) ?? []).map((r) => ({
    id: r.id,
    product_id: r.product_id,
    product_name: r.product?.name ?? "—",
    customer_name: r.user?.name ?? null,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    admin_reply: r.admin_reply,
    created_at: r.created_at,
    images: ((r.review_images as any[]) ?? []).map((i) => i.url),
  }));
}

export async function getReviewCounts(): Promise<Record<string, number>> {
  const db = createAdminClient();
  const { data } = await db.from("reviews").select("status");
  const counts: Record<string, number> = { all: 0, pending: 0, approved: 0, hidden: 0 };
  for (const r of (data as any[]) ?? []) {
    counts.all += 1;
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  }
  return counts;
}
