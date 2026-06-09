"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const phoneRegex = /^(\+94|0)[0-9]{9}$/;

const BulkRequestSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().regex(phoneRegex, "Enter a valid Sri Lankan phone number (e.g. +94771234567)"),
  product_id: z.string().uuid().optional().or(z.literal("")),
  quantity: z.coerce.number().positive("Quantity must be greater than 0").max(100000),
  unit: z.enum(["litres", "cans", "kg", "other"]),
  fulfillment_type: z.enum(["delivery", "pickup"]),
  address_line1: z.string().optional(),
  address_city: z.string().optional(),
  preferred_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

export type BulkRequestFormState =
  | { status: "idle" }
  | { status: "success"; requestId: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

export async function submitBulkRequest(
  _prev: BulkRequestFormState,
  formData: FormData
): Promise<BulkRequestFormState> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = BulkRequestSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  // Delivery requires address
  if (data.fulfillment_type === "delivery" && !data.address_line1) {
    return {
      status: "error",
      message: "Please enter a delivery address.",
      fieldErrors: { address_line1: ["Delivery address is required"] },
    };
  }

  try {
    // Get current user if logged in (optional)
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id ?? null;

    const addressSnapshot =
      data.fulfillment_type === "delivery"
        ? { line1: data.address_line1, city: data.address_city }
        : null;

    const admin = createAdminClient();
    const { data: insertedRow, error } = await admin
      .from("bulk_requests")
      .insert({
        product_id: data.product_id || null,
        user_id: userId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        quantity: data.quantity,
        unit: data.unit,
        fulfillment_type: data.fulfillment_type,
        address_snapshot: addressSnapshot,
        preferred_date: data.preferred_date || null,
        notes: data.notes || null,
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[bulk-request] insert error:", error);
      return { status: "error", message: "Failed to submit your request. Please try again." };
    }

    // TODO Phase 6: stub notification call
    // await notify('bulk_request_received', { requestId: insertedRow.id, ... });

    return { status: "success", requestId: insertedRow.id };
  } catch (err) {
    console.error("[bulk-request] unexpected error:", err);
    return { status: "error", message: "An unexpected error occurred. Please try again." };
  }
}
