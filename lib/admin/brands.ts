"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { brandSchema } from "@/lib/admin/schemas";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidateBrands() {
  revalidatePath("/admin/brands");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function saveBrand(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();

  const row = {
    name: d.name,
    slug: d.slug,
    description: d.description || null,
    image_url: d.image_url || null,
    display_order: d.display_order,
    is_active: d.is_active,
  };

  if (id) {
    const { error } = await db.from("brands").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await logActivity(admin.id, { action: "brand.update", targetTable: "brands", targetId: id, metadata: { name: d.name } });
    revalidateBrands();
    return { ok: true, data: { id } };
  }

  const { data, error } = await db.from("brands").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "A brand with this slug already exists." };
    return { ok: false, error: error.message };
  }
  await logActivity(admin.id, { action: "brand.create", targetTable: "brands", targetId: (data as any).id, metadata: { name: d.name } });
  revalidateBrands();
  return { ok: true, data: { id: (data as any).id } };
}

export async function deleteBrand(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("brands").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "brand.delete", targetTable: "brands", targetId: id });
  revalidateBrands();
  return { ok: true };
}

export async function reorderBrands(orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  await Promise.all(
    orderedIds.map((id, i) => db.from("brands").update({ display_order: i }).eq("id", id))
  );
  revalidateBrands();
  return { ok: true };
}

export async function toggleBrandActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("brands").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "brand.toggle_active", targetTable: "brands", targetId: id, metadata: { is_active: isActive } });
  revalidateBrands();
  return { ok: true };
}
