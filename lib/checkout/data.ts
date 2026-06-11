import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nowInColombo } from "@/lib/date";
import { getCodLimits, getTaxSettings, getLoyaltySettings, getShopInfo } from "@/lib/settings";
import type {
  DeliveryZone,
  TimeSlot,
  SavedAddress,
  CheckoutUser,
} from "@/types/checkout";

export async function getDeliveryZones(): Promise<DeliveryZone[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("delivery_zones")
    .select("id, name, fee, estimated_time, min_order_amount, same_day_surcharge, is_active")
    .eq("is_active", true)
    .order("fee", { ascending: true });
  return (data ?? []) as DeliveryZone[];
}

export async function getTimeSlots(): Promise<TimeSlot[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("time_slots")
    .select("id, label, start_time, end_time, capacity, is_active")
    .eq("is_active", true)
    .order("start_time", { ascending: true });
  return (data ?? []) as TimeSlot[];
}

/** Upcoming holiday dates (yyyy-MM-dd) used to disable days in the date picker. */
export async function getHolidayDates(): Promise<string[]> {
  const supabase = await createClient();
  const today = nowInColombo();
  const iso = today.toISOString().split("T")[0];
  const { data } = await supabase
    .from("holidays")
    .select("date")
    .gte("date", iso)
    .order("date", { ascending: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((h: any) => h.date as string);
}

/** Logged-in customer context: profile, saved addresses, loyalty balance. */
export async function getCheckoutUser(): Promise<{
  user: CheckoutUser | null;
  addresses: SavedAddress[];
}> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return { user: null, addresses: [] };

  const [{ data: profile }, { data: addresses }] = await Promise.all([
    supabase.from("users").select("name, phone, loyalty_points").eq("id", authUser.id).single(),
    supabase
      .from("addresses")
      .select("id, label, recipient, phone, line1, line2, city, postal_code, is_default")
      .eq("user_id", authUser.id)
      .order("is_default", { ascending: false }),
  ]);

  return {
    user: {
      id: authUser.id,
      name: profile?.name ?? null,
      email: authUser.email ?? "",
      phone: profile?.phone ?? null,
      loyaltyPoints: profile?.loyalty_points ?? 0,
    },
    addresses: (addresses ?? []) as SavedAddress[],
  };
}

/**
 * Remaining capacity per active slot for a given date (Asia/Colombo). Counts
 * non-cancelled orders already booked into each slot. Uses the admin client to
 * see across all customers (RLS would otherwise hide other users' orders).
 */
export async function getSlotAvailability(date: string): Promise<Record<string, number>> {
  const slots = await getTimeSlots();
  const admin = createAdminClient();
  const { data: orders } = await admin
    .from("orders")
    .select("time_slot_id")
    .eq("delivery_date", date)
    .not("status", "in", "(cancelled,refunded)");

  const counts: Record<string, number> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const o of (orders ?? []) as any[]) {
    if (o.time_slot_id) counts[o.time_slot_id] = (counts[o.time_slot_id] ?? 0) + 1;
  }

  const remaining: Record<string, number> = {};
  for (const slot of slots) {
    remaining[slot.id] = Math.max(0, slot.capacity - (counts[slot.id] ?? 0));
  }
  return remaining;
}

export { getCodLimits, getTaxSettings, getLoyaltySettings, getShopInfo };
