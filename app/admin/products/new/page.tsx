import type { Metadata } from "next";
import { getCatalogOptions } from "@/lib/admin/catalog-reads";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const options = await getCatalogOptions();
  return <ProductForm product={null} options={options} />;
}
