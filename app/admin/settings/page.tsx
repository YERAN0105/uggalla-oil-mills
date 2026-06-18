import type { Metadata } from "next";
import { getSetting, getShopInfo, getTaxSettings, getBankDetails, getCodLimits } from "@/lib/settings";
import { isPayHereEnabled } from "@/lib/integrations";
import { SettingsClient } from "@/components/admin/settings/SettingsClient";
import type {
  SubscriptionFrequencies,
  NotificationSettings,
  SeoSettings,
  MaintenanceSettings,
} from "@/types/admin";
import type { ShopInfo } from "@/types/checkout";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [shop, tax, frequencies, bank, cod, notifications, seo, maintenance] = await Promise.all([
    getShopInfo() as Promise<ShopInfo & { logo_url?: string }>,
    getTaxSettings(),
    getSetting<SubscriptionFrequencies>("subscription_frequencies", {
      weekly: true,
      biweekly: true,
      monthly: true,
      loyalty_bonus: 0,
    }),
    getBankDetails(),
    getCodLimits(),
    getSetting<NotificationSettings>("notifications", {
      email_enabled: true,
      whatsapp_enabled: true,
      events: {},
    }),
    getSetting<SeoSettings>("seo", { site_title: "", meta_description: "", og_image_url: "" }),
    getSetting<MaintenanceSettings>("maintenance", { enabled: false, message: "" }),
  ]);

  return (
    <SettingsClient
      shop={shop}
      tax={tax}
      frequencies={frequencies}
      bank={bank}
      cod={cod}
      notifications={notifications}
      seo={seo}
      maintenance={maintenance}
      payHereEnabled={isPayHereEnabled}
      payHereMode={process.env.PAYHERE_MODE ?? null}
    />
  );
}
