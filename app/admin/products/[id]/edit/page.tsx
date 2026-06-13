import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductDetail, getCatalogOptions } from "@/lib/admin/catalog-reads";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const metadata: Metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, options] = await Promise.all([getProductDetail(id), getCatalogOptions()]);
  if (!product) notFound();
  return <ProductForm product={product} options={options} />;
}
