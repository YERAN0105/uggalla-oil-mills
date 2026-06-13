"use client";

import { useTransition, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Phone, MessageCircle, PackageSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminPageHeader, AdminEmpty, Panel } from "@/components/admin/primitives";
import { formatShortDate } from "@/lib/date";
import type { BulkRequestListRow } from "@/lib/admin/bulk-data";

const STATUS: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "in_progress", label: "In progress" },
  { key: "quoted", label: "Quoted" },
  { key: "accepted", label: "Accepted" },
  { key: "rejected", label: "Rejected" },
  { key: "completed", label: "Completed" },
];

export function bulkStatusVariant(status: string): BadgeProps["variant"] {
  switch (status) {
    case "completed":
      return "default";
    case "accepted":
    case "quoted":
      return "gold";
    case "in_progress":
      return "sage";
    case "rejected":
      return "destructive";
    default:
      return "secondary";
  }
}

export function BulkRequestsClient({
  rows,
  params,
}: {
  rows: BulkRequestListRow[];
  params: Record<string, unknown>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState((params.search as string) || "");

  const setParam = (updates: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { ...params, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
    }
    startTransition(() => router.push(`${pathname}?${usp.toString()}`));
  };

  const active = (params.status as string) || "";

  return (
    <>
      <AdminPageHeader title="Bulk Requests" description={`${rows.length} request(s)`} />

      <Panel className="mb-4 space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ search });
          }}
          className="relative"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or phone…"
            className="pl-9"
          />
        </form>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setParam({ status: undefined })}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              !active ? "border-green bg-green text-white" : "border-sand text-muted-foreground"
            }`}
          >
            All
          </button>
          {STATUS.map((s) => (
            <button
              key={s.key}
              onClick={() => setParam({ status: s.key })}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                active === s.key ? "border-green bg-green text-white" : "border-sand text-muted-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </Panel>

      {rows.length === 0 ? (
        <AdminEmpty
          icon={<PackageSearch className="h-7 w-7" />}
          title="No bulk requests"
          description="Quote requests for loose / bulk oil appear here."
        />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Product</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead className="hidden sm:table-cell">Fulfillment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Submitted</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/admin/bulk-requests/${r.id}`}
                      className="font-semibold text-green-deep hover:underline"
                    >
                      {r.name}
                    </Link>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <a href={`tel:${r.phone}`} className="hover:text-green">
                        <Phone className="inline h-3 w-3" /> {r.phone}
                      </a>
                      <a
                        href={`https://wa.me/${r.phone.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-green"
                      >
                        <MessageCircle className="inline h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {r.product_name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {r.quantity} {r.unit}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm capitalize text-muted-foreground">
                    {r.fulfillment_type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={bulkStatusVariant(r.status)} className="text-[10px] capitalize">
                      {r.status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatShortDate(r.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}
    </>
  );
}
