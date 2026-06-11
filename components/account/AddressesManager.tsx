"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Plus, Pencil, Trash2, Star, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/account/primitives";
import { accountAddressSchema } from "@/lib/account/schema";
import { saveAddress, deleteAddress, setDefaultAddress } from "@/lib/account/actions";
import type { AccountAddress } from "@/types/account";
import type { DeliveryZone } from "@/types/checkout";

type FormState = {
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postal_code: string;
  delivery_zone_id: string;
  is_default: boolean;
};

const EMPTY: FormState = {
  label: "",
  recipient: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  postal_code: "",
  delivery_zone_id: "",
  is_default: false,
};

export function AddressesManager({
  addresses,
  zones,
}: {
  addresses: AccountAddress[];
  zones: DeliveryZone[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, is_default: addresses.length === 0 });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (a: AccountAddress) => {
    setEditingId(a.id);
    setForm({
      label: a.label ?? "",
      recipient: a.recipient,
      phone: a.phone ?? "",
      line1: a.line1,
      line2: a.line2 ?? "",
      city: a.city,
      postal_code: a.postal_code ?? "",
      delivery_zone_id: a.delivery_zone_id ?? "",
      is_default: a.is_default,
    });
    setErrors({});
    setOpen(true);
  };

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    const payload = {
      ...form,
      delivery_zone_id: form.delivery_zone_id || null,
    };
    const parsed = accountAddressSchema.safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(flat).map(([k, v]) => [k, v?.[0] ?? ""])) as Record<string, string>
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await saveAddress(parsed.data, editingId ?? undefined);
      if (!res.ok) {
        toast.error(res.error);
        if (res.fieldErrors) {
          setErrors(
            Object.fromEntries(
              Object.entries(res.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])
            ) as Record<string, string>
          );
        }
        return;
      }
      toast.success(editingId ? "Address updated." : "Address saved.");
      setOpen(false);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setPendingId(id);
    try {
      const res = await deleteAddress(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Address removed.");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setPendingId(id);
    try {
      const res = await setDefaultAddress(id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Default address updated.");
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add new address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPin className="h-7 w-7 text-green" />}
          title="No saved addresses"
          description="Save an address to make checkout faster next time."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {addresses.map((a) => {
            const zone = zones.find((z) => z.id === a.delivery_zone_id);
            return (
              <div key={a.id} className="relative rounded-2xl border border-sand bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-green-deep">{a.label || "Address"}</span>
                    {a.is_default && (
                      <Badge variant="sage" className="gap-1 text-[10px]">
                        <Star className="h-2.5 w-2.5 fill-current" /> Default
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-sm text-green-deep">{a.recipient}</p>
                {a.phone && <p className="text-sm text-muted-foreground">{a.phone}</p>}
                <p className="text-sm text-muted-foreground">
                  {[a.line1, a.line2, a.city, a.postal_code].filter(Boolean).join(", ")}
                </p>
                {zone && <p className="mt-1 text-xs text-muted-foreground">Zone: {zone.name}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {!a.is_default && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendingId === a.id}
                      onClick={() => handleSetDefault(a.id)}
                      className="gap-1"
                    >
                      <Star className="h-3.5 w-3.5" /> Set default
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(a)} className="gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pendingId === a.id}
                    onClick={() => handleDelete(a.id)}
                    className="gap-1 text-red-600 hover:bg-red-50"
                  >
                    {pendingId === a.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / edit modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit address" : "Add new address"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Field label="Label" error={errors.label}>
              <Input value={form.label} onChange={(e) => set("label", e.target.value)} placeholder="Home, Office…" />
            </Field>
            <Field label="Recipient name" error={errors.recipient} required>
              <Input value={form.recipient} onChange={(e) => set("recipient", e.target.value)} />
            </Field>
            <Field label="Phone" error={errors.phone} required>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+947XXXXXXXX" />
            </Field>
            <Field label="Address line 1" error={errors.line1} required>
              <Input value={form.line1} onChange={(e) => set("line1", e.target.value)} />
            </Field>
            <Field label="Address line 2" error={errors.line2}>
              <Input value={form.line2} onChange={(e) => set("line2", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" error={errors.city} required>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Postal code" error={errors.postal_code}>
                <Input value={form.postal_code} onChange={(e) => set("postal_code", e.target.value)} />
              </Field>
            </div>
            <Field label="Delivery zone" error={errors.delivery_zone_id}>
              <select
                value={form.delivery_zone_id}
                onChange={(e) => set("delivery_zone_id", e.target.value)}
                className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
              >
                <option value="">No preferred zone</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm text-green-deep">
              <input
                type="checkbox"
                checked={form.is_default}
                onChange={(e) => set("is_default", e.target.checked)}
                className="h-4 w-4 rounded border-sand text-green focus:ring-green"
              />
              Set as default address
            </label>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Save address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="mb-1 block">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </Label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
