"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { getLoyaltySettings } from "@/lib/settings";
import { deletePublicImages } from "@/lib/admin/storage";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidate() {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
}

/** Award the configured per-review loyalty bonus once, when first approved. */
async function awardReviewBonus(db: ReturnType<typeof createAdminClient>, reviewId: string) {
  const { data: review } = await db
    .from("reviews")
    .select("user_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (!review || !(review as any).user_id) return;
  const userId = (review as any).user_id as string;

  const loyalty = await getLoyaltySettings();
  if (!loyalty.earn_enabled) return; // earning paused by admin
  const bonus = loyalty.review_bonus ?? 0;
  if (bonus <= 0) return;

  const note = `Review bonus (${reviewId})`;
  const { data: existing } = await db
    .from("loyalty_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("note", note)
    .maybeSingle();
  if (existing) return;

  const { data: profile } = await db.from("users").select("loyalty_points").eq("id", userId).maybeSingle();
  const newBalance = ((profile as any)?.loyalty_points ?? 0) + bonus;
  await db.from("users").update({ loyalty_points: newBalance }).eq("id", userId);
  await db.from("loyalty_transactions").insert({
    user_id: userId,
    type: "bonus",
    points: bonus,
    balance_after: newBalance,
    note,
  });
}

export async function setReviewStatus(
  id: string,
  status: "pending" | "approved" | "hidden"
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("reviews").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  if (status === "approved") await awardReviewBonus(db, id);
  await logActivity(admin.id, { action: "review.status", targetTable: "reviews", targetId: id, metadata: { status } });
  revalidate();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: imgs } = await db.from("review_images").select("url").eq("review_id", id);
  const { error } = await db.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await deletePublicImages(((imgs as { url: string }[]) ?? []).map((r) => r.url));
  await logActivity(admin.id, { action: "review.delete", targetTable: "reviews", targetId: id });
  revalidate();
  return { ok: true };
}

export async function replyToReview(id: string, reply: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("reviews").update({ admin_reply: reply || null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "review.reply", targetTable: "reviews", targetId: id });
  revalidate();
  return { ok: true };
}
