import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface LoyaltyStats {
  issued: number;
  redeemed: number;
  expired: number;
  outstanding: number;
}

export async function getLoyaltyStats(): Promise<LoyaltyStats> {
  const db = createAdminClient();
  const { data: tx } = await db.from("loyalty_transactions").select("type, points");
  let issued = 0;
  let redeemed = 0;
  let expired = 0;
  for (const t of (tx as any[]) ?? []) {
    const p = Number(t.points) || 0;
    if (t.type === "earn" || t.type === "bonus") issued += Math.max(0, p);
    else if (t.type === "redeem") redeemed += Math.abs(Math.min(0, p));
    else if (t.type === "expire") expired += Math.abs(p);
    else if (t.type === "adjust" && p > 0) issued += p;
  }
  const { data: users } = await db.from("users").select("loyalty_points");
  const outstanding = ((users as any[]) ?? []).reduce((s, u) => s + (Number(u.loyalty_points) || 0), 0);

  return { issued, redeemed, expired, outstanding };
}
