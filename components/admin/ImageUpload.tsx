"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadPublicImage } from "@/lib/admin/upload";
import { cn } from "@/lib/utils";

/** Single-image upload control for brands / categories / banners / settings. */
export function ImageUpload({
  value,
  onChange,
  bucket,
  prefix,
  aspect = "square",
  className,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  bucket: string;
  prefix?: string;
  aspect?: "square" | "wide";
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadPublicImage(bucket, file, prefix);
      onChange(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {value ? (
        <div
          className={cn(
            "group relative overflow-hidden rounded-xl border border-sand bg-sand/30",
            aspect === "wide" ? "aspect-[16/6]" : "aspect-square w-32"
          )}
        >
          <Image src={value} alt="" fill className="object-cover" sizes="200px" />
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-red-600 shadow hover:bg-white"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-sand bg-white text-sm text-muted-foreground transition-colors hover:border-green/40",
            aspect === "wide" ? "aspect-[16/6] w-full" : "aspect-square w-32"
          )}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-5 w-5" />
              Upload image
            </>
          )}
        </button>
      )}
    </div>
  );
}
