import { z } from "zod";

// Central Zod schemas for admin forms. Imported by both the client forms (live
// validation) and the server actions (final authority before the DB write).

const slug = z
  .string()
  .min(1, "Slug is required")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens");

export const brandSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug,
  description: z.string().max(2000).optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
});
export type BrandInput = z.infer<typeof brandSchema>;

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug,
  description: z.string().max(2000).optional().or(z.literal("")),
  image_url: z.string().url().optional().or(z.literal("")),
  display_order: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  is_bulk: z.boolean().default(false),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const deliveryZoneSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  fee: z.coerce.number().min(0, "Fee must be 0 or more"),
  estimated_time: z.string().max(100).optional().or(z.literal("")),
  min_order_amount: z.coerce.number().min(0).nullable().optional(),
  same_day_surcharge: z.coerce.number().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
});
export type DeliveryZoneInput = z.infer<typeof deliveryZoneSchema>;

export const timeSlotSchema = z.object({
  label: z.string().min(1, "Label is required").max(100),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM"),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  is_active: z.boolean().default(true),
});
export type TimeSlotInput = z.infer<typeof timeSlotSchema>;

export const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  label: z.string().max(120).optional().or(z.literal("")),
});
export type HolidayInput = z.infer<typeof holidaySchema>;

export const couponSchema = z
  .object({
    code: z
      .string()
      .min(3, "Code must be at least 3 characters")
      .max(40)
      .regex(/^[A-Z0-9]+$/, "Use uppercase letters and numbers only"),
    type: z.enum(["percent_off", "flat_off", "free_delivery"]),
    value: z.coerce.number().min(0),
    min_order_amount: z.coerce.number().min(0).nullable().optional(),
    max_discount: z.coerce.number().min(0).nullable().optional(),
    usage_limit_total: z.coerce.number().int().min(0).nullable().optional(),
    usage_limit_per_user: z.coerce.number().int().min(0).nullable().optional(),
    valid_from: z.string().nullable().optional(),
    valid_until: z.string().nullable().optional(),
    applies_to_type: z.enum(["all", "categories", "brands", "products"]).default("all"),
    applies_to_ids: z.array(z.string()).default([]),
    is_active: z.boolean().default(true),
  })
  .refine((d) => (d.type === "percent_off" ? d.value > 0 && d.value <= 100 : true), {
    message: "Percentage must be between 1 and 100",
    path: ["value"],
  });
export type CouponInput = z.infer<typeof couponSchema>;

export const bannerSchema = z
  .object({
    image_url: z.string().url().optional().or(z.literal("")),
    headline: z.string().max(120).optional().or(z.literal("")),
    subheadline: z.string().max(240).optional().or(z.literal("")),
    cta_text: z.string().max(60).optional().or(z.literal("")),
    cta_link: z.string().max(300).optional().or(z.literal("")),
    position: z.enum(["hero", "promo"]).default("hero"),
    display_order: z.coerce.number().int().min(0).default(0),
    valid_from: z.string().nullable().optional(),
    valid_until: z.string().nullable().optional(),
    is_active: z.boolean().default(true),
  })
  // A promo strip is just a line of text — its message (headline) is required.
  .superRefine((data, ctx) => {
    if (data.position === "promo" && !data.headline?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["headline"],
        message: "A promo strip needs a message.",
      });
    }
  });
export type BannerInput = z.infer<typeof bannerSchema>;

export const productKeyFactSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
});

export const productSizeSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Size label is required"),
  volume_ml: z.coerce.number().int().min(0).nullable().optional(),
  price: z.coerce.number().min(0, "Price must be 0 or more"),
});

export const productSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    slug,
    brand_id: z.string().uuid().nullable().optional(),
    category_id: z.string().uuid({ message: "Category is required" }),
    short_description: z.string().max(300).optional().or(z.literal("")),
    description: z.string().max(8000).optional().or(z.literal("")),
    key_facts: z.array(productKeyFactSchema).default([]),
    purchase_type: z.enum(["retail", "bulk_quote"]).default("retail"),
    base_price: z.coerce.number().min(0).default(0),
    sizes: z.array(productSizeSchema).default([]),
    allows_subscription: z.boolean().default(false),
    allows_note: z.boolean().default(false),
    note_max_chars: z.coerce.number().int().min(0).max(2000).default(200),
    stock_tracked: z.boolean().default(false),
    stock_quantity: z.coerce.number().int().min(0).default(0),
    low_stock_threshold: z.coerce.number().int().min(0).default(5),
    is_published: z.boolean().default(false),
    is_featured: z.boolean().default(false),
    is_bestseller: z.boolean().default(false),
    meta_title: z.string().max(160).optional().or(z.literal("")),
    meta_description: z.string().max(320).optional().or(z.literal("")),
  })
  .refine((d) => (d.purchase_type === "retail" ? d.sizes.length > 0 : true), {
    message: "Retail products need at least one size",
    path: ["sizes"],
  })
  .refine((d) => (d.is_published && d.purchase_type === "retail" ? d.sizes.length > 0 : true), {
    message: "Add at least one size before publishing",
    path: ["sizes"],
  });
export type ProductInput = z.infer<typeof productSchema>;

export const manualCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Valid email required"),
  phone: z
    .string()
    .regex(/^\+94\d{9}$/, "Use +94XXXXXXXXX format")
    .optional()
    .or(z.literal("")),
  send_invite: z.boolean().default(false),
});
export type ManualCustomerInput = z.infer<typeof manualCustomerSchema>;
