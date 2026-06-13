import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/settings";
import { ScheduleClient } from "@/components/admin/schedule/ScheduleClient";
import type { LeadTimes } from "@/lib/admin/schedule";
import type { AdminTimeSlot, AdminHoliday } from "@/types/admin";

export const metadata: Metadata = { title: "Schedule" };

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function SchedulePage() {
  const db = createAdminClient();
  const [{ data: slots }, { data: holidays }, { data: cats }, leadTimes] = await Promise.all([
    db.from("time_slots").select("*").order("start_time", { ascending: true }),
    db.from("holidays").select("*").order("date", { ascending: true }),
    db.from("categories").select("id, name").order("display_order", { ascending: true }),
    getSetting<LeadTimes>("lead_times", { global_hours: 24, per_category: {} }),
  ]);

  return (
    <ScheduleClient
      slots={((slots as any[]) ?? []) as AdminTimeSlot[]}
      holidays={((holidays as any[]) ?? []) as AdminHoliday[]}
      leadTimes={leadTimes}
      categories={((cats as any[]) ?? []).map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
