"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { AdminPageHeader, AdminEmpty, Panel, Field, ConfirmDialog } from "@/components/admin/primitives";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { couponSchema } from "@/lib/admin/schemas";
import { saveCoupon, deleteCoupon, toggleCouponActive } from "@/lib/admin/coupons";
import type { AdminCoupon } from "@/types/admin";

interface Options {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
  products: { id: string; name: string }[];
}

type FormState = {
  code: string;
  type: "percent_off" | "flat_off" | "free_delivery";
  value: string;
  min_order_amount: string;
  max_discount: string;
  usage_limit_total: string;
  usage_limit_per_user: string;
  valid_from: string;
  valid_until: string;
  applies_to_type: "all" | "categories" | "brands" | "products";
  applies_to_ids: string[];
  is_active: boolean;
};

const EMPTY: FormState = {
  code: "",
  type: "percent_off",
  value: "",
  min_order_amount: "",
  max_discount: "",
  usage_limit_total: "",
  usage_limit_per_user: "",
  valid_from: "",
  valid_until: "",
  applies_to_type: "all",
  applies_to_ids: [],
  is_active: true,
};

const TYPE_LABEL: Record<string, string> = {
  percent_off: "% off",
  flat_off: "Flat off",
  free_delivery: "Free delivery",
};

export function CouponsManager({ coupons, options }: { coupons: AdminCoupon[]; options: Options }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (c: AdminCoupon) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      min_order_amount: c.min_order_amount != null ? String(c.min_order_amount) : "",
      max_discount: c.max_discount != null ? String(c.max_discount) : "",
      usage_limit_total: c.usage_limit_total != null ? String(c.usage_limit_total) : "",
      usage_limit_per_user: c.usage_limit_per_user != null ? String(c.usage_limit_per_user) : "",
      valid_from: c.valid_from ? c.valid_from.slice(0, 10) : "",
      valid_until: c.valid_until ? c.valid_until.slice(0, 10) : "",
      applies_to_type: c.applies_to.type,
      applies_to_ids: c.applies_to.type === "all" ? [] : c.applies_to.ids,
      is_active: c.is_active,
    });
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      code: form.code.toUpperCase(),
      type: form.type,
      value: form.value === "" ? 0 : Number(form.value),
      min_order_amount: form.min_order_amount === "" ? null : Number(form.min_order_amount),
      max_discount: form.max_discount === "" ? null : Number(form.max_discount),
      usage_limit_total: form.usage_limit_total === "" ? null : Number(form.usage_limit_total),
      usage_limit_per_user: form.usage_limit_per_user === "" ? null : Number(form.usage_limit_per_user),
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      applies_to_type: form.applies_to_type,
      applies_to_ids: form.applies_to_ids,
      is_active: form.is_active,
    };
    const parsed = couponSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSaving(true);
    const res = await saveCoupon(parsed.data, editingId ?? undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors)
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    toast.success(editingId ? "Coupon updated." : "Coupon created.");
    setOpen(false);
    router.refresh();
  };

  const onToggle = async (c: AdminCoupon, v: boolean) => {
    const res = await toggleCouponActive(c.id, v);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteCoupon(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Coupon deleted.");
    router.refresh();
  };

  const appliesOptions =
    form.applies_to_type === "categories"
      ? options.categories
      : form.applies_to_type === "brands"
        ? options.brands
        : form.applies_to_type === "products"
          ? options.products
          : [];

  const inputClass =
    "h-10 w-full rounded-lg border border-sand bg-white px-3 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <>
      <AdminPageHeader
        title="Coupons"
        description={`${coupons.length} coupon(s)`}
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> New coupon
          </Button>
        }
      />

      {coupons.length === 0 ? (
        <AdminEmpty
          icon={<Ticket className="h-7 w-7" />}
          title="No coupons yet"
          action={
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> New coupon
            </Button>
          }
        />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead className="hidden sm:table-cell">Usage</TableHead>
                <TableHead className="hidden md:table-cell">Validity</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-semibold text-green-deep">{c.code}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[c.type]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.type === "percent_off"
                      ? `${c.value}%`
                      : c.type === "flat_off"
                        ? formatCurrency(c.value)
                        : "—"}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {c.usage_count}
                    {c.usage_limit_total ? ` / ${c.usage_limit_total}` : ""}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                    {c.valid_from ? formatShortDate(c.valid_from) : "—"} →{" "}
                    {c.valid_until ? formatShortDate(c.valid_until) : "∞"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={(v) => onToggle(c, v)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => setDeleteId(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit coupon" : "New coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Code" error={errors.code} required>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="WELCOME10"
                />
              </Field>
              <Field label="Type" required>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FormState["type"] }))}
                  className={inputClass}
                >
                  <option value="percent_off">Percentage off</option>
                  <option value="flat_off">Flat amount off</option>
                  <option value="free_delivery">Free delivery</option>
                </select>
              </Field>
            </div>

            {form.type !== "free_delivery" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={form.type === "percent_off" ? "Percentage" : "Amount"} error={errors.value} required>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.value}
                    onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  />
                </Field>
                {form.type === "percent_off" && (
                  <Field label="Max discount cap" error={errors.max_discount}>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.max_discount}
                      onChange={(e) => setForm((f) => ({ ...f, max_discount: e.target.value }))}
                    />
                  </Field>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Min order amount" error={errors.min_order_amount}>
                <Input
                  type="number"
                  step="0.01"
                  value={form.min_order_amount}
                  onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Usage limit (total)" error={errors.usage_limit_total}>
                <Input
                  type="number"
                  value={form.usage_limit_total}
                  onChange={(e) => setForm((f) => ({ ...f, usage_limit_total: e.target.value }))}
                />
              </Field>
              <Field label="Usage limit (per customer)" error={errors.usage_limit_per_user}>
                <Input
                  type="number"
                  value={form.usage_limit_per_user}
                  onChange={(e) => setForm((f) => ({ ...f, usage_limit_per_user: e.target.value }))}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valid from">
                <Input
                  type="date"
                  value={form.valid_from}
                  onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))}
                />
              </Field>
              <Field label="Valid until">
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Applies to">
              <select
                value={form.applies_to_type}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    applies_to_type: e.target.value as FormState["applies_to_type"],
                    applies_to_ids: [],
                  }))
                }
                className={inputClass}
              >
                <option value="all">All products</option>
                <option value="categories">Specific categories</option>
                <option value="brands">Specific brands</option>
                <option value="products">Specific products</option>
              </select>
            </Field>

            {form.applies_to_type !== "all" && (
              <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-sand p-2">
                {appliesOptions.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.applies_to_ids.includes(o.id)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          applies_to_ids: e.target.checked
                            ? [...f.applies_to_ids, o.id]
                            : f.applies_to_ids.filter((x) => x !== o.id),
                        }))
                      }
                      className="h-4 w-4 rounded border-sand text-green focus:ring-green"
                    />
                    {o.name}
                  </label>
                ))}
              </div>
            )}

            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              Active
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create coupon"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this coupon?"
        description="Existing usage history is removed too. This cannot be undone."
        confirmLabel="Delete coupon"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
