"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { verifyOrderToken } from "@/lib/orders/token";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type UploadReceiptResult = { ok: true } | { ok: false; error: string };

/**
 * Upload a bank-transfer receipt for an order. Works for guests too: the order
 * is authorized via the HMAC token (or logged-in ownership), then the file is
 * stored with the service-role client (the private `payment-receipts` bucket and
 * the receipts table both block anonymous writes under RLS).
 */
export async function uploadBankReceipt(formData: FormData): Promise<UploadReceiptResult> {
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const token = String(formData.get("token") ?? "");
  const file = formData.get("file");

  if (!orderNumber) return { ok: false, error: "Missing order reference." };
  if (!(file instanceof File)) return { ok: false, error: "Please choose a file to upload." };
  if (file.size > MAX_BYTES) return { ok: false, error: "File is too large (max 5MB)." };
  if (!ALLOWED.includes(file.type)) return { ok: false, error: "Use a JPG, PNG, WEBP, or PDF file." };

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id")
    .eq("order_number", orderNumber)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  // Authorize: valid token OR logged-in owner.
  let authorized = verifyOrderToken(orderNumber, token);
  if (!authorized && order.user_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authorized = !!user && user.id === order.user_id;
  }
  if (!authorized) return { ok: false, error: "You're not authorized to upload to this order." };

  const ext = file.name.split(".").pop()?.toLowerCase() || "dat";
  const path = `${orderNumber}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadErr } = await admin.storage
    .from("payment-receipts")
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (uploadErr) {
    console.error("[uploadBankReceipt] storage error:", uploadErr);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const { error: rowErr } = await admin.from("bank_transfer_receipts").insert({
    order_id: order.id,
    image_url: path,
    status: "pending",
  });
  if (rowErr) {
    console.error("[uploadBankReceipt] row insert error:", rowErr);
    return { ok: false, error: "Upload saved but could not be recorded. Please contact us." };
  }

  // TODO Phase 6: notify admin of receipt awaiting review.
  return { ok: true };
}
