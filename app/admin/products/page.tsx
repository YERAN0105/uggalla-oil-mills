import type { Metadata } from "next";
import { listProducts, getCatalogOptions } from "@/lib/admin/catalog-reads";
import { ProductsClient } from "@/components/admin/products/ProductsClient";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const get = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const page = Number(get("page") || "1") || 1;
  const perPage = Number(get("perPage") || "20") || 20;

  const params = {
    search: get("search"),
    brand: get("brand"),
    category: get("category"),
    purchaseType: get("purchaseType"),
    published: get("published"),
    featured: get("featured"),
    lowStock: get("lowStock"),
    sort: get("sort"),
    page,
    perPage,
  };

  const [{ rows, total }, options] = await Promise.all([
    listProducts(params),
    getCatalogOptions(),
  ]);

  return (
    <ProductsClient
      rows={rows}
      total={total}
      page={page}
      perPage={perPage}
      options={options}
      params={params}
    />
  );
}
