import type { Metadata } from "next";
import { CheckoutClient } from "@/components/storefront/CheckoutClient";
import {
  getDeliveryZones,
  getTimeSlots,
  getHolidayDates,
  getCheckoutUser,
  getCodLimits,
  getTaxSettings,
  getLoyaltySettings,
  getShopInfo,
} from "@/lib/checkout/data";
import { isPayHereEnabled } from "@/lib/integrations";
import { brand } from "@/lib/brand";

export const metadata: Metadata = { title: "Checkout" };

// Checkout always reflects live stock/zone/slot data — never cache.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const [zones, slots, holidays, { user, addresses }, cod, tax, loyalty, shopInfo] = await Promise.all([
    getDeliveryZones(),
    getTimeSlots(),
    getHolidayDates(),
    getCheckoutUser(),
    getCodLimits(),
    getTaxSettings(),
    getLoyaltySettings(),
    getShopInfo(),
  ]);

  return (
    <section className="bg-cream min-h-screen">
      <CheckoutClient
        zones={zones}
        slots={slots}
        holidays={holidays}
        user={user}
        addresses={addresses}
        tax={tax}
        loyalty={loyalty}
        cod={cod}
        shopInfo={shopInfo}
        payHereEnabled={isPayHereEnabled}
        minLeadTimeHours={brand.minLeadTimeHours}
      />
    </section>
  );
}
