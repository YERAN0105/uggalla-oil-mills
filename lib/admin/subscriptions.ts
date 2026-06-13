"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { formatInColombo, nowInColombo } from "@/lib/date";
import { addDays } from "date-fns";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

const INTERVAL_DAYS: Record<string, number> = { weekly: 7, biweekly: 14, monthly: 30 };

function revalidate() {
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin");
}

export async function setSubscriptionStatus(
  id: string,
  status: "active" | "paused" | "cancelled"
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("subscriptions").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "subscription.status", targetTable: "subscriptions", targetId: id, metadata: { status } });
  revalidate();
  return { ok: true };
}

export async function setNextReminderDate(id: string, date: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Invalid date." };
  const db = createAdminClient();
  const { error } = await db.from("subscriptions").update({ next_reminder_date: date }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "subscription.reschedule", targetTable: "subscriptions", targetId: id, metadata: { date } });
  revalidate();
  return { ok: true };
}

/**
 * Manually "send" a reminder: records last_reminder_at and advances the next
 * reminder date by the interval. The actual email/WhatsApp send lands in Phase 6.
 */
export async function triggerReminder(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: sub } = await db
    .from("subscriptions")
    .select("interval, next_reminder_date")
    .eq("id", id)
    .maybeSingle();
  if (!sub) return { ok: false, error: "Subscription not found." };

  const days = INTERVAL_DAYS[(sub as any).interval] ?? 30;
  const base = (sub as any).next_reminder_date
    ? new Date((sub as any).next_reminder_date)
    : nowInColombo();
  const next = formatInColombo(addDays(base, days), "yyyy-MM-dd");

  const { error } = await db
    .from("subscriptions")
    .update({ last_reminder_at: new Date().toISOString(), next_reminder_date: next })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  await logActivity(admin.id, { action: "subscription.reminder", targetTable: "subscriptions", targetId: id });
  revalidate();
  // TODO (Phase 6): send the reorder reminder email + WhatsApp here.
  return { ok: true };
}
