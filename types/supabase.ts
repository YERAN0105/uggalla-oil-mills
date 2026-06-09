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
