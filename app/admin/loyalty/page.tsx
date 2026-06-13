import type { Metadata } from "next";
import { getLoyaltySettings } from "@/lib/settings";
import { getLoyaltyStats } from "@/lib/admin/loyalty-data";
import { LoyaltyClient } from "@/components/admin/loyalty/LoyaltyClient";

export const metadata: Metadata = { title: "Loyalty" };

export default async function LoyaltyPage() {
  const [settings, stats] = await Promise.all([getLoyaltySettings(), getLoyaltyStats()]);
  return <LoyaltyClient settings={settings} stats={stats} />;
}
