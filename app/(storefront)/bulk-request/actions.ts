"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BulkRequestSchema } from "./schema";

export type BulkRequestFormState =
  | { status: "success"; requestId: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

// Final authority — the client validates with the same schema for UX, but never
// trust that alone. Re-validate everything here before touching the database.
export async function submitBulkRequest(input: unknown): Promise<BulkRequestFormState> {
  const parsed = BulkRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

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
