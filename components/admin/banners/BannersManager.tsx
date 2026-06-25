"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2, Images } from "lucide-react";
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
import { bannerSchema } from "@/lib/admin/schemas";
import { saveBanner, deleteBanner, reorderBanners, toggleBannerActive } from "@/lib/admin/banners";
import type { AdminBanner } from "@/types/admin";

type FormState = {
  image_url: string | null;
  mobile_image_url: string | null;
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_link: string;
  position: "hero" | "promo";
  display_order: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
};

const EMPTY: FormState = {
  image_url: null,
  mobile_image_url: null,
  headline: "",
  subheadline: "",
  cta_text: "",
  cta_link: "",
  position: "hero",
  display_order: 0,
  valid_from: "",
  valid_until: "",
  is_active: true,
};

export function BannersManager({ banners }: { banners: AdminBanner[] }) {
  const router = useRouter();
  const [list, setList] = useState(banners);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setList(banners), [banners]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY, display_order: list.length });
    setErrors({});
    setOpen(true);
  };
  const openEdit = (b: AdminBanner) => {
    setEditingId(b.id);
    setForm({
      image_url: b.image_url,
      mobile_image_url: b.mobile_image_url,
      headline: b.headline ?? "",
      subheadline: b.subheadline ?? "",
      cta_text: b.cta_text ?? "",
      cta_link: b.cta_link ?? "",
      position: (b.position as "hero" | "promo") ?? "hero",
      display_order: b.display_order,
      valid_from: b.valid_from ? b.valid_from.slice(0, 10) : "",
      valid_until: b.valid_until ? b.valid_until.slice(0, 10) : "",
      is_active: b.is_active,
    });
    setErrors({});
    setOpen(true);
  };

  const submit = async () => {
    const isPromo = form.position === "promo";
    const payload = {
      ...form,
      // A promo strip has no image or sub-headline — don't persist stale values.
      image_url: isPromo ? "" : form.image_url || "",
      mobile_image_url: isPromo ? "" : form.mobile_image_url || "",
      subheadline: isPromo ? "" : form.subheadline,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
    };
    const parsed = bannerSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setSaving(true);
    const res = await saveBanner(parsed.data, editingId ?? undefined);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(editingId ? "Banner updated." : "Banner created.");
    setOpen(false);
    router.refresh();
  };

  const onReorder = async (next: AdminBanner[]) => {
    setList(next);
    const res = await reorderBanners(next.map((b) => b.id));
    if (!res.ok) toast.error("Could not save order.");
  };

  const onToggle = async (b: AdminBanner, v: boolean) => {
    setList((l) => l.map((x) => (x.id === b.id ? { ...x, is_active: v } : x)));
    const res = await toggleBannerActive(b.id, v);
    if (!res.ok) {
      toast.error(res.error);
      setList((l) => l.map((x) => (x.id === b.id ? { ...x, is_active: !v } : x)));
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const res = await deleteBanner(deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (!res.ok) return toast.error(res.error);
    toast.success("Banner deleted.");
    router.refresh();
  };

  const isPromo = form.position === "promo";

  return (
    <>
      <AdminPageHeader
        title="Banners"
        description="Homepage hero slides and promo banners. Drag to reorder."
        actions={
          <Button onClick={openAdd} className="gap-2">
            <Plus className="h-4 w-4" /> New banner
          </Button>
        }
      />

      {list.length === 0 ? (
        <AdminEmpty
          icon={<Images className="h-7 w-7" />}
          title="No banners yet"
          action={
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" /> New banner
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
              <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg bg-sand">
                {b.image_url && (
                  <Image src={b.image_url} alt={b.headline ?? ""} fill className="object-cover" sizes="96px" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold text-green-deep">{b.headline || "Untitled"}</span>
                  <Badge variant="secondary" className="text-[10px] capitalize">{b.position}</Badge>
                  {!b.is_active && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                </div>
                {b.subheadline && <p className="truncate text-xs text-muted-foreground">{b.subheadline}</p>}
              </div>
              <Switch checked={b.is_active} onCheckedChange={(v) => onToggle(b, v)} />
              <Button size="icon" variant="ghost" onClick={() => openEdit(b)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="text-red-600" onClick={() => setDeleteId(b.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </Panel>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit banner" : "New banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Position first — it decides which fields below apply. */}
            <Field label="Position" hint={isPromo ? "A thin text bar at the very top of every page." : "A large banner at the top of the homepage."}>
              <select
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value as "hero" | "promo" }))}
                className="h-10 w-full rounded-lg border border-sand bg-white px-3 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green"
              >
                <option value="hero">Hero (big homepage banner)</option>
                <option value="promo">Promo strip (thin bar at the top)</option>
              </select>
            </Field>

            {/* Image — hero only */}
            {!isPromo && (
              <Field label="Image (desktop)" error={errors.image_url} hint="Wide photo shown on tablets and computers.">
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                  bucket="banner-images"
                  aspect="wide"
                />
              </Field>
            )}

            {/* Optional portrait crop for phones — hero only. Falls back to the
                desktop image on phones when left empty. */}
            {!isPromo && (
              <Field
                label="Mobile image (optional)"
                error={errors.mobile_image_url}
                hint="Tall/portrait crop of the same photo, shown only on phones. Leave empty to use the desktop image everywhere."
              >
                <ImageUpload
                  value={form.mobile_image_url}
                  onChange={(url) => setForm((f) => ({ ...f, mobile_image_url: url }))}
                  bucket="banner-images"
                  aspect="square"
                />
              </Field>
            )}

            <Field label={isPromo ? "Message" : "Headline"} error={errors.headline}>
              <Input
                value={form.headline}
                onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                placeholder={isPromo ? "e.g. 15% off all bottles this weekend" : undefined}
              />
            </Field>

            {/* Sub-headline — hero only */}
            {!isPromo && (
              <Field label="Sub-headline" error={errors.subheadline}>
                <Textarea
                  value={form.subheadline}
                  onChange={(e) => setForm((f) => ({ ...f, subheadline: e.target.value }))}
                  rows={2}
                />
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={isPromo ? "Link text (optional)" : "CTA text"}>
                <Input value={form.cta_text} onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value }))} placeholder={isPromo ? "Shop now" : undefined} />
              </Field>
              <Field label={isPromo ? "Link URL (optional)" : "CTA link"}>
                <Input value={form.cta_link} onChange={(e) => setForm((f) => ({ ...f, cta_link: e.target.value }))} placeholder="/shop" />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valid from">
                <Input type="date" value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
              </Field>
              <Field label="Valid until">
                <Input type="date" value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
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
              {editingId ? "Save changes" : "Create banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this banner?"
        confirmLabel="Delete banner"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
