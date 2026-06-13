import type { Metadata } from "next";
import { listCategories } from "@/lib/admin/catalog-reads";
import { CategoriesManager } from "@/components/admin/categories/CategoriesManager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await listCategories();
  return <CategoriesManager categories={categories} />;
}
