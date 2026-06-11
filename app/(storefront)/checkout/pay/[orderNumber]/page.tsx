import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPayHereEnabled } from "@/lib/integrations";
import { generateCheckoutParams, splitName } from "@/lib/payments/payhere";
import { signOrderToken } from "@/lib/orders/token";
import { PayHereRedirect } from "@/components/storefront/PayHereRedirect";
import type { AddressSnapshot } from "@/types/checkout";

export const dynamic = "force-dynamic";

interface PayPageProps {
  params: Promise<{ orderNumber: string }>;
}

export default async function PayHerePage({ params }: PayPageProps) {
  const { orderNumber } = await params;

  // If PayHere isn't configured we should never reach this — fail safe to success.
  if (!isPayHereEnabled) {
    redirect(`/order-success/${orderNumber}?t=${signOrderToken(orderNumber)}`);
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      "id, order_number, user_id, guest_email, guest_phone, payment_method, payment_status, total, address_snapshot"
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (!order) notFound();

  // Already paid → straight to success.
  if (order.payment_status === "paid") {
    redirect(`/order-success/${orderNumber}?t=${signOrderToken(orderNumber)}`);
  }
  if (order.payment_method !== "payhere") {
    redirect(`/order-success/${orderNumber}?t=${signOrderToken(orderNumber)}`);
  }

  // Resolve contact details for PayHere's required fields.
  const snapshot = order.address_snapshot as AddressSnapshot | null;
  let email = order.guest_email ?? "";
  if (!email && order.user_id) {
    const { data } = await admin.auth.admin.getUserById(order.user_id);
    email = data.user?.email ?? "";
  }
  const recipient = snapshot?.recipient ?? "Customer";
  const { firstName, lastName } = splitName(recipient);

  const checkoutParams = generateCheckoutParams({
    orderNumber: order.order_number,
    amount: Number(order.total),
    firstName,
    lastName,
    email: email || "customer@uggallaoilmills.lk",
    phone: snapshot?.phone ?? order.guest_phone ?? "",
    address: snapshot?.line1 ?? "Padukka",
    city: snapshot?.city ?? "Colombo",
    itemsLabel: `Order ${order.order_number}`,
  });

  return <PayHereRedirect params={checkoutParams} />;
}
