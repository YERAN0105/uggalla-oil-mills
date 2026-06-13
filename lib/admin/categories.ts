"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { categorySchema } from "@/lib/admin/schemas";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidateCategories() {
  revalidatePath("/admin/categories");
  revalidatePath("/");
  revalidatePath("/shop");
}

export async function saveCategory(
  input: unknown,
  id?: string
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = categorySchema.safeParse(input);
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
    is_bulk: d.is_bulk,
  };

  if (id) {
    const { error } = await db.from("categories").update(row).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await logActivity(admin.id, { action: "category.update", targetTable: "categories", targetId: id, metadata: { name: d.name } });
    revalidateCategories();
    return { ok: true, data: { id } };
  }

  const { data, error } = await db.from("categories").insert(row).select("id").single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "A category with this slug already exists." };
    return { ok: false, error: error.message };
  }
  await logActivity(admin.id, { action: "category.create", targetTable: "categories", targetId: (data as any).id, metadata: { name: d.name } });
  revalidateCategories();
  return { ok: true, data: { id: (data as any).id } };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  // Categories are required on products (NOT NULL FK), so block delete if in use.
  const { count } = await db
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("category_id", id)
    .is("deleted_at", null);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "Reassign or remove its products before deleting this category." };
  }
  const { error } = await db.from("categories").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "category.delete", targetTable: "categories", targetId: id });
  revalidateCategories();
  return { ok: true };
}

export async function reorderCategories(orderedIds: string[]): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  await Promise.all(
    orderedIds.map((id, i) => db.from("categories").update({ display_order: i }).eq("id", id))
  );
  revalidateCategories();
  return { ok: true };
}

export async function toggleCategoryActive(id: string, isActive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("categories").update({ is_active: isActive }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "category.toggle_active", targetTable: "categories", targetId: id, metadata: { is_active: isActive } });
  revalidateCategories();
  return { ok: true };
}
