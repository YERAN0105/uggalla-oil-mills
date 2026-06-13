import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { ZonesManager } from "@/components/admin/zones/ZonesManager";
import type { DeliveryZone } from "@/types/checkout";

export const metadata: Metadata = { title: "Delivery Zones" };

/* eslint-disable @typescript-eslint/no-explicit-any */

export default async function DeliveryZonesPage() {
  const db = createAdminClient();
  const { data } = await db.from("delivery_zones").select("*").order("name", { ascending: true });
  const zones: DeliveryZone[] = ((data as any[]) ?? []).map((z) => ({
    id: z.id,
    name: z.name,
    fee: Number(z.fee) || 0,
    estimated_time: z.estimated_time,
    min_order_amount: z.min_order_amount != null ? Number(z.min_order_amount) : null,
    same_day_surcharge: z.same_day_surcharge != null ? Number(z.same_day_surcharge) : null,
    is_active: z.is_active,
  }));
  return <ZonesManager zones={zones} />;
}
