// Shared shapes for the admin panel (Phase 5). The Supabase clients are untyped,
// so these interfaces are the source of truth for the rows the admin UI consumes.

/** Standard return type for every admin server action. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
}

export interface AdminBadgeCounts {
  pendingOrders: number;
  newBulkRequests: number;
  pendingPayments: number;
  pendingReviews: number;
}

// ─── Catalog ────────────────────────────────────────────────────────────────

export interface AdminBrand {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  product_count: number;
}

export interface AdminCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  is_bulk: boolean;
  product_count: number;
}

export interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  brand_name: string | null;
  category_name: string | null;
  base_price: number;
  purchase_type: "retail" | "bulk_quote";
  stock_tracked: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  is_published: boolean;
  is_featured: boolean;
  primary_image: string | null;
  deleted_at: string | null;
}

export interface ProductKeyFact {
  label: string;
  value: string;
}

export interface ProductImageRow {
  id: string;
  url: string;
  alt_text: string | null;
  display_order: number;
  is_primary: boolean;
}

export interface ProductSizeRow {
  id: string;
  label: string;
  volume_ml: number | null;
  price: number;
  compare_at_price: number | null;
  display_order: number;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  name: string;
  brand_id: string | null;
  category_id: string;
  short_description: string | null;
  description: string | null;
  key_facts: ProductKeyFact[];
  base_price: number;
  purchase_type: "retail" | "bulk_quote";
  allows_subscription: boolean;
  allows_note: boolean;
  note_max_chars: number;
  is_published: boolean;
  is_featured: boolean;
  is_bestseller: boolean;
  stock_tracked: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  meta_title: string | null;
  meta_description: string | null;
  images: ProductImageRow[];
  sizes: ProductSizeRow[];
}

// ─── Coupons / banners / zones / schedule ───────────────────────────────────

export interface AdminCoupon {
  id: string;
  code: string;
  type: "percent_off" | "flat_off" | "free_delivery";
  value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  valid_from: string | null;
  valid_until: string | null;
  applies_to: CouponAppliesTo;
  is_active: boolean;
  usage_count: number;
}

export type CouponAppliesTo =
  | { type: "all" }
  | { type: "categories"; ids: string[] }
  | { type: "brands"; ids: string[] }
  | { type: "products"; ids: string[] };

export interface AdminBanner {
  id: string;
  image_url: string | null;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  cta_link: string | null;
  position: string;
  display_order: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
}

export interface AdminTimeSlot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
}

export interface AdminHoliday {
  id: string;
  date: string;
  label: string | null;
}

// ─── Customers ──────────────────────────────────────────────────────────────

export interface AdminCustomerRow {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
  blocked: boolean;
  loyalty_points: number;
  total_orders: number;
  lifetime_value: number;
  last_order_at: string | null;
}

// ─── Reviews ────────────────────────────────────────────────────────────────

export interface AdminReviewRow {
  id: string;
  product_id: string;
  product_name: string;
  customer_name: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: "pending" | "approved" | "hidden";
  admin_reply: string | null;
  created_at: string;
  images: string[];
}

// ─── Subscriptions ──────────────────────────────────────────────────────────

export interface AdminSubscriptionRow {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  product_name: string;
  size_label: string | null;
  quantity: number;
  interval: string;
  next_reminder_date: string;
  status: "active" | "paused" | "cancelled";
  last_reminder_at: string | null;
  created_at: string;
}

// ─── Settings ───────────────────────────────────────────────────────────────

export interface SubscriptionFrequencies {
  weekly: boolean;
  biweekly: boolean;
  monthly: boolean;
  loyalty_bonus: number;
}

export interface NotificationSettings {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  events: Record<string, boolean>;
}

export interface SeoSettings {
  site_title: string;
  meta_description: string;
  og_image_url: string;
}

export interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

export interface StorageCleanupSettings {
  /** Weekly auto-sweep of unused public images. Default OFF. */
  enabled: boolean;
}

// ─── Activity logs ──────────────────────────────────────────────────────────

export interface AdminActivityLog {
  id: string;
  user_id: string | null;
  admin_name: string | null;
  action: string;
  target_table: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}
