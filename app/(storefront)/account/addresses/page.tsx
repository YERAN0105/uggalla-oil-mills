import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountPageHeading } from "@/components/account/primitives";
import { AddressesManager } from "@/components/account/AddressesManager";
import { getAccountUser, getAccountAddresses } from "@/lib/account/data";
import { getDeliveryZones } from "@/lib/checkout/data";

export const metadata: Metadata = { title: "Addresses" };

export default async function AddressesPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/addresses");

  const [addresses, zones] = await Promise.all([
    getAccountAddresses(user.id),
    getDeliveryZones(),
  ]);

  return (
    <div>
      <AccountPageHeading title="Addresses" description="Manage where we deliver your orders." />
      <AddressesManager addresses={addresses} zones={zones} />
    </div>
  );
}
