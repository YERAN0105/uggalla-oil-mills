"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Copy,
  Trash2,
  ImageOff,
  Boxes,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AdminPageHeader, AdminEmpty, Panel, ConfirmDialog } from "@/components/admin/primitives";
import { formatCurrency } from "@/lib/brand";
import {
  toggleProductPublished,
  duplicateProduct,
  deleteProduct,
  bulkProductAction,
} from "@/lib/admin/products";
import type { AdminProductRow } from "@/types/admin";

interface Options {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string; is_bulk: boolean }[];
}

export function ProductsClient({
  rows,
  total,
  page,
  perPage,
  options,
  params,
}: {
  rows: AdminProductRow[];
  total: number;
  page: number;
  perPage: number;
  options: Options;
  params: Record<string, unknown>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState((params.search as string) || "");

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const setParam = (updates: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged: Record<string, unknown> = { ...params, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (k === "perPage" || k === "page") continue;
      if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
    }
    if (merged.perPage && merged.perPage !== 20) usp.set("perPage", String(merged.perPage));
    // reset to page 1 unless explicitly paging
    if (updates.page) usp.set("page", updates.page);
    startTransition(() => router.push(`${pathname}?${usp.toString()}`));
  };

  const toggleSelect = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const onTogglePublished = async (r: AdminProductRow, value: boolean) => {
    const res = await toggleProductPublished(r.id, value);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(value ? "Published" : "Unpublished");
    router.refresh();
  };

  const onDuplicate = async (id: string) => {
    const res = await duplicateProduct(id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Product duplicated.");
    router.push(`/admin/products/${res.data!.id}/edit`);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteProduct(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Product deleted.");
    router.refresh();
  };

  const runBulk = async (action: "publish" | "unpublish" | "feature" | "unfeature" | "delete") => {
    const ids = [...selected];
    const res = await bulkProductAction(ids, action);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Updated ${res.data!.count} product(s).`);
    setSelected(new Set());
    router.refresh();
  };

  const selectClass =
    "h-9 rounded-lg border border-sand bg-white px-2 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <>
      <AdminPageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        actions={
          <Button asChild className="gap-2">
            <Link href="/admin/products/new">
              <Plus className="h-4 w-4" /> New product
            </Link>
          </Button>
        }
      />

      {/* Filters */}
      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ search });
            }}
            className="relative flex-1 min-w-[200px]"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="pl-9"
            />
          </form>

          <select
            value={(params.brand as string) || ""}
            onChange={(e) => setParam({ brand: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">All brands</option>
            {options.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <select
            value={(params.category as string) || ""}
            onChange={(e) => setParam({ category: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">All categories</option>
            {options.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={(params.purchaseType as string) || ""}
            onChange={(e) => setParam({ purchaseType: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">All types</option>
            <option value="retail">Retail</option>
            <option value="bulk_quote">Bulk Quote</option>
          </select>

          <select
            value={(params.published as string) || ""}
            onChange={(e) => setParam({ published: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Any status</option>
            <option value="1">Published</option>
            <option value="0">Draft</option>
          </select>

          <select
            value={(params.sort as string) || ""}
            onChange={(e) => setParam({ sort: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="price">Price ↑</option>
            <option value="price_desc">Price ↓</option>
            <option value="updated">Recently updated</option>
          </select>

          <label className="flex items-center gap-2 text-sm text-green-deep">
            <input
              type="checkbox"
              checked={params.featured === "1"}
              onChange={(e) => setParam({ featured: e.target.checked ? "1" : undefined })}
              className="h-4 w-4 rounded border-sand text-green focus:ring-green"
            />
            Featured
          </label>
          <label className="flex items-center gap-2 text-sm text-green-deep">
            <input
              type="checkbox"
              checked={params.lowStock === "1"}
              onChange={(e) => setParam({ lowStock: e.target.checked ? "1" : undefined })}
              className="h-4 w-4 rounded border-sand text-green focus:ring-green"
            />
            Low stock
          </label>
        </div>
      </Panel>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-green/30 bg-sage/30 px-4 py-2 text-sm">
          <span className="font-medium text-green-deep">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => runBulk("publish")}>
              Publish
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("unpublish")}>
              Unpublish
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("feature")}>
              Feature
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk("unfeature")}>
              Unfeature
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => runBulk("delete")}
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <AdminEmpty
          icon={<Boxes className="h-7 w-7" />}
          title="No products found"
          description="Adjust your filters or add a new product."
          action={
            <Button asChild className="gap-2">
              <Link href="/admin/products/new">
                <Plus className="h-4 w-4" /> New product
              </Link>
            </Button>
          }
        />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-sand text-green focus:ring-green"
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Brand</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden sm:table-cell">Type</TableHead>
                <TableHead className="hidden lg:table-cell">Stock</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const low =
                  r.stock_tracked && r.stock_quantity <= r.low_stock_threshold;
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="h-4 w-4 rounded border-sand text-green focus:ring-green"
                        aria-label={`Select ${r.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-sand">
                          {r.primary_image ? (
                            <Image
                              src={r.primary_image}
                              alt={r.name}
                              fill
                              className="object-cover"
                              sizes="40px"
                            />
                          ) : (
                            <ImageOff className="absolute inset-0 m-auto h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link
                            href={`/admin/products/${r.id}/edit`}
                            className="block truncate font-medium text-green-deep hover:underline"
                          >
                            {r.name}
                          </Link>
                          <div className="flex items-center gap-1">
                            {r.is_featured && (
                              <Badge variant="gold" className="text-[10px]">Featured</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.brand_name ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {r.category_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatCurrency(r.base_price)}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant={r.purchase_type === "bulk_quote" ? "secondary" : "sage"} className="text-[10px]">
                        {r.purchase_type === "bulk_quote" ? "Bulk" : "Retail"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm">
                      {r.stock_tracked ? (
                        <span className={low ? "font-medium text-red-600" : "text-muted-foreground"}>
                          {r.stock_quantity}
                          {low && " · low"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={r.is_published}
                        onCheckedChange={(v) => onTogglePublished(r, v)}
                        aria-label="Published"
                      />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" aria-label="Actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/products/${r.id}/edit`}>
                              <Pencil className="h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDuplicate(r.id)}>
                            <Copy className="h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(r.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setParam({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setParam({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this product?"
        description="If the product has orders it will be hidden (soft-deleted); otherwise it's removed permanently."
        confirmLabel="Delete product"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
