"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, Tags } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader, AdminEmpty, Panel, Field, ConfirmDialog } from "@/components/admin/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { SortableList } from "@/components/admin/SortableList";
import { slugify } from "@/lib/utils";
import { brandSchema } from "@/lib/admin/schemas";
import { saveBrand, deleteBrand, reorderBrands, toggleBrandActive } from "@/lib/admin/brands";
import type { AdminBrand } from "@/types/admin";

type FormState = {
  name: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugEdited: false,
  description: "",
  image_url: null,
  display_order: 0,
  is_active: true,
};

export function BrandsManager({ brands }: { brands: AdminBrand[] }) {
  const router = useRouter();
  const [list, setList] = useState(brands);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setList(brands), [brands]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, display_order: list.length });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (b: AdminBrand) => {
    setEditingId(b.id);
    setForm({
      name: b.name,
      slug: b.slug,
      slugEdited: true,
      description: b.description ?? "",
      image_url: b.image_url,
      display_order: b.display_order,
      is_active: b.is_active,
    });
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description,
      image_url: form.image_url || "",
      display_order: form.display_order,
      is_active: form.is_active,
    };
    const parsed = brandSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSaving(true);
    const res = await saveBrand(parsed.data, editingId ?? undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors)
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    toast.success(editingId ? "Brand updated." : "Brand created.");
    setOpen(false);
    router.refresh();
  };

  const onReorder = async (next: AdminBrand[]) => {
    setList(next);
    const res = await reorderBrands(next.map((b) => b.id));
    if (!res.ok) toast.error("Could not save order.");
  };

  const onToggle = async (b: AdminBrand, value: boolean) => {
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, is_active: value } : x)));
    const res = await toggleBrandActive(b.id, value);
    if (!res.ok) {
      toast.error(res.error);
      setList((l) => l.map((x) => (x.id === b.id ? { ...x, is_active: !value } : x)));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteBrand(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Brand deleted.");
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader
        title="Brands"
        description="Manage product brands. Drag to reorder how they appear."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> New brand
          </Button>
        }
      />

      {list.length === 0 ? (
        <AdminEmpty
          icon={<Tags className="h-7 w-7" />}
          title="No brands yet"
          description="Create your first brand to organise products."
          action={
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> New brand
            </Button>
          }
        />
      ) : (
        <SortableList
          items={list}
          onReorder={onReorder}
          className="space-y-2"
          renderItem={(b, handle) => (
            <Panel className="flex items-center gap-3 p-3">
              {handle}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                {b.image_url && (
                  <Image src={b.image_url} alt={b.name} fill className="object-cover" sizes="48px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-green-deep">{b.name}</span>
                  {!b.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  /{b.slug} · {b.product_count} product{b.product_count === 1 ? "" : "s"}
                </p>
              </div>
              <Switch checked={b.is_active} onCheckedChange={(v) => onToggle(b, v)} aria-label="Active" />
              <Button size="icon" variant="ghost" onClick={() => openEdit(b)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeleteId(b.id)}
                className="text-red-600 hover:bg-red-50"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </Panel>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit brand" : "New brand"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field label="Name" error={errors.name} required>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    slug: f.slugEdited ? f.slug : slugify(e.target.value),
                  }))
                }
              />
            </Field>
            <Field label="Slug" error={errors.slug} required>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugEdited: true }))}
              />
            </Field>
            <Field label="Description" error={errors.description}>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </Field>
            <Field label="Logo / image">
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                bucket="brand-images"
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
              />
              Active (visible on storefront)
            </label>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Create brand"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this brand?"
        description="Products will keep their data but lose this brand assignment. This cannot be undone."
        confirmLabel="Delete brand"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
