import type { Metadata } from "next";
import { listBulkRequests } from "@/lib/admin/bulk-data";
import { BulkRequestsClient } from "@/components/admin/bulk/BulkRequestsClient";

export const metadata: Metadata = { title: "Bulk Requests" };

export default async function BulkRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const params = {
    status: get("status"),
    search: get("search"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
  };
  const rows = await listBulkRequests(params);
  return <BulkRequestsClient rows={rows} params={params} />;
}
