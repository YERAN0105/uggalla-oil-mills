import { z } from "zod";
import { phoneRegex } from "@/lib/checkout/schema";

// Saved-address form (account Addresses page). Mirrors the checkout address
// fields and adds a delivery zone + default flag managed here.
export const accountAddressSchema = z.object({
  label: z.string().max(50).optional().default(""),
  recipient: z.string().min(2, "Recipient name is required").max(100),
  phone: z.string().regex(phoneRegex, "Enter a valid Sri Lankan phone number"),
  line1: z.string().min(3, "Address is required").max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(2, "City is required").max(100),
  postal_code: z.string().max(20).optional().default(""),
  delivery_zone_id: z.string().uuid().nullable().optional().default(null),
  is_default: z.boolean().optional().default(false),
});

export type AccountAddressInput = z.infer<typeof accountAddressSchema>;

// Profile form. Email/password are optional — only validated when changed.
export const profileSchema = z
  .object({
    name: z.string().min(2, "Your name is required").max(100),
    phone: z.string().regex(phoneRegex, "Enter a valid Sri Lankan phone number"),
    email: z.string().email("Enter a valid email"),
    currentPassword: z.string().optional().default(""),
    newPassword: z.string().optional().default(""),
    confirmPassword: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword || data.confirmPassword) {
      if (data.newPassword.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPassword"],
          message: "New password must be at least 8 characters",
        });
      }
      if (data.newPassword !== data.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "Passwords do not match",
        });
      }
    }
  });

export type ProfileInput = z.infer<typeof profileSchema>;

export const reviewSchema = z.object({
  orderItemId: z.string().uuid(),
  productId: z.string().uuid(),
  rating: z.number().int().min(1, "Please choose a rating").max(5),
  title: z.string().max(80).optional().default(""),
  body: z.string().max(1000).optional().default(""),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
