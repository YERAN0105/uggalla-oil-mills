import { z } from "zod";

// Accepts +94XXXXXXXXX or 0XXXXXXXXX (Sri Lankan). Mirrors the bulk-request rule.
export const phoneRegex = /^(\+94|0)[0-9]{9}$/;

export const cartLineSchema = z.object({
  productId: z.string().uuid(),
  sizeId: z.string().uuid().nullable(),
  quantity: z.number().int().min(1).max(99),
  note: z.string().max(500).default(""),
  isSubscription: z.boolean().default(false),
  subscriptionInterval: z.enum(["weekly", "biweekly", "monthly"]).nullable().default(null),
});

export const addressSchema = z.object({
  recipient: z.string().min(2, "Recipient name is required").max(100),
  phone: z.string().regex(phoneRegex, "Enter a valid Sri Lankan phone number"),
  line1: z.string().min(3, "Address is required").max(200),
  line2: z.string().max(200).optional().default(""),
  city: z.string().min(2, "City is required").max(100),
  postal_code: z.string().max(20).optional().default(""),
});

export const createOrderSchema = z
  .object({
    items: z.array(cartLineSchema).min(1, "Your cart is empty"),

    // Contact
    contactName: z.string().min(2, "Name is required").max(100),
    contactEmail: z.string().email("Enter a valid email"),
    contactPhone: z.string().regex(phoneRegex, "Enter a valid Sri Lankan phone number"),
    createAccount: z.boolean().default(false),

    fulfillmentType: z.enum(["delivery", "pickup"]),

    // Delivery
    savedAddressId: z.string().uuid().nullable().default(null),
    address: addressSchema.nullable().default(null),
    saveAddress: z.boolean().default(false),
    deliveryZoneId: z.string().uuid().nullable().default(null),

    // Schedule (Asia/Colombo calendar date, yyyy-MM-dd)
    fulfillmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
    timeSlotId: z.string().uuid({ message: "Choose a time slot" }),

    driverNote: z.string().max(500).optional().default(""),

    paymentMethod: z.enum(["payhere", "bank_transfer", "cod"]),

    couponCode: z.string().max(40).optional().default(""),
    loyaltyPointsToRedeem: z.number().int().min(0).default(0),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentType === "delivery") {
      if (!data.deliveryZoneId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deliveryZoneId"], message: "Select a delivery zone" });
      }
      if (!data.savedAddressId && !data.address) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["address"], message: "Enter a delivery address" });
      }
    }
  });

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
