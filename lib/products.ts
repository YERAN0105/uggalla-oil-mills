import { createClient } from "@/lib/supabase/server";
import type { ProductWithRelations, Brand, Category } from "@/types/supabase";

export type SortOption = "newest" | "price_asc" | "price_desc" | "popularity";

export interface ProductFilters {
  categories?: string[];  // category slugs
  brands?: string[];      // brand slugs
  sizes?: string[];       // size labels (e.g. "500ml", "1L")
  priceMin?: number;
  priceMax?: number;
  sort?: SortOption;
  query?: string;
  page?: number;
  pageSize?: number;
  featured?: boolean;
  bestseller?: boolean;
  purchaseType?: "retail" | "bulk_quote";
}

export interface ProductsResult {
  products: ProductWithRelations[];
  totalCount: number;
}

const PRODUCT_SELECT = `
  id, slug, name, short_description, description, key_facts,
  base_price, purchase_type, allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description, created_at,
  brands:brand_id(id, name, slug),
  categories:category_id(id, name, slug, is_bulk),
  product_images(id, url, alt_text, is_primary, display_order),
  product_sizes(id, label, volume_ml, price, display_order)
`;

export async function getProducts(filters: ProductFilters = {}): Promise<ProductsResult> {
  const supabase = await createClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 12;
  const offset = (page - 1) * pageSize;

  // Resolve category IDs from slugs
  let categoryIds: string[] | undefined;
  if (filters.categories?.length) {
    const { data } = await supabase
      .from("categories")
      .select("id")
      .in("slug", filters.categories);
    categoryIds = data?.map((c) => c.id) ?? [];
    if (categoryIds.length === 0) return { products: [], totalCount: 0 };
  }

  // Resolve brand IDs from slugs
  let brandIds: string[] | undefined;
  if (filters.brands?.length) {
    const { data } = await supabase
      .from("brands")
      .select("id")
      .in("slug", filters.brands);
    brandIds = data?.map((b) => b.id) ?? [];
    if (brandIds.length === 0) return { products: [], totalCount: 0 };
  }

  // Resolve product IDs matching size labels
  let sizeFilteredIds: string[] | undefined;
  if (filters.sizes?.length) {
    const { data } = await supabase
      .from("product_sizes")
      .select("product_id")
      .in("label", filters.sizes);
    sizeFilteredIds = [...new Set(data?.map((s) => s.product_id) ?? [])];
    if (sizeFilteredIds.length === 0) return { products: [], totalCount: 0 };
  }

  // Resolve product IDs that fall within the price range, from TWO sources:
  //  1. Retail products — match if ANY of their `product_sizes` is in range
  //     (preserves the existing "any variant in range" behaviour for sized products).
  //  2. Bulk products — they have no sizes; their price lives in `products.base_price`,
  //     so include products whose base_price is in range.
  // Why the union is safe for retail: migration 004 keeps base_price = MIN(size price) for
  // sized products, so any retail product matched via base_price is ALWAYS already matched
  // via its sizes. The base_price source therefore only ever *adds* sizeless (bulk) products —
  // it never changes which sized/retail products match.
  let priceFilteredIds: string[] | undefined;
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    let sizeQuery = supabase.from("product_sizes").select("product_id");
    if (filters.priceMin !== undefined) sizeQuery = sizeQuery.gte("price", filters.priceMin);
    if (filters.priceMax !== undefined) sizeQuery = sizeQuery.lte("price", filters.priceMax);

    let baseQuery = supabase.from("products").select("id").is("deleted_at", null);
    if (filters.priceMin !== undefined) baseQuery = baseQuery.gte("base_price", filters.priceMin);
    if (filters.priceMax !== undefined) baseQuery = baseQuery.lte("base_price", filters.priceMax);

    const [{ data: sizeData }, { data: baseData }] = await Promise.all([sizeQuery, baseQuery]);
    priceFilteredIds = [
      ...new Set([
        ...(sizeData?.map((s) => s.product_id) ?? []),
        ...(baseData?.map((p) => p.id) ?? []),
      ]),
    ];
    if (priceFilteredIds.length === 0) return { products: [], totalCount: 0 };
  }

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT, { count: "exact" })
    .is("deleted_at", null)
    .eq("is_published", true);

  if (categoryIds?.length) query = query.in("category_id", categoryIds);
  if (brandIds?.length) query = query.in("brand_id", brandIds);
  if (sizeFilteredIds?.length) query = query.in("id", sizeFilteredIds);
  if (priceFilteredIds?.length) query = query.in("id", priceFilteredIds);
  if (filters.featured) query = query.eq("is_featured", true);
  if (filters.bestseller) query = query.eq("is_bestseller", true);
  if (filters.purchaseType) query = query.eq("purchase_type", filters.purchaseType);
  if (filters.query) {
    query = query.or(
      `name.ilike.%${filters.query}%,short_description.ilike.%${filters.query}%`
    );
  }

  switch (filters.sort) {
    case "price_asc":
      query = query.order("base_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("base_price", { ascending: false });
      break;
    case "popularity":
      query = query
        .order("is_bestseller", { ascending: false })
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  query = query
    .order("display_order", { ascending: true, referencedTable: "product_sizes" })
    .order("display_order", { ascending: true, referencedTable: "product_images" })
    .range(offset, offset + pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    products: (data ?? []) as unknown as ProductWithRelations[],
    totalCount: count ?? 0,
  };
}

/**
 * Fetch published products by id, preserving the catalog select shape so they can
 * be rendered with <ProductCard>. Order is not guaranteed; callers that need a
 * specific order (e.g. wishlist by added_at) should re-sort by id.
 */
export async function getPublishedProductsByIds(
  ids: string[]
): Promise<ProductWithRelations[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", ids)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("display_order", { ascending: true, referencedTable: "product_sizes" })
    .order("display_order", { ascending: true, referencedTable: "product_images" });
  if (error) return [];
  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function getProduct(slug: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .single();

  if (error) return null;
  return data as unknown as ProductWithRelations;
}

export async function getRelatedProducts(
  productId: string,
  categoryId: string,
  limit = 4
): Promise<ProductWithRelations[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("category_id", categoryId)
    .neq("id", productId)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function searchProducts(
  query: string,
  limit = 5
): Promise<ProductWithRelations[]> {
  if (!query.trim()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .or(`name.ilike.%${query}%,short_description.ilike.%${query}%`)
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("is_featured", { ascending: false })
    .limit(limit);

  if (error) return [];
  return (data ?? []) as unknown as ProductWithRelations[];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  return data ?? null;
}

export async function getBrands(): Promise<Brand[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  return data ?? [];
}

export async function getAvailableSizes(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_sizes")
    .select("label")
    .order("volume_ml", { ascending: true });
  const labels = [...new Set(data?.map((s) => s.label) ?? [])];
  return labels;
}

export { getMinPrice, getPrimaryImage } from "@/lib/product-utils";
