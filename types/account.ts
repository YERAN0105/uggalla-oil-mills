// Read models for the customer account area. The Supabase clients are untyped,
// so these interfaces describe the exact shape the account pages consume.

import type { OrderItemRow } from "@/types/checkout";

export interface AccountOrderSummary {
  id: string;
  order_number: string;
  status: string;
  payment_method: string;
  payment_status: string;
  fulfillment_type: "delivery" | "pickup";
  total: number;
  created_at: string;
  delivery_date: string | null;
  item_count: number;
  thumbnails: string[];
}

export interface StatusHistoryEntry {
  status: string;
  note: string | null;
  changed_at: string;
}

export interface AccountOrderDetail {
  id: string;
  order_number: string;
  user_id: string | null;
  status: string;
  fulfillment_type: "delivery" | "pickup";
  delivery_zone: { id: string; name: string; estimated_time: string | null } | null;
  address_snapshot: {
    recipient: string;
    phone: string | null;
    line1: string;
    line2: string | null;
    city: string;
    postal_code: string | null;
  } | null;
  delivery_date: string | null;
  time_slot: { id: string; label: string } | null;
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
  order_items: (OrderItemRow & { product_id: string | null; reviewed: boolean })[];
  history: StatusHistoryEntry[];
  bank_receipt: { id: string; status: string } | null;
}

export interface AccountSubscription {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  image: string | null;
  is_available: boolean;
  size_id: string | null;
  size_label: string | null;
  size_price: number | null;
  quantity: number;
  interval: "weekly" | "biweekly" | "monthly";
  next_reminder_date: string;
  status: "active" | "paused" | "cancelled";
  created_at: string;
}

export interface AccountBulkRequest {
  id: string;
  product_name: string | null;
  quantity: number;
  unit: string;
  fulfillment_type: "delivery" | "pickup";
  preferred_date: string | null;
  notes: string | null;
  status: "new" | "in_progress" | "quoted" | "accepted" | "rejected" | "completed";
  quoted_unit_price: number | null;
  quoted_total: number | null;
  quote_message: string | null;
  payment_mode: "offline" | "online";
  quote_token: string | null;
  quote_expires_at: string | null;
  converted_order_id: string | null;
  converted_order_number: string | null;
  created_at: string;
}

export interface AccountAddress {
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

export interface LoyaltyTransaction {
  id: string;
  type: "earn" | "redeem" | "bonus" | "expire" | "adjust";
  points: number;
  balance_after: number;
  note: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface AccountReview {
  id: string;
  product_id: string;
  product_name: string;
  product_slug: string;
  image: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: "pending" | "approved" | "hidden";
  admin_reply: string | null;
  created_at: string;
  images: string[];
}

export interface AccountDashboard {
  firstName: string;
  totalOrders: number;
  loyaltyPoints: number;
  activeSubscriptions: number;
  wishlistCount: number;
  recentOrder: AccountOrderSummary | null;
}
