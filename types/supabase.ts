export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          name: string | null;
          phone: string | null;
          role: "customer" | "admin";
          loyalty_points: number;
          blocked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          phone?: string | null;
          role?: "customer" | "admin";
          loyalty_points?: number;
          blocked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string | null;
          phone?: string | null;
          role?: "customer" | "admin";
          loyalty_points?: number;
          blocked?: boolean;
          updated_at?: string;
        };
      };
      brands: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["brands"]["Insert"]>;
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          image_url: string | null;
          display_order: number;
          is_active: boolean;
          is_bulk: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          display_order?: number;
          is_active?: boolean;
          is_bulk?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
      };
      products: {
        Row: {
          id: string;
          slug: string;
          brand_id: string | null;
          category_id: string;
          name: string;
          short_description: string | null;
          description: string | null;
          key_facts: Json | null;
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
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          brand_id?: string | null;
          category_id: string;
          name: string;
          short_description?: string | null;
          description?: string | null;
          key_facts?: Json | null;
          base_price?: number;
          purchase_type?: "retail" | "bulk_quote";
          allows_subscription?: boolean;
          allows_note?: boolean;
          note_max_chars?: number;
          is_published?: boolean;
          is_featured?: boolean;
          is_bestseller?: boolean;
          stock_tracked?: boolean;
          stock_quantity?: number;
          low_stock_threshold?: number;
          meta_title?: string | null;
          meta_description?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
      };
      product_images: {
        Row: {
          id: string;
          product_id: string;
          url: string;
          alt_text: string | null;
          display_order: number;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          url: string;
          alt_text?: string | null;
          display_order?: number;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_images"]["Insert"]>;
      };
      product_sizes: {
        Row: {
          id: string;
          product_id: string;
          label: string;
          volume_ml: number | null;
          price: number;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          label: string;
          volume_ml?: number | null;
          price: number;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["product_sizes"]["Insert"]>;
      };
      bulk_requests: {
        Row: {
          id: string;
          product_id: string | null;
          user_id: string | null;
          name: string;
          email: string;
          phone: string;
          fulfillment_type: "delivery" | "pickup";
          address_snapshot: Json | null;
          quantity: number;
          unit: string;
          items: Json;
          preferred_date: string | null;
          notes: string | null;
          status: "new" | "in_progress" | "quoted" | "accepted" | "rejected" | "completed";
          quoted_unit_price: number | null;
          quoted_total: number | null;
          quote_message: string | null;
          payment_mode: "offline" | "online";
          quote_token: string | null;
          quote_expires_at: string | null;
          internal_notes: string | null;
          converted_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id?: string | null;
          user_id?: string | null;
          name: string;
          email: string;
          phone: string;
          fulfillment_type?: "delivery" | "pickup";
          address_snapshot?: Json | null;
          quantity: number;
          unit?: string;
          items?: Json;
          preferred_date?: string | null;
          notes?: string | null;
          status?: "new" | "in_progress" | "quoted" | "accepted" | "rejected" | "completed";
          quoted_unit_price?: number | null;
          quoted_total?: number | null;
          quote_message?: string | null;
          payment_mode?: "offline" | "online";
          quote_token?: string | null;
          quote_expires_at?: string | null;
          internal_notes?: string | null;
          converted_order_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bulk_requests"]["Insert"]>;
      };
      bulk_request_attachments: {
        Row: {
          id: string;
          bulk_request_id: string;
          url: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          bulk_request_id: string;
          url: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["bulk_request_attachments"]["Insert"]>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          user_id: string;
          order_item_id: string | null;
          rating: number;
          title: string | null;
          body: string | null;
          status: "pending" | "approved" | "hidden";
          admin_reply: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          user_id: string;
          order_item_id?: string | null;
          rating: number;
          title?: string | null;
          body?: string | null;
          status?: "pending" | "approved" | "hidden";
          admin_reply?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reviews"]["Insert"]>;
      };
      wishlist: {
        Row: {
          user_id: string;
          product_id: string;
          added_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          added_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["wishlist"]["Insert"]>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          subscribed_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          email: string;
          subscribed_at?: string;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["newsletter_subscribers"]["Insert"]>;
      };
      settings: {
        Row: {
          key: string;
          value: Json;
        };
        Insert: {
          key: string;
          value: Json;
        };
        Update: Partial<Database["public"]["Tables"]["settings"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: "customer" | "admin";
      purchase_type: "retail" | "bulk_quote";
      order_status:
        | "pending_confirmation"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "ready_for_pickup"
        | "delivered"
        | "cancelled"
        | "refunded";
      payment_status:
        | "pending"
        | "pending_transfer"
        | "cod"
        | "paid"
        | "rejected"
        | "refunded";
      fulfillment_type: "delivery" | "pickup";
      subscription_interval: "weekly" | "biweekly" | "monthly";
      subscription_status: "active" | "paused" | "cancelled";
      bulk_request_status:
        | "new"
        | "in_progress"
        | "quoted"
        | "accepted"
        | "rejected"
        | "completed";
    };
  };
};

// ─── Derived types for convenience ────────────────────────────────────────────

export type ProductImage = Database["public"]["Tables"]["product_images"]["Row"];
export type ProductSize = Database["public"]["Tables"]["product_sizes"]["Row"];
export type Brand = Database["public"]["Tables"]["brands"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Product = Database["public"]["Tables"]["products"]["Row"];
export type BulkRequest = Database["public"]["Tables"]["bulk_requests"]["Row"];

/** One product line on a bulk request (stored in `bulk_requests.items` JSONB). */
export interface BulkRequestItem {
  product_id: string | null;
  /** Product name snapshot at submit time (null for loose / unspecified). */
  name: string | null;
  quantity: number;
  unit: string;
}
export type Review = Database["public"]["Tables"]["reviews"]["Row"];

export type KeyFact = { label: string; value: string };

export interface ProductWithRelations extends Omit<Product, "key_facts"> {
  key_facts: KeyFact[] | null;
  brands: Pick<Brand, "id" | "name" | "slug"> | null;
  categories: Pick<Category, "id" | "name" | "slug" | "is_bulk">;
  product_images: Pick<ProductImage, "id" | "url" | "alt_text" | "is_primary" | "display_order">[];
  product_sizes: Pick<ProductSize, "id" | "label" | "volume_ml" | "price" | "display_order">[];
  avg_rating?: number | null;
  review_count?: number | null;
}
