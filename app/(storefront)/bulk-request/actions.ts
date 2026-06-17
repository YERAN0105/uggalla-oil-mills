"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BulkRequestSchema } from "./schema";

export type BulkRequestFormState =
  | { status: "success"; requestId: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string[]> };

type AddressSnapshot = {
  recipient: string | null;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  postal_code: string | null;
};

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

    const admin = createAdminClient();

    // Resolve the delivery address — a saved address (verified as the user's
    // own) or the typed-in new address, which logged-in users may also save.
    let addressSnapshot: AddressSnapshot | null = null;
    if (data.fulfillment_type === "delivery") {
      if (data.savedAddressId && userId) {
        const { data: addr } = await admin
          .from("addresses")
          .select("recipient, phone, line1, line2, city, postal_code")
          .eq("id", data.savedAddressId)
          .eq("user_id", userId)
          .maybeSingle();
        if (!addr) {
          return { status: "error", message: "That saved address could not be found." };
        }
        addressSnapshot = addr as AddressSnapshot;
      } else {
        addressSnapshot = {
          recipient: data.address_recipient?.trim() || null,
          phone: data.address_phone?.trim() || null,
          line1: data.address_line1!.trim(),
          line2: data.address_line2?.trim() || null,
          city: data.address_city!.trim(),
          postal_code: null,
        };
      }
    }

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
