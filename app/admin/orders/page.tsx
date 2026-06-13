import type { Metadata } from "next";
import { listOrders } from "@/lib/admin/orders-data";
import { OrdersClient } from "@/components/admin/orders/OrdersClient";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const page = Number(get("page") || "1") || 1;
  const perPage = 50;

  const params = {
    status: get("status"),
    paymentMethod: get("paymentMethod"),
    paymentStatus: get("paymentStatus"),
    fulfillment: get("fulfillment"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    search: get("search"),
    sort: get("sort"),
    page,
    perPage,
  };

  const { rows, total } = await listOrders(params);

  return <OrdersClient rows={rows} total={total} page={page} perPage={perPage} params={params} />;
}
