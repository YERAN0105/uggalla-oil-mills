import { z } from "zod";

// Single source of validation truth — imported by both the client form (live
// validation) and the server action (final authority). Keep them in sync by
// never duplicating these rules elsewhere.
export const phoneRegex = /^(\+94|0)[0-9]{9}$/;

// One product line on the request. A bulk request carries one or more of these.
export const BulkRequestItemSchema = z.object({
  product_id: z.string().uuid("Please select a product"),
  quantity: z.coerce
    .number()
    .positive("Quantity must be greater than 0")
    .max(100000, "Quantity is too large"),
  unit: z.enum(["litres", "cans", "kg", "other"]),
});

export type BulkRequestItemInput = z.infer<typeof BulkRequestItemSchema>;

export const BulkRequestSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Please enter a valid email address"),
    phone: z
      .string()
      .regex(phoneRegex, "Enter a valid Sri Lankan phone number (e.g. +94771234567)"),
    items: z
      .array(BulkRequestItemSchema)
      .min(1, "Add at least one product")
      .max(20, "Too many products in one request"),
    fulfillment_type: z.enum(["delivery", "pickup"]),
    // Delivery address — either a saved address id (logged-in users) or the
    // new-address fields below. Ownership of a saved id is verified server-side.
    savedAddressId: z.string().uuid().nullish(),
    address_recipient: z.string().optional(),
    address_phone: z
      .string()
      .optional()
      .refine((v) => !v || phoneRegex.test(v), "Enter a valid phone number"),
    address_line1: z.string().optional(),
    address_line2: z.string().optional(),
    address_city: z.string().optional(),
    preferred_date: z.string().optional(),
    notes: z.string().max(1000, "Notes must be under 1000 characters").optional(),
  })
  // Address fields are required only when delivering with a *new* address.
  // A saved-address selection needs no field validation (server resolves it).
  .superRefine((data, ctx) => {
    if (data.fulfillment_type !== "delivery") return;
    if (data.savedAddressId) return;
    if (!data.address_recipient || data.address_recipient.trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address_recipient"],
        message: "Recipient name is required",
      });
    }
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
  });

export type BulkRequestInput = z.infer<typeof BulkRequestSchema>;
