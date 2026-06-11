import { z } from "zod";

// Single source of validation truth — imported by both the client form (live
// validation) and the server action (final authority). Keep them in sync by
// never duplicating these rules elsewhere.
export const phoneRegex = /^(\+94|0)[0-9]{9}$/;

export const BulkRequestSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .regex(phoneRegex, "Enter a valid Sri Lankan phone number (e.g. +94771234567)"),
    product_id: z.string().uuid("Please select a product"),
    quantity: z.coerce
      .number()
      .positive("Quantity must be greater than 0")
      .max(100000, "Quantity is too large"),
    unit: z.enum(["litres", "cans", "kg", "other"]),
    fulfillment_type: z.enum(["delivery", "pickup"]),
    address_line1: z.string().optional(),
    address_city: z.string().optional(),
    preferred_date: z.string().optional(),
    notes: z.string().max(1000, "Notes must be under 1000 characters").optional(),
  })
  // Address + city are required only for delivery.
  .superRefine((data, ctx) => {
    if (data.fulfillment_type === "delivery") {
      if (!data.address_line1?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address_line1"],
          message: "Delivery address is required",
        });
      }
      if (!data.address_city?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address_city"],
          message: "City / town is required",
        });
      }
    }
  });

export type BulkRequestInput = z.infer<typeof BulkRequestSchema>;
