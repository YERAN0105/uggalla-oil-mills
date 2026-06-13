import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminBrand,
  AdminCategory,
  AdminProductRow,
  AdminProductDetail,
} from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Product counts keyed by brand_id / category_id (excludes soft-deleted). */
async function productCounts(): Promise<{ byBrand: Map<string, number>; byCategory: Map<string, number> }> {
  const db = createAdminClient();
  const { data } = await db.from("products").select("brand_id, category_id").is("deleted_at", null);
  const byBrand = new Map<string, number>();
  const byCategory = new Map<string, number>();
  for (const p of (data as any[]) ?? []) {
    if (p.brand_id) byBrand.set(p.brand_id, (byBrand.get(p.brand_id) ?? 0) + 1);
    if (p.category_id) byCategory.set(p.category_id, (byCategory.get(p.category_id) ?? 0) + 1);
  }
  return { byBrand, byCategory };
}

export async function listBrands(): Promise<AdminBrand[]> {
  const db = createAdminClient();
  const [{ data }, counts] = await Promise.all([
    db.from("brands").select("*").order("display_order", { ascending: true }),
    productCounts(),
  ]);
  return ((data as any[]) ?? []).map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    description: b.description,
    image_url: b.image_url,
    display_order: b.display_order,
    is_active: b.is_active,
    product_count: counts.byBrand.get(b.id) ?? 0,
  }));
}

export async function listCategories(): Promise<AdminCategory[]> {
  const db = createAdminClient();
  const [{ data }, counts] = await Promise.all([
    db.from("categories").select("*").order("display_order", { ascending: true }),
    productCounts(),
  ]);
  return ((data as any[]) ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    description: c.description,
    image_url: c.image_url,
    display_order: c.display_order,
    is_active: c.is_active,
    is_bulk: c.is_bulk,
    product_count: counts.byCategory.get(c.id) ?? 0,
  }));
}

/** Brand + category options for product / coupon selects. */
export async function getCatalogOptions(): Promise<{
  brands: { id: string; name: string }[];
  categories: { id: string; name: string; is_bulk: boolean }[];
}> {
  const db = createAdminClient();
  const [{ data: brands }, { data: categories }] = await Promise.all([
    db.from("brands").select("id, name").order("display_order"),
    db.from("categories").select("id, name, is_bulk").order("display_order"),
  ]);
  return {
    brands: ((brands as any[]) ?? []).map((b) => ({ id: b.id, name: b.name })),
    categories: ((categories as any[]) ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      is_bulk: c.is_bulk,
    })),
  };
}

/** Lightweight product list (id + name) for coupon "applies to" pickers. */
export async function getProductOptions(): Promise<{ id: string; name: string }[]> {
  const db = createAdminClient();
  const { data } = await db
    .from("products")
    .select("id, name")
    .is("deleted_at", null)
    .order("name", { ascending: true });
  return ((data as any[]) ?? []).map((p) => ({ id: p.id, name: p.name }));
}

export interface ProductListParams {
  search?: string;
  brand?: string;
  category?: string;
  purchaseType?: string;
  published?: string;
  featured?: string;
  lowStock?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export async function listProducts(
  params: ProductListParams
): Promise<{ rows: AdminProductRow[]; total: number }> {
  const db = createAdminClient();
  const perPage = params.perPage ?? 20;
  const page = Math.max(1, params.page ?? 1);

  let query = db
    .from("products")
    .select("*, brand:brands(name), category:categories(name)", { count: "exact" })
    .is("deleted_at", null);

  if (params.search) query = query.ilike("name", `%${params.search}%`);
  if (params.brand) query = query.eq("brand_id", params.brand);
  if (params.category) query = query.eq("category_id", params.category);
  if (params.purchaseType) query = query.eq("purchase_type", params.purchaseType);
  if (params.published === "1") query = query.eq("is_published", true);
  if (params.published === "0") query = query.eq("is_published", false);
  if (params.featured === "1") query = query.eq("is_featured", true);

  // Sorting
  switch (params.sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "price":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "updated":
      query = query.order("updated_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query.range((page - 1) * perPage, page * perPage - 1);

  const { data, count } = await query;
  let rows = (data as any[]) ?? [];

  // Low-stock filter is computed (threshold varies per row), so apply post-fetch.
  if (params.lowStock === "1") {
    rows = rows.filter(
      (p) => p.stock_tracked && Number(p.stock_quantity) <= Number(p.low_stock_threshold)
    );
  }

  // Primary images for the page of rows.
  const ids = rows.map((p) => p.id);
  const imgMap = new Map<string, string>();
  if (ids.length) {
    const { data: imgs } = await db
      .from("product_images")
      .select("product_id, url, is_primary, display_order")
      .in("product_id", ids)
      .order("is_primary", { ascending: false })
      .order("display_order", { ascending: true });
    for (const im of (imgs as any[]) ?? []) {
      if (!imgMap.has(im.product_id)) imgMap.set(im.product_id, im.url);
    }
  }

  return {
    rows: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand_name: p.brand?.name ?? null,
      category_name: p.category?.name ?? null,
      base_price: Number(p.base_price) || 0,
      purchase_type: p.purchase_type,
      stock_tracked: p.stock_tracked,
      stock_quantity: p.stock_quantity,
      low_stock_threshold: p.low_stock_threshold,
      is_published: p.is_published,
      is_featured: p.is_featured,
      primary_image: imgMap.get(p.id) ?? null,
      deleted_at: p.deleted_at,
    })),
    total: count ?? rows.length,
  };
}

export async function getProductDetail(id: string): Promise<AdminProductDetail | null> {
  const db = createAdminClient();
  const { data: p } = await db.from("products").select("*").eq("id", id).maybeSingle();
  if (!p) return null;

  const [{ data: images }, { data: sizes }] = await Promise.all([
    db
      .from("product_images")
      .select("id, url, alt_text, display_order, is_primary")
      .eq("product_id", id)
      .order("display_order", { ascending: true }),
    db
      .from("product_sizes")
      .select("id, label, volume_ml, price, display_order")
      .eq("product_id", id)
      .order("display_order", { ascending: true }),
  ]);

  const row = p as any;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand_id: row.brand_id,
    category_id: row.category_id,
    short_description: row.short_description,
    description: row.description,
    key_facts: Array.isArray(row.key_facts) ? row.key_facts : [],
    base_price: Number(row.base_price) || 0,
    purchase_type: row.purchase_type,
    allows_subscription: row.allows_subscription,
    allows_note: row.allows_note,
    note_max_chars: row.note_max_chars,
    is_published: row.is_published,
    is_featured: row.is_featured,
    is_bestseller: row.is_bestseller,
    stock_tracked: row.stock_tracked,
    stock_quantity: row.stock_quantity,
    low_stock_threshold: row.low_stock_threshold,
    meta_title: row.meta_title,
    meta_description: row.meta_description,
    images: ((images as any[]) ?? []).map((im) => ({
      id: im.id,
      url: im.url,
      alt_text: im.alt_text,
      display_order: im.display_order,
      is_primary: im.is_primary,
    })),
    sizes: ((sizes as any[]) ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      volume_ml: s.volume_ml,
      price: Number(s.price) || 0,
      display_order: s.display_order,
    })),
  };
}
