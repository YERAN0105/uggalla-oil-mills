"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatDateTime } from "@/lib/date";
import type { AdminActivityLog } from "@/types/admin";

export function LogsClient({
  rows,
  total,
  page,
  perPage,
  admins,
  actions,
  params,
}: {
  rows: AdminActivityLog[];
  total: number;
  page: number;
  perPage: number;
  admins: { id: string; name: string }[];
  actions: string[];
  params: Record<string, unknown>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const setParam = (updates: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { ...params, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (k === "page" && !updates.page) continue;
      if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
    }
    startTransition(() => router.push(`${pathname}?${usp.toString()}`));
  };

  const selectClass =
    "h-9 rounded-lg border border-sand bg-white px-2 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <>
      <AdminPageHeader title="Activity Logs" description="Audit trail of admin actions." />

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={(params.admin as string) || ""}
            onChange={(e) => setParam({ admin: e.target.value || undefined, page: undefined })}
            className={selectClass}
          >
            <option value="">All admins</option>
            {admins.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <select
            value={(params.action as string) || ""}
            onChange={(e) => setParam({ action: e.target.value || undefined, page: undefined })}
            className={selectClass}
          >
            <option value="">All actions</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
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
        </div>
      </Panel>

      {rows.length === 0 ? (
        <AdminEmpty icon={<ScrollText className="h-7 w-7" />} title="No activity yet" />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="hidden md:table-cell">Target</TableHead>
                <TableHead className="hidden lg:table-cell">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {formatDateTime(l.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-green-deep">{l.admin_name ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{l.action}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {l.target_table ?? "—"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell max-w-xs truncate text-xs text-muted-foreground">
                    {l.metadata ? JSON.stringify(l.metadata) : "—"}
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
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>
              Previous
            </Button>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setParam({ page: String(page + 1) })}>
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
