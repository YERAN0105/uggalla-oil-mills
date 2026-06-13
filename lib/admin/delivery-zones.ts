"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { deliveryZoneSchema } from "@/lib/admin/schemas";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidate() {
  revalidatePath("/admin/delivery-zones");
  revalidatePath("/checkout");
}

export async function saveZone(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = deliveryZoneSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();
  const row = {
    name: d.name,
    fee: d.fee,
    estimated_time: d.estimated_time || null,
    min_order_amount: d.min_order_amount ?? null,
    same_day_surcharge: d.same_day_surcharge ?? null,
    is_active: d.is_active,
  };

  if (id) {
    const { error } = await db.from("delivery_zones").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await logActivity(admin.id, { action: "zone.update", targetTable: "delivery_zones", targetId: id });
    revalidate();
    return { ok: true, data: { id } };
  }
  const { data, error } = await db.from("delivery_zones").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "zone.create", targetTable: "delivery_zones", targetId: (data as any).id });
  revalidate();
  return { ok: true, data: { id: (data as any).id } };
}

export async function deleteZone(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("delivery_zones").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "zone.delete", targetTable: "delivery_zones", targetId: id });
  revalidate();
  return { ok: true };
}

export async function toggleZoneActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("delivery_zones").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "zone.toggle", targetTable: "delivery_zones", targetId: id });
  revalidate();
  return { ok: true };
}
