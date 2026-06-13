import type { Metadata } from "next";
import { listCoupons } from "@/lib/admin/coupons-data";
import { getCatalogOptions, getProductOptions } from "@/lib/admin/catalog-reads";
import { CouponsManager } from "@/components/admin/coupons/CouponsManager";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const [coupons, catalog, products] = await Promise.all([
    listCoupons(),
    getCatalogOptions(),
    getProductOptions(),
  ]);
  return (
    <CouponsManager
      coupons={coupons}
      options={{
        brands: catalog.brands,
        categories: catalog.categories.map((c) => ({ id: c.id, name: c.name })),
        products,
      }}
    />
  );
}
