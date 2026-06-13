"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Download, Phone, MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminPageHeader, AdminEmpty, Panel } from "@/components/admin/primitives";
import { QuickStatusSelect } from "@/components/admin/orders/QuickStatusSelect";
import { formatCurrency } from "@/lib/brand";
import { formatDateTime } from "@/lib/date";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  orderStatusVariant,
} from "@/lib/orders/status";
import { bulkUpdateOrderStatus, bulkMarkPaid, exportOrdersCsv } from "@/lib/admin/orders";
import type { AdminOrderListRow } from "@/lib/admin/orders-data";

const STATUS_FILTERS = [
  "pending_confirmation",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "refunded",
];

export function OrdersClient({
  rows,
  total,
  page,
  perPage,
  params,
}: {
  rows: AdminOrderListRow[];
  total: number;
  page: number;
  perPage: number;
  params: Record<string, unknown>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState((params.search as string) || "");
  const [bulkStatus, setBulkStatus] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const activeStatuses = ((params.status as string) || "").split(",").filter(Boolean);

  const setParam = (updates: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged: Record<string, unknown> = { ...params, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (k === "page" && !updates.page) continue;
      if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
    }
    startTransition(() => router.push(`${pathname}?${usp.toString()}`));
  };

  const toggleStatus = (s: string) => {
    const next = activeStatuses.includes(s)
      ? activeStatuses.filter((x) => x !== s)
      : [...activeStatuses, s];
    setParam({ status: next.join(",") || undefined, page: undefined });
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const runBulkStatus = async () => {
    if (!bulkStatus) return;
    const res = await bulkUpdateOrderStatus([...selected], bulkStatus);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Updated ${res.data!.updated} order(s).`);
    setSelected(new Set());
    router.refresh();
  };

  const runMarkPaid = async () => {
    const res = await bulkMarkPaid([...selected]);
    if (!res.ok) return toast.error(res.error);
    toast.success(`Marked ${res.data!.updated} order(s) paid.`);
    setSelected(new Set());
    router.refresh();
  };

  const exportCsv = async () => {
    const res = await exportOrdersCsv({
      status: params.status as string,
      paymentMethod: params.paymentMethod as string,
      paymentStatus: params.paymentStatus as string,
      fulfillment: params.fulfillment as string,
      dateFrom: params.dateFrom as string,
      dateTo: params.dateTo as string,
      search: params.search as string,
    });
    if (!res.ok) return toast.error(res.error);
    const blob = new Blob([res.data!.csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectClass =
    "h-9 rounded-lg border border-sand bg-white px-2 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description={`${total} order${total === 1 ? "" : "s"}`}
        actions={
          <Button variant="outline" onClick={exportCsv} className="gap-2">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Panel className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ search, page: undefined });
            }}
            className="relative min-w-[220px] flex-1"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Order #, name, phone, email…"
              className="pl-9"
            />
          </form>
          <select
            value={(params.paymentMethod as string) || ""}
            onChange={(e) => setParam({ paymentMethod: e.target.value || undefined, page: undefined })}
            className={selectClass}
          >
            <option value="">Any method</option>
            <option value="cod">Cash on Delivery</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="payhere">PayHere</option>
          </select>
          <select
            value={(params.paymentStatus as string) || ""}
            onChange={(e) => setParam({ paymentStatus: e.target.value || undefined, page: undefined })}
            className={selectClass}
          >
            <option value="">Any payment status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="pending_transfer">Awaiting transfer</option>
            <option value="cod">COD</option>
            <option value="refunded">Refunded</option>
            <option value="rejected">Rejected</option>
          </select>
          <select
            value={(params.fulfillment as string) || ""}
            onChange={(e) => setParam({ fulfillment: e.target.value || undefined, page: undefined })}
            className={selectClass}
          >
            <option value="">Any fulfillment</option>
            <option value="delivery">Delivery</option>
            <option value="pickup">Pickup</option>
          </select>
          <input
            type="date"
            value={(params.dateFrom as string) || ""}
            onChange={(e) => setParam({ dateFrom: e.target.value || undefined, page: undefined })}
            className={selectClass}
            aria-label="From date"
          />
          <input
            type="date"
            value={(params.dateTo as string) || ""}
            onChange={(e) => setParam({ dateTo: e.target.value || undefined, page: undefined })}
            className={selectClass}
            aria-label="To date"
          />
          <select
            value={(params.sort as string) || ""}
            onChange={(e) => setParam({ sort: e.target.value || undefined, page: undefined })}
            className={selectClass}
          >
            <option value="">Newest</option>
            <option value="total">Highest total</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                activeStatuses.includes(s)
                  ? "border-green bg-green text-white"
                  : "border-sand text-muted-foreground hover:border-green/40"
              }`}
            >
              {ORDER_STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </Panel>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-green/30 bg-sage/30 px-4 py-2 text-sm">
          <span className="font-medium text-green-deep">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className={selectClass}
            >
              <option value="">Set status…</option>
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <Button size="sm" variant="outline" onClick={runBulkStatus} disabled={!bulkStatus}>
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={runMarkPaid}>
              Mark paid
            </Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <AdminEmpty
          icon={<ShoppingBag className="h-7 w-7" />}
          title="No orders found"
          description="Try adjusting the filters."
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
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Customer</TableHead>
                <TableHead className="hidden sm:table-cell">Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="hidden lg:table-cell">Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggleSelect(o.id)}
                      className="h-4 w-4 rounded border-sand text-green focus:ring-green"
                      aria-label={`Select ${o.order_number}`}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${o.order_number}`}
                      className="font-semibold text-green-deep hover:underline"
                    >
                      {o.order_number}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {o.items_count} item{o.items_count === 1 ? "" : "s"} · {o.fulfillment_type}
                    </p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="text-sm text-green-deep">{o.customer_name}</div>
                    {o.customer_phone && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <a href={`tel:${o.customer_phone}`} className="hover:text-green">
                          <Phone className="inline h-3 w-3" /> {o.customer_phone}
                        </a>
                        <a
                          href={`https://wa.me/${o.customer_phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-green"
                          aria-label="WhatsApp"
                        >
                          <MessageCircle className="inline h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDateTime(o.created_at)}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(o.total)}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="text-xs text-muted-foreground">
                      {PAYMENT_METHOD_LABEL[o.payment_method] ?? o.payment_method}
                    </div>
                    <Badge variant={o.payment_status === "paid" ? "sage" : "secondary"} className="text-[10px]">
                      {PAYMENT_STATUS_LABEL[o.payment_status] ?? o.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <Badge variant={orderStatusVariant(o.status)} className="text-[10px]">
                        {ORDER_STATUS_LABEL[o.status]}
                      </Badge>
                      <QuickStatusSelect orderId={o.id} status={o.status} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

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
    </>
  );
}
