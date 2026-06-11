"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewSchema } from "@/lib/account/schema";

type Result = { ok: true } | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const MAX_IMAGES = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Submit a review for a delivered order item. Authorizes that the item belongs
 * to the user's own delivered order, enforces one review per item, then stores
 * the review (status pending) plus up to 3 images.
 */
export async function submitReview(formData: FormData): Promise<Result> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const parsed = reviewSchema.safeParse({
    orderItemId: formData.get("orderItemId"),
    productId: formData.get("productId"),
    rating: Number(formData.get("rating")),
    title: (formData.get("title") as string) ?? "",
    body: (formData.get("body") as string) ?? "",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please complete the review.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const d = parsed.data;
  const admin = createAdminClient();

  // Authorize: item belongs to a delivered order owned by this user, and the
  // product matches.
  const { data: item } = await admin
    .from("order_items")
    .select("id, product_id, orders:order_id(user_id, status)")
    .eq("id", d.orderItemId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const order = (item as any)?.orders;
  if (!item || !order || order.user_id !== user.id) {
    return { ok: false, error: "We couldn't find that purchase on your account." };
  }
  if (order.status !== "delivered") {
    return { ok: false, error: "You can review an item once your order is delivered." };
  }
  if (item.product_id !== d.productId) {
    return { ok: false, error: "That product doesn't match the order item." };
  }

  // One review per order item.
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("order_item_id", d.orderItemId)
    .maybeSingle();
  if (existing) return { ok: false, error: "You've already reviewed this item." };

  const { data: review, error: insErr } = await admin
    .from("reviews")
    .insert({
      product_id: d.productId,
      user_id: user.id,
      order_item_id: d.orderItemId,
      rating: d.rating,
      title: d.title?.trim() || null,
      body: d.body?.trim() || null,
      status: "pending",
    })
    .select("id")
    .single();
  if (insErr || !review) return { ok: false, error: "Could not save your review. Please try again." };

  // Optional images (best-effort — a failed upload doesn't fail the review).
  const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  for (const file of files.slice(0, MAX_IMAGES)) {
    if (file.size > MAX_BYTES || !ALLOWED.includes(file.type)) continue;
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user.id}/${review.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from("review-images")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (upErr) continue;
    const { data: pub } = admin.storage.from("review-images").getPublicUrl(path);
    await admin.from("review_images").insert({ review_id: review.id, url: pub.publicUrl });
  }

  revalidatePath("/account/reviews");
  revalidatePath("/account/orders");
  return { ok: true };
}

export async function updateReview(
  reviewId: string,
  patch: { rating: number; title: string; body: string }
): Promise<Result> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();

  const { data: review } = await admin
    .from("reviews")
    .select("id, status")
    .eq("id", reviewId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!review) return { ok: false, error: "Review not found." };
  if (review.status !== "pending") {
    return { ok: false, error: "Only pending reviews can be edited." };
  }
  const rating = Math.max(1, Math.min(5, Math.round(patch.rating)));
  const { error } = await admin
    .from("reviews")
    .update({
      rating,
      title: patch.title?.trim().slice(0, 80) || null,
      body: patch.body?.trim().slice(0, 1000) || null,
    })
    .eq("id", reviewId);
  if (error) return { ok: false, error: "Could not update the review." };
  revalidatePath("/account/reviews");
  return { ok: true };
}

export async function deleteReview(reviewId: string): Promise<Result> {
  const user = await requireUser();
  if (!user) return { ok: false, error: "Please sign in." };
  const admin = createAdminClient();
  const { error } = await admin
    .from("reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: "Could not delete the review." };
  revalidatePath("/account/reviews");
  return { ok: true };
}
