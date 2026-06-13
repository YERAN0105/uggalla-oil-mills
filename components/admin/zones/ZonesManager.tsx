"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, Truck } from "lucide-react";
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
import { deliveryZoneSchema } from "@/lib/admin/schemas";
import { saveZone, deleteZone, toggleZoneActive } from "@/lib/admin/delivery-zones";
import type { DeliveryZone } from "@/types/checkout";

type FormState = {
  name: string;
  fee: string;
  estimated_time: string;
  min_order_amount: string;
  same_day_surcharge: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  fee: "",
  estimated_time: "",
  min_order_amount: "",
  same_day_surcharge: "",
  is_active: true,
};

export function ZonesManager({ zones }: { zones: DeliveryZone[] }) {
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
  const openEdit = (z: DeliveryZone) => {
    setEditingId(z.id);
    setForm({
      name: z.name,
      fee: String(z.fee),
      estimated_time: z.estimated_time ?? "",
      min_order_amount: z.min_order_amount != null ? String(z.min_order_amount) : "",
      same_day_surcharge: z.same_day_surcharge != null ? String(z.same_day_surcharge) : "",
      is_active: z.is_active,
    });
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      name: form.name,
      fee: form.fee === "" ? 0 : Number(form.fee),
      estimated_time: form.estimated_time,
      min_order_amount: form.min_order_amount === "" ? null : Number(form.min_order_amount),
      same_day_surcharge: form.same_day_surcharge === "" ? null : Number(form.same_day_surcharge),
      is_active: form.is_active,
    };
    const parsed = deliveryZoneSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSaving(true);
    const res = await saveZone(parsed.data, editingId ?? undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(editingId ? "Zone updated." : "Zone created.");
    setOpen(false);
    router.refresh();
  };

  const onToggle = async (z: DeliveryZone, v: boolean) => {
    const res = await toggleZoneActive(z.id, v);
    if (!res.ok) return toast.error(res.error);
    router.refresh();
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteZone(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Zone deleted.");
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader
        title="Delivery Zones"
        description="Delivery areas, fees and order minimums."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> New zone
          </Button>
        }
      />

      {zones.length === 0 ? (
        <AdminEmpty
          icon={<Truck className="h-7 w-7" />}
          title="No delivery zones"
          action={
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> New zone
            </Button>
          }
        />
      ) : (
        <Panel className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead className="hidden sm:table-cell">Est. time</TableHead>
                <TableHead className="hidden md:table-cell">Min order</TableHead>
                <TableHead className="hidden md:table-cell">Same-day</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {zones.map((z) => (
                <TableRow key={z.id}>
                  <TableCell className="font-medium text-green-deep">{z.name}</TableCell>
                  <TableCell className="text-sm">{formatCurrency(z.fee)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {z.estimated_time ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {z.min_order_amount != null ? formatCurrency(z.min_order_amount) : "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {z.same_day_surcharge != null ? formatCurrency(z.same_day_surcharge) : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={z.is_active} onCheckedChange={(v) => onToggle(z, v)} />
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(z)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setDeleteId(z.id)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit zone" : "New zone"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Name" error={errors.name} required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Delivery fee" error={errors.fee} required>
                <Input type="number" step="0.01" value={form.fee} onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))} />
              </Field>
              <Field label="Estimated time" error={errors.estimated_time}>
                <Input value={form.estimated_time} onChange={(e) => setForm((f) => ({ ...f, estimated_time: e.target.value }))} placeholder="1–2 days" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Min order amount" error={errors.min_order_amount}>
                <Input type="number" step="0.01" value={form.min_order_amount} onChange={(e) => setForm((f) => ({ ...f, min_order_amount: e.target.value }))} />
              </Field>
              <Field label="Same-day surcharge" error={errors.same_day_surcharge}>
                <Input type="number" step="0.01" value={form.same_day_surcharge} onChange={(e) => setForm((f) => ({ ...f, same_day_surcharge: e.target.value }))} />
              </Field>
            </div>
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))} />
              Active
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create zone"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this zone?"
        confirmLabel="Delete zone"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
