import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getBulkRequestDetail } from "@/lib/admin/bulk-data";
import { isPayHereEnabled } from "@/lib/integrations";
import { BulkRequestDetail } from "@/components/admin/bulk/BulkRequestDetail";

export const metadata: Metadata = { title: "Bulk request" };

export default async function BulkRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const request = await getBulkRequestDetail(id);
  if (!request) notFound();
  return <BulkRequestDetail request={request} payHereEnabled={isPayHereEnabled} />;
}
