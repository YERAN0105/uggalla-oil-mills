import type { Metadata } from "next";
import { listSubscriptions, getSubscriptionStats } from "@/lib/admin/subscriptions-data";
import { SubscriptionsClient } from "@/components/admin/subscriptions/SubscriptionsClient";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const params = { status: get("status"), interval: get("interval"), search: get("search") };
  const [rows, stats] = await Promise.all([listSubscriptions(params), getSubscriptionStats()]);
  return <SubscriptionsClient rows={rows} stats={stats} params={params} />;
}
