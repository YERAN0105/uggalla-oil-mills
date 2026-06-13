import type { Metadata } from "next";
import { listCustomers } from "@/lib/admin/customers-data";
import { CustomersClient } from "@/components/admin/customers/CustomersClient";

export const metadata: Metadata = { title: "Customers" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const params = {
    search: get("search"),
    blocked: get("blocked"),
    hasOrders: get("hasOrders"),
    sort: get("sort"),
  };
  const rows = await listCustomers(params);
  return <CustomersClient rows={rows} params={params} />;
}
