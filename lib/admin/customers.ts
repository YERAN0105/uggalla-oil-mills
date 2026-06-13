"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/guard";
import { logActivity } from "@/lib/admin/activity";
import { manualCustomerSchema } from "@/lib/admin/schemas";
import type { ActionResult } from "@/types/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

function revalidate(id?: string) {
  revalidatePath("/admin/customers");
  if (id) revalidatePath(`/admin/customers/${id}`);
}

export async function toggleCustomerBlocked(id: string, blocked: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("users").update({ blocked }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: blocked ? "customer.block" : "customer.unblock", targetTable: "users", targetId: id });
  revalidate(id);
  return { ok: true };
}

export async function updateCustomerProfile(
  id: string,
  input: { name: string; phone: string }
): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db
    .from("users")
    .update({ name: input.name || null, phone: input.phone || null })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "customer.update", targetTable: "users", targetId: id });
  revalidate(id);
  return { ok: true };
}

export async function saveCustomerNotes(id: string, notes: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const db = createAdminClient();
  const { error } = await db.from("users").update({ admin_notes: notes || null }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await logActivity(admin.id, { action: "customer.notes", targetTable: "users", targetId: id });
  revalidate(id);
  return { ok: true };
}

/** Manually adjust a customer's loyalty balance with a reason (goodwill/refund). */
export async function adjustLoyalty(
  id: string,
  points: number,
  reason: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!Number.isInteger(points) || points === 0)
    return { ok: false, error: "Enter a non-zero whole number of points." };
  if (!reason.trim()) return { ok: false, error: "A reason is required." };

  const db = createAdminClient();
  const { data: u } = await db.from("users").select("loyalty_points").eq("id", id).maybeSingle();
  if (!u) return { ok: false, error: "Customer not found." };

  const newBalance = Math.max(0, ((u as any).loyalty_points ?? 0) + points);
  await db.from("users").update({ loyalty_points: newBalance }).eq("id", id);
  await db.from("loyalty_transactions").insert({
    user_id: id,
    type: "adjust",
    points,
    balance_after: newBalance,
    note: `Admin adjustment: ${reason}`,
  });

  await logActivity(admin.id, {
    action: "customer.loyalty_adjust",
    targetTable: "users",
    targetId: id,
    metadata: { points, reason },
  });
  revalidate(id);
  return { ok: true };
}

/**
 * Create a customer manually (e.g. a walk-in to track). Creates an auth user
 * with a temporary password; the password is returned so the admin can share it.
 * Invite emails are wired in Phase 6.
 */
export async function createCustomer(
  input: unknown
): Promise<ActionResult<{ id: string; tempPassword: string }>> {
  const admin = await requireAdmin();
  const parsed = manualCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please fix the errors.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;
  const db = createAdminClient();

  const tempPassword = `Uom-${crypto.randomBytes(6).toString("hex")}`;
  const { data, error } = await db.auth.admin.createUser({
    email: d.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { name: d.name, phone: d.phone || null },
  });
  if (error) return { ok: false, error: error.message };
  const newId = data.user!.id;

  // Ensure the profile row carries name/phone (trigger creates the base row).
  await db.from("users").upsert(
    { id: newId, name: d.name, phone: d.phone || null, role: "customer" },
    { onConflict: "id" }
  );

  // Best-effort password reset email when an invite is requested (no-op if email
  // isn't configured; real invites land in Phase 6).
  if (d.send_invite) {
    try {
      await db.auth.resetPasswordForEmail(d.email);
    } catch {
      /* ignore — email delivery configured in Phase 6 */
    }
  }

  await logActivity(admin.id, {
    action: "customer.create",
    targetTable: "users",
    targetId: newId,
    metadata: { email: d.email, invited: d.send_invite },
  });
  revalidate(newId);
  return { ok: true, data: { id: newId, tempPassword } };
}
