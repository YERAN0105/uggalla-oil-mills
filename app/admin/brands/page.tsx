import type { Metadata } from "next";
import { listBrands } from "@/lib/admin/catalog-reads";
import { BrandsManager } from "@/components/admin/brands/BrandsManager";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const brands = await listBrands();
  return <BrandsManager brands={brands} />;
}
