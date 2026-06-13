import type { Metadata } from "next";
import { listActivityLogs, LOGS_PER_PAGE } from "@/lib/admin/logs-data";
import { LogsClient } from "@/components/admin/logs/LogsClient";

export const metadata: Metadata = { title: "Activity Logs" };

export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const page = Number(get("page") || "1") || 1;
  const params = {
    action: get("action"),
    admin: get("admin"),
    dateFrom: get("dateFrom"),
    dateTo: get("dateTo"),
    page,
  };
  const { rows, total, admins, actions } = await listActivityLogs(params);
  return (
    <LogsClient
      rows={rows}
      total={total}
      page={page}
      perPage={LOGS_PER_PAGE}
      admins={admins}
      actions={actions}
      params={params}
    />
  );
}
