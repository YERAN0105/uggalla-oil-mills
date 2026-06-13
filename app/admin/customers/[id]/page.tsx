import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/admin/customers-data";
import { CustomerDetailClient } from "@/components/admin/customers/CustomerDetailClient";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerDetail(id);
  if (!customer) notFound();
  return <CustomerDetailClient customer={customer} />;
}
