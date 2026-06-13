"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Panel, Field } from "@/components/admin/primitives";
import { ProductImagesManager } from "@/components/admin/products/ProductImagesManager";
import { slugify } from "@/lib/utils";
import { formatCurrency } from "@/lib/brand";
import { productSchema } from "@/lib/admin/schemas";
import { saveProduct } from "@/lib/admin/products";
import type { AdminProductDetail } from "@/types/admin";

interface Options {
  brands: { id: string; name: string }[];
  categories: { id: string; name: string; is_bulk: boolean }[];
}

type SizeRow = { id?: string; label: string; volume_ml: string; price: string };
type FactRow = { label: string; value: string };

export function ProductForm({
  product,
  options,
}: {
  product: AdminProductDetail | null;
  options: Options;
}) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(isEdit);
  const [brandId, setBrandId] = useState(product?.brand_id ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [shortDesc, setShortDesc] = useState(product?.short_description ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [facts, setFacts] = useState<FactRow[]>(product?.key_facts ?? []);
  const [purchaseType, setPurchaseType] = useState<"retail" | "bulk_quote">(
    product?.purchase_type ?? "retail"
  );
  const [basePrice, setBasePrice] = useState(String(product?.base_price ?? ""));
  const [sizes, setSizes] = useState<SizeRow[]>(
    product?.sizes.map((s) => ({
      id: s.id,
      label: s.label,
      volume_ml: s.volume_ml != null ? String(s.volume_ml) : "",
      price: String(s.price),
    })) ?? []
  );
  const [allowsSubscription, setAllowsSubscription] = useState(product?.allows_subscription ?? false);
  const [allowsNote, setAllowsNote] = useState(product?.allows_note ?? false);
  const [noteMax, setNoteMax] = useState(String(product?.note_max_chars ?? 200));
  const [stockTracked, setStockTracked] = useState(product?.stock_tracked ?? false);
  const [stockQty, setStockQty] = useState(String(product?.stock_quantity ?? 0));
  const [lowThreshold, setLowThreshold] = useState(String(product?.low_stock_threshold ?? 5));
  const [isPublished, setIsPublished] = useState(product?.is_published ?? false);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [isBestseller, setIsBestseller] = useState(product?.is_bestseller ?? false);
  const [metaTitle, setMetaTitle] = useState(product?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(product?.meta_description ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const markDirty = () => setDirty(true);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const computedBase =
    purchaseType === "retail"
      ? Math.min(...sizes.map((s) => Number(s.price) || Infinity))
      : Number(basePrice) || 0;

  const buildPayload = (publish: boolean) => ({
    name,
    slug,
    brand_id: brandId || null,
    category_id: categoryId,
    short_description: shortDesc,
    description,
    key_facts: facts.filter((f) => f.label.trim() && f.value.trim()),
    purchase_type: purchaseType,
    base_price: Number(basePrice) || 0,
    sizes: sizes.map((s) => ({
      id: s.id,
      label: s.label,
      volume_ml: s.volume_ml === "" ? null : Number(s.volume_ml),
      price: Number(s.price) || 0,
    })),
    allows_subscription: allowsSubscription,
    allows_note: allowsNote,
    note_max_chars: Number(noteMax) || 0,
    stock_tracked: stockTracked,
    stock_quantity: Number(stockQty) || 0,
    low_stock_threshold: Number(lowThreshold) || 0,
    is_published: publish,
    is_featured: isFeatured,
    is_bestseller: isBestseller,
    meta_title: metaTitle,
    meta_description: metaDesc,
  });

  const submit = async (publish: boolean) => {
    const payload = buildPayload(publish);
    const parsed = productSchema.safeParse(payload);
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors(Object.fromEntries(Object.entries(fe).map(([k, v]) => [k, v?.[0] ?? ""])));
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setErrors({});
    setSaving(true);
    const res = await saveProduct(parsed.data, product?.id);
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      if (res.fieldErrors)
        setErrors(Object.fromEntries(Object.entries(res.fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""])));
      return;
    }
    setDirty(false);
    setIsPublished(publish);
    toast.success(isEdit ? "Product saved." : "Product created.");
    if (!isEdit) {
      router.push(`/admin/products/${res.data!.id}/edit`);
    } else {
      router.refresh();
    }
  };

  const inputClass =
    "h-10 w-full rounded-lg border border-sand bg-white px-3 text-sm text-green-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green";

  return (
    <div className="pb-24" onChange={markDirty}>
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/products" aria-label="Back to products">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-green-deep">
          {isEdit ? "Edit product" : "New product"}
        </h1>
      </div>

      <div className="space-y-5">
        {/* Basic info */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Basic info</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" error={errors.name} required>
              <Input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!slugEdited) setSlug(slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Slug" error={errors.slug} required>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(true);
                }}
              />
            </Field>
            <Field label="Brand">
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className={inputClass}
              >
                <option value="">No brand</option>
                {options.brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category" error={errors.category_id} required>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a category…</option>
                {options.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.is_bulk ? " (bulk)" : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 space-y-4">
            <Field label="Short description" error={errors.short_description}>
              <Textarea value={shortDesc} onChange={(e) => setShortDesc(e.target.value)} rows={2} />
            </Field>
            <Field label="Description" hint="Plain text or markdown.">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
              />
            </Field>
          </div>
        </Panel>

        {/* Key facts */}
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-green-deep">Key facts</h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setFacts((f) => [...f, { label: "", value: "" }])}
              className="gap-1"
            >
              <Plus className="h-4 w-4" /> Add row
            </Button>
          </div>
          {facts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              e.g. Extraction: Cold-pressed · Shelf life: 12 months · Origin: Padukka
            </p>
          ) : (
            <div className="space-y-2">
              {facts.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Label"
                    value={f.label}
                    onChange={(e) =>
                      setFacts((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                  <Input
                    placeholder="Value"
                    value={f.value}
                    onChange={(e) =>
                      setFacts((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
                    }
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setFacts((arr) => arr.filter((_, j) => j !== i))}
                    className="shrink-0 text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Purchase type */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Purchase type</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setPurchaseType("retail");
                markDirty();
              }}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                purchaseType === "retail" ? "border-green bg-sage/30" : "border-sand"
              }`}
            >
              <div className="font-semibold text-green-deep">Retail</div>
              <p className="text-xs text-muted-foreground">Cart + checkout with sizes.</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setPurchaseType("bulk_quote");
                markDirty();
              }}
              className={`rounded-xl border-2 p-4 text-left transition-colors ${
                purchaseType === "bulk_quote" ? "border-green bg-sage/30" : "border-sand"
              }`}
            >
              <div className="font-semibold text-green-deep">Bulk Quote</div>
              <p className="text-xs text-muted-foreground">Request-a-quote, no cart.</p>
            </button>
          </div>
        </Panel>

        {/* Sizes / pricing */}
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-green-deep">
                {purchaseType === "retail" ? "Sizes & pricing" : "Indicative price"}
              </h2>
              {purchaseType === "retail" && (
                <p className="text-xs text-muted-foreground">
                  Base price (from) ={" "}
                  {isFinite(computedBase) ? formatCurrency(computedBase) : "—"} (calculated)
                </p>
              )}
            </div>
            {purchaseType === "retail" && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSizes((s) => [...s, { label: "", volume_ml: "", price: "" }])}
                className="gap-1"
              >
                <Plus className="h-4 w-4" /> Add size
              </Button>
            )}
          </div>

          {purchaseType === "bulk_quote" ? (
            <Field
              label="Base price (per unit, indicative)"
              error={errors.base_price}
              hint="Shown on the storefront as the indicative price for quotes."
            >
              <Input
                type="number"
                step="0.01"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                className="max-w-xs"
              />
            </Field>
          ) : (
            <>
              {errors.sizes && <p className="mb-2 text-xs text-red-600">{errors.sizes}</p>}
              {sizes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add at least one size (e.g. 200ml, 500ml, 1L).
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="hidden grid-cols-[1fr_120px_140px_40px] gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid">
                    <span>Label</span>
                    <span>Volume (ml)</span>
                    <span>Price</span>
                    <span />
                  </div>
                  {sizes.map((s, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_120px_140px_40px]">
                      <Input
                        placeholder="Label"
                        value={s.label}
                        onChange={(e) =>
                          setSizes((arr) => arr.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                        }
                      />
                      <Input
                        type="number"
                        placeholder="ml"
                        value={s.volume_ml}
                        onChange={(e) =>
                          setSizes((arr) =>
                            arr.map((x, j) => (j === i ? { ...x, volume_ml: e.target.value } : x))
                          )
                        }
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Price"
                        value={s.price}
                        onChange={(e) =>
                          setSizes((arr) => arr.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setSizes((arr) => arr.filter((_, j) => j !== i))}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </Panel>

        {/* Images */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Images</h2>
          {isEdit ? (
            <ProductImagesManager productId={product!.id} images={product!.images} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Save the product first, then upload and arrange images.
            </p>
          )}
        </Panel>

        {/* Options & subscription */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">
            Options & subscription
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch checked={allowsNote} onCheckedChange={(v) => { setAllowsNote(v); markDirty(); }} />
              Allow customer note
            </label>
            {allowsNote && (
              <Field label="Max note characters">
                <Input
                  type="number"
                  value={noteMax}
                  onChange={(e) => setNoteMax(e.target.value)}
                  className="max-w-[160px]"
                />
              </Field>
            )}
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch
                checked={allowsSubscription}
                disabled={purchaseType !== "retail"}
                onCheckedChange={(v) => { setAllowsSubscription(v); markDirty(); }}
              />
              Allow subscription (retail only)
            </label>
          </div>
        </Panel>

        {/* Stock */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Stock</h2>
          <label className="flex items-center gap-3 text-sm text-green-deep">
            <Switch checked={stockTracked} onCheckedChange={(v) => { setStockTracked(v); markDirty(); }} />
            Track stock
          </label>
          {stockTracked && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Current stock">
                <Input type="number" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              </Field>
              <Field label="Low stock threshold">
                <Input
                  type="number"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(e.target.value)}
                />
              </Field>
            </div>
          )}
        </Panel>

        {/* Display & status */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">Display & status</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch checked={isFeatured} onCheckedChange={(v) => { setIsFeatured(v); markDirty(); }} />
              Featured
            </label>
            <label className="flex items-center gap-3 text-sm text-green-deep">
              <Switch checked={isBestseller} onCheckedChange={(v) => { setIsBestseller(v); markDirty(); }} />
              Bestseller
            </label>
            <p className="text-xs text-muted-foreground">
              Use “Save &amp; Publish” to make the product live.
            </p>
          </div>
        </Panel>

        {/* SEO */}
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">SEO</h2>
          <div className="space-y-4">
            <Field label={`Meta title (${metaTitle.length}/60)`}>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
            </Field>
            <Field label={`Meta description (${metaDesc.length}/155)`}>
              <Textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                rows={2}
                maxLength={320}
              />
            </Field>
          </div>
        </Panel>
      </div>

      {/* Sticky footer */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-cream/95 px-4 py-3 backdrop-blur lg:pl-[17rem]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            {isPublished ? "Published" : "Draft"}
            {dirty && " · unsaved changes"}
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" asChild disabled={saving}>
              <Link href="/admin/products">Discard</Link>
            </Button>
            <Button variant="outline" onClick={() => submit(false)} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save draft
            </Button>
            <Button onClick={() => submit(true)} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save &amp; Publish
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
