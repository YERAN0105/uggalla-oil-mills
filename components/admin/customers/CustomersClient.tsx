"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, Plus, Users, Loader2, Copy } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminPageHeader, AdminEmpty, Panel, Field } from "@/components/admin/primitives";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { manualCustomerSchema } from "@/lib/admin/schemas";
import { createCustomer } from "@/lib/admin/customers";
import type { AdminCustomerRow } from "@/types/admin";

export function CustomersClient({
  rows,
  params,
}: {
  rows: AdminCustomerRow[];
  params: Record<string, unknown>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState((params.search as string) || "");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", send_invite: false });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const setParam = (updates: Record<string, string | undefined>) => {
    const usp = new URLSearchParams();
    const merged = { ...params, ...updates };
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "" && v !== null) usp.set(k, String(v));
    }
    startTransition(() => router.push(`${pathname}?${usp.toString()}`));
  };

  const submit = async () => {
    const parsed = manualCustomerSchema.safeParse({ ...form, phone: form.phone || "" });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSaving(true);
    const res = await createCustomer(parsed.data);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors)
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setOpen(false);
    setForm({ name: "", email: "", phone: "", send_invite: false });
    toast.success("Customer created.", {
      description: `Temp password: ${res.data!.tempPassword}`,
      action: {
        label: "Copy",
        onClick: () => navigator.clipboard.writeText(res.data!.tempPassword),
      },
      duration: 15000,
    });
    router.push(`/admin/customers/${res.data!.id}`);
  };

  const selectClass =
    "h-9 rounded-lg border border-sand bg-white px-2 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <>
      <AdminPageHeader
        title="Customers"
        description={`${rows.length} customer(s)`}
        actions={
          <Button onClick={() => setOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add customer
          </Button>
        }
      />

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setParam({ search });
            }}
            className="relative min-w-[220px] flex-1"
          >
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or phone…"
              className="pl-9"
            />
          </form>
          <select
            value={(params.blocked as string) || ""}
            onChange={(e) => setParam({ blocked: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">All statuses</option>
            <option value="0">Active</option>
            <option value="1">Blocked</option>
          </select>
          <select
            value={(params.hasOrders as string) || ""}
            onChange={(e) => setParam({ hasOrders: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Any</option>
            <option value="1">Has orders</option>
          </select>
          <select
            value={(params.sort as string) || ""}
            onChange={(e) => setParam({ sort: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Newest</option>
            <option value="value">Lifetime value</option>
            <option value="last_order">Last order</option>
          </select>
        </div>
      </Panel>

      {rows.length === 0 ? (
        <AdminEmpty icon={<Users className="h-7 w-7" />} title="No customers found" />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Lifetime</TableHead>
                <TableHead className="hidden lg:table-cell">Last order</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/admin/customers/${c.id}`}
                      className="font-semibold text-green-deep hover:underline"
                    >
                      {c.name || "Unnamed"}
                    </Link>
                    {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {c.email}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatShortDate(c.created_at)}
                  </TableCell>
                  <TableCell className="text-sm">{c.total_orders}</TableCell>
                  <TableCell className="text-sm font-medium">{formatCurrency(c.lifetime_value)}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {c.last_order_at ? formatShortDate(c.last_order_at) : "—"}
                  </TableCell>
                  <TableCell>
                    {c.blocked ? (
                      <Badge variant="destructive" className="text-[10px]">Blocked</Badge>
                    ) : (
                      <Badge variant="sage" className="text-[10px]">Active</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Name" error={errors.name} required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Email" error={errors.email} required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </Field>
            <Field label="Phone" error={errors.phone} hint="+94XXXXXXXXX">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch
                checked={form.send_invite}
                onCheckedChange={(v) => setForm((f) => ({ ...f, send_invite: v }))}
              />
              Send invite (password reset email — Phase 6)
            </label>
            <p className="flex items-start gap-1 text-xs text-muted-foreground">
              <Copy className="mt-0.5 h-3 w-3" /> A temporary password is generated and shown after
              creating.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
