"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, FolderTree } from "lucide-react";
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
import { categorySchema } from "@/lib/admin/schemas";
import {
  saveCategory,
  deleteCategory,
  reorderCategories,
  toggleCategoryActive,
} from "@/lib/admin/categories";
import type { AdminCategory } from "@/types/admin";

type FormState = {
  name: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  image_url: string | null;
  display_order: number;
  is_active: boolean;
  is_bulk: boolean;
};

const EMPTY: FormState = {
  name: "",
  slug: "",
  slugEdited: false,
  description: "",
  image_url: null,
  display_order: 0,
  is_active: true,
  is_bulk: false,
};

export function CategoriesManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [list, setList] = useState(categories);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setList(categories), [categories]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, display_order: list.length });
    setErrors({});
    setOpen(true);
  };

  const openEdit = (c: AdminCategory) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      slug: c.slug,
      slugEdited: true,
      description: c.description ?? "",
      image_url: c.image_url,
      display_order: c.display_order,
      is_active: c.is_active,
      is_bulk: c.is_bulk,
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
      is_bulk: form.is_bulk,
    };
    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSaving(true);
    const res = await saveCategory(parsed.data, editingId ?? undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors)
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    toast.success(editingId ? "Category updated." : "Category created.");
    setOpen(false);
    router.refresh();
  };

  const onReorder = async (next: AdminCategory[]) => {
    setList(next);
    const res = await reorderCategories(next.map((c) => c.id));
    if (!res.ok) toast.error("Could not save order.");
  };

  const onToggle = async (c: AdminCategory, value: boolean) => {
    setList((l) => l.map((x) => (x.id === c.id ? { ...x, is_active: value } : x)));
    const res = await toggleCategoryActive(c.id, value);
    if (!res.ok) {
      toast.error(res.error);
      setList((l) => l.map((x) => (x.id === c.id ? { ...x, is_active: !value } : x)));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteCategory(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Category deleted.");
    router.refresh();
  };

  return (
    <>
      <AdminPageHeader
        title="Categories"
        description="Organise products. Bulk categories default to the quote flow."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> New category
          </Button>
        }
      />

      {list.length === 0 ? (
        <AdminEmpty
          icon={<FolderTree className="h-7 w-7" />}
          title="No categories yet"
          description="Create your first category."
          action={
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> New category
            </Button>
          }
        />
      ) : (
        <SortableList
          items={list}
          onReorder={onReorder}
          className="space-y-2"
          renderItem={(c, handle) => (
            <Panel className="flex items-center gap-3 p-3">
              {handle}
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand">
                {c.image_url && (
                  <Image src={c.image_url} alt={c.name} fill className="object-cover" sizes="48px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-green-deep">{c.name}</span>
                  {c.is_bulk && <Badge variant="gold" className="text-[10px]">Bulk</Badge>}
                  {!c.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  /{c.slug} · {c.product_count} product{c.product_count === 1 ? "" : "s"}
                </p>
              </div>
              <Switch checked={c.is_active} onCheckedChange={(v) => onToggle(c, v)} aria-label="Active" />
              <Button size="icon" variant="ghost" onClick={() => openEdit(c)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setDeleteId(c.id)}
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
            <DialogTitle>{editingId ? "Edit category" : "New category"}</DialogTitle>
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
            <Field label="Image">
              <ImageUpload
                value={form.image_url}
                onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                bucket="category-images"
                aspect="wide"
              />
            </Field>
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch
                checked={form.is_bulk}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_bulk: v }))}
              />
              Bulk category (products default to quote flow)
            </label>
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
              {editingId ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this category?"
        description="This cannot be undone."
        confirmLabel="Delete category"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
