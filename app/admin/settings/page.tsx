import type { Metadata } from "next";
import {
  getSetting,
  getShopInfo,
  getTaxSettings,
  getBankDetails,
  getCodLimits,
  getPickupLimits,
} from "@/lib/settings";
import { isPayHereEnabled } from "@/lib/integrations";
import { SettingsClient } from "@/components/admin/settings/SettingsClient";
import type {
  SubscriptionFrequencies,
  NotificationSettings,
  SeoSettings,
  MaintenanceSettings,
  StorageCleanupSettings,
} from "@/types/admin";
import type { ShopInfo } from "@/types/checkout";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [shop, tax, frequencies, bank, cod, pickup, notifications, seo, maintenance, storageCleanup] =
    await Promise.all([
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
      getPickupLimits(),
      getSetting<NotificationSettings>("notifications", {
        email_enabled: true,
        whatsapp_enabled: true,
        events: {},
      }),
      getSetting<SeoSettings>("seo", { site_title: "", meta_description: "", og_image_url: "" }),
      getSetting<MaintenanceSettings>("maintenance", { enabled: false, message: "" }),
      getSetting<StorageCleanupSettings>("storage_cleanup", { enabled: false }),
    ]);

  return (
    <SettingsClient
      shop={shop}
      tax={tax}
      frequencies={frequencies}
      bank={bank}
      cod={cod}
      pickup={pickup}
      notifications={notifications}
      seo={seo}
      maintenance={maintenance}
      storageCleanup={storageCleanup}
      payHereEnabled={isPayHereEnabled}
      payHereMode={process.env.PAYHERE_MODE ?? null}
    />
  );
}
