"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { timeSlotSchema, holidaySchema } from "@/lib/admin/schemas";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LeadTimes {
  global_hours: number;
  per_category: Record<string, number>;
}

function revalidate() {
  revalidatePath("/admin/schedule");
  revalidatePath("/checkout");
}

export async function saveTimeSlot(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = timeSlotSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();
  const row = {
    label: d.label,
    start_time: d.start_time,
    end_time: d.end_time,
    capacity: d.capacity,
    is_active: d.is_active,
  };
  if (id) {
    const { error } = await db.from("time_slots").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await logActivity(admin.id, { action: "slot.update", targetTable: "time_slots", targetId: id });
    revalidate();
    return { ok: true, data: { id } };
  }
  const { data, error } = await db.from("time_slots").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "slot.create", targetTable: "time_slots", targetId: (data as any).id });
  revalidate();
  return { ok: true, data: { id: (data as any).id } };
}

export async function deleteTimeSlot(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("time_slots").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "slot.delete", targetTable: "time_slots", targetId: id });
  revalidate();
  return { ok: true };
}

export async function toggleSlotActive(id: string, isActive: boolean): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("time_slots").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidate();
  return { ok: true };
}

export async function addHoliday(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  const parsed = holidaySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const db = createAdminClient();
  const { error } = await db
    .from("holidays")
    .insert({ date: parsed.data.date, label: parsed.data.label || null });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That date is already a holiday." };
    return { ok: false, error: error.message };
  }
  await logActivity(admin.id, { action: "holiday.add", targetTable: "holidays", metadata: { date: parsed.data.date } });
  revalidate();
  return { ok: true };
}

export async function deleteHoliday(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("holidays").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "holiday.delete", targetTable: "holidays", targetId: id });
  revalidate();
  return { ok: true };
}

export async function saveLeadTimes(leadTimes: LeadTimes): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("settings")
    .upsert({ key: "lead_times", value: leadTimes }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "settings.lead_times", targetTable: "settings" });
  revalidate();
  return { ok: true };
}
