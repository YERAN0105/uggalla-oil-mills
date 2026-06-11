"use server";

import { trackGuestOrder } from "@/lib/orders/data";
import type { OrderWithItems } from "@/types/checkout";

export type TrackResult =
  | { ok: true; order: OrderWithItems }
  | { ok: false; error: string };

export async function trackOrderAction(orderNumber: string, contact: string): Promise<TrackResult> {
  if (!orderNumber.trim() || !contact.trim()) {
    return { ok: false, error: "Enter your order number and email or phone." };
  }
  const order = await trackGuestOrder(orderNumber, contact);
  if (!order) {
    return {
      ok: false,
      error: "We couldn't find an order matching those details. Please check and try again.",
    };
  }
  return { ok: true, order };
}
