import type { Metadata } from "next";
import { getPendingBankTransfers } from "@/lib/admin/orders-data";
import { PaymentsPendingClient } from "@/components/admin/payments/PaymentsPendingClient";

export const metadata: Metadata = { title: "Payments Pending" };

export default async function PaymentsPendingPage() {
  const rows = await getPendingBankTransfers();
  return <PaymentsPendingClient rows={rows} />;
}
