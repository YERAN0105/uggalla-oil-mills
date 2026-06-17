"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { UploadCloud, Loader2, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableList } from "@/components/admin/SortableList";
import { uploadPublicImage } from "@/lib/admin/upload";
import {
  addProductImages,
  deleteProductImage,
  reorderProductImages,
  setPrimaryImage,
  updateImageAlt,
} from "@/lib/admin/products";
import type { ProductImageRow } from "@/types/admin";

export function ProductImagesManager({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageRow[];
}) {
  const router = useRouter();
  const [list, setList] = useState(images);
  // Keep local state in sync with fresh server data after router.refresh()
  // (uploads/deletes), since useState only seeds `list` on first mount.
  useEffect(() => setList(images), [images]);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const images = [...files].filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      toast.error("Please choose image files.");
      return;
    }
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of images) {
        urls.push(await uploadPublicImage("product-images", f, productId));
      }
      const res = await addProductImages(productId, urls);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(`${urls.length} image(s) added.`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const onReorder = async (next: ProductImageRow[]) => {
    setList(next);
    const res = await reorderProductImages(productId, next.map((i) => i.id));
    if (!res.ok) toast.error("Could not save order.");
  };

  const onPrimary = async (id: string) => {
    const res = await setPrimaryImage(id, productId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setList((l) => l.map((i) => ({ ...i, is_primary: i.id === id })));
    toast.success("Primary image set.");
  };

  const onDelete = async (id: string) => {
    const res = await deleteProductImage(id, productId);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setList((l) => l.filter((i) => i.id !== id));
    router.refresh();
  };

  const onAlt = async (id: string, alt: string) => {
    await updateImageAlt(id, alt, productId);
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-sm transition-colors ${
          drag ? "border-green bg-sage/30" : "border-sand bg-white"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-green" />
        ) : (
          <UploadCloud className="h-6 w-6 text-green" />
        )}
        <p className="text-muted-foreground">Drag &amp; drop images here, or</p>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
      </div>

      {list.length > 0 && (
        <SortableList
          items={list}
          onReorder={onReorder}
          className="grid gap-3 sm:grid-cols-2"
          renderItem={(img, handle) => (
            <div className="flex gap-3 rounded-xl border border-sand bg-white p-3">
              <div className="flex flex-col items-center justify-between">
                {handle}
              </div>
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                <Image src={img.url} alt={img.alt_text ?? ""} fill className="object-cover" sizes="80px" />
                {img.is_primary && (
                  <Badge variant="gold" className="absolute left-1 top-1 text-[9px]">
                    Primary
                  </Badge>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Input
                  defaultValue={img.alt_text ?? ""}
                  placeholder="Alt text"
                  className="h-8 text-xs"
                  onBlur={(e) => onAlt(img.id, e.target.value)}
                />
                <div className="mt-auto flex items-center gap-1">
                  {!img.is_primary && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => onPrimary(img.id)}
                      className="h-7 gap-1 px-2 text-xs"
                    >
                      <Star className="h-3.5 w-3.5" /> Primary
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(img.id)}
                    className="h-7 gap-1 px-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
