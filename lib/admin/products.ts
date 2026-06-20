"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { productSchema } from "@/lib/admin/schemas";
import { deletePublicImages } from "@/lib/admin/storage";
import { slugify } from "@/lib/utils";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Remove product-image files from storage, but only those no longer referenced
 * by ANY remaining product_images row. A duplicated product shares the same file
 * (duplicateProduct copies the url), so we must not delete a file the copy still
 * uses. Call AFTER the rows are deleted. Best-effort.
 */
async function cleanupOrphanProductImages(
  db: ReturnType<typeof createAdminClient>,
  urls: (string | null | undefined)[]
): Promise<void> {
  const unique = [...new Set(urls.filter((u): u is string => !!u))];
  if (unique.length === 0) return;
  const { data: stillUsed } = await db.from("product_images").select("url").in("url", unique);
  const used = new Set(((stillUsed as { url: string }[]) ?? []).map((r) => r.url));
  await deletePublicImages(unique.filter((u) => !used.has(u)));
}

function revalidateProducts(slug?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  revalidatePath("/");
  if (slug) revalidatePath(`/shop/${slug}`);
}

/**
 * Create or update a product plus its sizes. `base_price` is trigger-managed for
 * sized (retail) products — never set by hand — and used directly for bulk
 * products (which have no sizes). Images are managed by separate actions.
 */
export async function saveProduct(input: unknown, id?: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();

  const baseRow = {
    name: d.name,
    slug: d.slug,
    brand_id: d.brand_id || null,
    category_id: d.category_id,
    short_description: d.short_description || null,
    description: d.description || null,
    key_facts: d.key_facts,
    purchase_type: d.purchase_type,
    allows_subscription: d.purchase_type === "retail" ? d.allows_subscription : false,
    allows_note: d.allows_note,
    note_max_chars: d.note_max_chars,
    stock_tracked: d.stock_tracked,
    stock_quantity: d.stock_tracked ? d.stock_quantity : 0,
    low_stock_threshold: d.low_stock_threshold,
    is_published: d.is_published,
    is_featured: d.is_featured,
    is_bestseller: d.is_bestseller,
    meta_title: d.meta_title || null,
    meta_description: d.meta_description || null,
  };

  let productId = id;

  if (id) {
    const { error } = await db.from("products").update(baseRow).eq("id", id);
    if (error) {
      if (error.code === "23505") return { ok: false, error: "A product with this slug already exists." };
      return { ok: false, error: error.message };
    }
  } else {
    const { data, error } = await db
      .from("products")
      .insert({ ...baseRow, base_price: d.purchase_type === "bulk_quote" ? d.base_price : 0 })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") return { ok: false, error: "A product with this slug already exists." };
      return { ok: false, error: error.message };
    }
    productId = (data as any).id;
  }

  if (!productId) return { ok: false, error: "Could not save product." };

  // Replace sizes (retail). The base_price trigger keeps base_price in sync.
  await db.from("product_sizes").delete().eq("product_id", productId);
  if (d.purchase_type === "retail" && d.sizes.length > 0) {
    const sizeRows = d.sizes.map((s, i) => ({
      product_id: productId,
      label: s.label,
      volume_ml: s.volume_ml ?? null,
      price: s.price,
      display_order: i,
    }));
    const { error: sizeErr } = await db.from("product_sizes").insert(sizeRows);
    if (sizeErr) return { ok: false, error: sizeErr.message };
  } else if (d.purchase_type === "bulk_quote") {
    // Bulk: no sizes; base_price is the indicative price (trigger won't fire).
    await db.from("products").update({ base_price: d.base_price }).eq("id", productId);
  }

  await logActivity(admin.id, {
    action: id ? "product.update" : "product.create",
    targetTable: "products",
    targetId: productId,
    metadata: { name: d.name },
  });
  revalidateProducts(d.slug);
  return { ok: true, data: { id: productId } };
}

/** Delete a product: soft-delete if it has order references, else hard delete. */
export async function deleteProduct(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();

  const { count } = await db
    .from("order_items")
    .select("*", { count: "exact", head: true })
    .eq("product_id", id);

  if ((count ?? 0) > 0) {
    const { error } = await db
      .from("products")
      .update({ is_published: false, deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { ok: false, error: error.message };
    await logActivity(admin.id, { action: "product.soft_delete", targetTable: "products", targetId: id });
  } else {
    // Hard delete — grab image URLs first (cascade removes product_images rows),
    // then clean up any files no longer referenced by another product.
    const { data: imgs } = await db.from("product_images").select("url").eq("product_id", id);
    const urls = ((imgs as { url: string }[]) ?? []).map((r) => r.url);
    const { error } = await db.from("products").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    await cleanupOrphanProductImages(db, urls);
    await logActivity(admin.id, { action: "product.delete", targetTable: "products", targetId: id });
  }
  revalidateProducts();
  return { ok: true };
}

/** Duplicate a product (and its sizes + images) as an unpublished draft. */
export async function duplicateProduct(id: string): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin();
  const db = createAdminClient();

  const { data: p } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (!p) return { ok: false, error: "Product not found." };
  const src = p as any;

  const newSlug = `${src.slug}-copy-${Math.random().toString(36).slice(2, 6)}`;
  const { data: created, error } = await db
    .from("products")
    .insert({
      name: `${src.name} (Copy)`,
      slug: newSlug,
      brand_id: src.brand_id,
      category_id: src.category_id,
      short_description: src.short_description,
      description: src.description,
      key_facts: src.key_facts,
      purchase_type: src.purchase_type,
      base_price: src.purchase_type === "bulk_quote" ? src.base_price : 0,
      allows_subscription: src.allows_subscription,
      allows_note: src.allows_note,
      note_max_chars: src.note_max_chars,
      stock_tracked: src.stock_tracked,
      stock_quantity: src.stock_quantity,
      low_stock_threshold: src.low_stock_threshold,
      is_published: false,
      is_featured: false,
      is_bestseller: src.is_bestseller,
      meta_title: src.meta_title,
      meta_description: src.meta_description,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  const newId = (created as any).id;

  const { data: sizes } = await db.from("product_sizes").select("*").eq("product_id", id);
  for (const s of (sizes as any[]) ?? []) {
    await db.from("product_sizes").insert({
      product_id: newId,
      label: s.label,
      volume_ml: s.volume_ml,
      price: s.price,
      display_order: s.display_order,
    });
  }
  const { data: imgs } = await db.from("product_images").select("*").eq("product_id", id);
  for (const im of (imgs as any[]) ?? []) {
    await db.from("product_images").insert({
      product_id: newId,
      url: im.url,
      alt_text: im.alt_text,
      display_order: im.display_order,
      is_primary: im.is_primary,
    });
  }

  await logActivity(admin.id, { action: "product.duplicate", targetTable: "products", targetId: newId, metadata: { from: id } });
  revalidateProducts();
  return { ok: true, data: { id: newId } };
}

export async function bulkProductAction(
  ids: string[],
  action: "publish" | "unpublish" | "feature" | "unfeature" | "delete"
): Promise<ActionResult<{ count: number }>> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  if (ids.length === 0) return { ok: false, error: "No products selected." };

  if (action === "delete") {
    let count = 0;
    for (const id of ids) {
      const res = await deleteProduct(id);
      if (res.ok) count += 1;
    }
    return { ok: true, data: { count } };
  }

  const update =
    action === "publish"
      ? { is_published: true }
      : action === "unpublish"
        ? { is_published: false }
        : action === "feature"
          ? { is_featured: true }
          : { is_featured: false };

  const { error } = await db.from("products").update(update).in("id", ids);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: `product.bulk_${action}`, targetTable: "products", metadata: { ids } });
  revalidateProducts();
  return { ok: true, data: { count: ids.length } };
}

export async function toggleProductPublished(id: string, value: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  // Require at least one size before publishing a retail product.
  if (value) {
    const { data: p } = await db.from("products").select("purchase_type").eq("id", id).maybeSingle();
    if ((p as any)?.purchase_type === "retail") {
      const { count } = await db
        .from("product_sizes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", id);
      if ((count ?? 0) === 0) return { ok: false, error: "Add at least one size before publishing." };
    }
  }
  const { error } = await db.from("products").update({ is_published: value }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "product.toggle_published", targetTable: "products", targetId: id, metadata: { value } });
  revalidateProducts();
  return { ok: true };
}

// ─── Images ──────────────────────────────────────────────────────────────────

export async function addProductImages(
  productId: string,
  urls: string[]
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { data: existing } = await db
    .from("product_images")
    .select("id, display_order")
    .eq("product_id", productId);
  const list = (existing as any[]) ?? [];
  let order = list.length;
  const hasPrimary = list.length > 0;

  const rows = urls.map((url, i) => ({
    product_id: productId,
    url,
    alt_text: null,
    display_order: order++,
    is_primary: !hasPrimary && i === 0,
  }));
  const { error } = await db.from("product_images").insert(rows);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "product.images_added", targetTable: "products", targetId: productId, metadata: { count: urls.length } });
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}

export async function deleteProductImage(imageId: string, productId: string): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { data: img } = await db
    .from("product_images")
    .select("is_primary, url")
    .eq("id", imageId)
    .maybeSingle();
  const { error } = await db.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: error.message };

  // Remove the file unless another product (a duplicate) still references it.
  await cleanupOrphanProductImages(db, [(img as any)?.url]);

  // If we removed the primary, promote the first remaining image.
  if ((img as any)?.is_primary) {
    const { data: next } = await db
      .from("product_images")
      .select("id")
      .eq("product_id", productId)
      .order("display_order", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) await db.from("product_images").update({ is_primary: true }).eq("id", (next as any).id);
  }
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}

export async function reorderProductImages(
  productId: string,
  orderedIds: string[]
): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  await Promise.all(
    orderedIds.map((id, i) => db.from("product_images").update({ display_order: i }).eq("id", id))
  );
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}

export async function setPrimaryImage(imageId: string, productId: string): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  await db.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  const { error } = await db.from("product_images").update({ is_primary: true }).eq("id", imageId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}

export async function updateImageAlt(imageId: string, alt: string, productId: string): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("product_images").update({ alt_text: alt || null }).eq("id", imageId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/admin/products/${productId}/edit`);
  return { ok: true };
}

/** Slug availability helper used by the create form. */
export async function suggestSlug(name: string): Promise<string> {
  await requireAdmin();
  return slugify(name);
}
