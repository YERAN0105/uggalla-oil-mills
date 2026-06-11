// Shared shapes for the cart → checkout → order flow. The Supabase clients in
// this project are untyped, so these interfaces are the source of truth for the
// rows the UI actually consumes (a subset of the DB columns).

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  estimated_time: string | null;
  min_order_amount: number | null;
  same_day_surcharge: number | null;
  is_active: boolean;
}

export interface TimeSlot {
  id: string;
  label: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_active: boolean;
}

export interface SavedAddress {
  id: string;
  label: string | null;
  recipient: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string | null;
  is_default: boolean;
  delivery_zone_id: string | null;
}

export interface AddressSnapshot {
  recipient: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string | null;
}

export interface TaxSettings {
  rate: number;
  inclusive: boolean;
  label: string;
}

export interface LoyaltySettings {
  earn_rate: number;
  earn_per_amount: number;
  redeem_rate: number;
  redeem_per_points: number;
  max_redeem_percent: number;
  expiry_months: number;
  first_order_bonus: number;
  review_bonus: number;
}

export interface CodLimits {
  min_order_amount: number | null;
  max_order_amount: number | null;
  enabled: boolean;
}

export interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch: string;
}

export interface ShopInfo {
  name: string;
  tagline?: string;
  address: string;
  phone: string;
  email: string;
  whatsapp: string;
  business_hours?: string;
}

/** User-specific context the checkout page needs for a logged-in customer. */
export interface CheckoutUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  loyaltyPoints: number;
}

// ─── Orders (read models for success / tracking pages) ───────────────────────

export interface OrderItemRow {
  id: string;
  product_snapshot: {
    name: string;
    brand: string | null;
    slug: string;
    image: string | null;
  };
  options: {
    size: { id: string | null; label: string; volume_ml: number | null; price: number };
    quantity: number;
    note: string;
    is_subscription: boolean;
    subscription_interval: string | null;
  };
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  status: string;
  fulfillment_type: "delivery" | "pickup";
  delivery_zone_id: string | null;
  address_snapshot: AddressSnapshot | null;
  delivery_date: string | null;
  time_slot_id: string | null;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  delivery_fee: number;
  discount_amount: number;
  tax_amount: number;
  loyalty_points_used: number;
  loyalty_discount: number;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface OrderWithItems extends OrderRow {
  order_items: OrderItemRow[];
  delivery_zone: Pick<DeliveryZone, "id" | "name" | "fee" | "estimated_time"> | null;
  time_slot: Pick<TimeSlot, "id" | "label"> | null;
  bank_receipt: { id: string; status: string } | null;
}
