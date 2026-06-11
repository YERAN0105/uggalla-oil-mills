"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UploadCloud, CheckCircle2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadBankReceipt } from "@/lib/orders/receipt";

interface BankReceiptUploadProps {
  orderNumber: string;
  token: string;
  alreadyUploaded?: boolean;
  /** Called after a successful upload so the parent can refresh the order status. */
  onUploaded?: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

export function BankReceiptUpload({
  orderNumber,
  token,
  alreadyUploaded,
  onUploaded,
}: BankReceiptUploadProps) {
  const router = useRouter();
  const [done, setDone] = useState(!!alreadyUploaded);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("File is too large (max 5MB).");
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("orderNumber", orderNumber);
      fd.set("token", token);
      fd.set("file", file);
      const result = await uploadBankReceipt(fd);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDone(true);
      toast.success("Receipt uploaded — we'll verify it shortly.");
      onUploaded?.();
      // Re-render server components (e.g. the order-success page) so the status
      // reflects "Payment under review". Harmless on client-state pages.
      router.refresh();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (done) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-green/30 bg-green/5 p-4 text-sm">
        <CheckCircle2 className="h-5 w-5 text-green flex-shrink-0" />
        <div>
          <p className="font-semibold text-green-deep">Receipt received</p>
          <p className="text-muted-foreground">
            Thanks! We&apos;re verifying your payment and will confirm your order soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors",
          dragOver ? "border-green bg-green/5" : "border-sand hover:border-green/40"
        )}
      >
        {file ? (
          <>
            <FileText className="h-7 w-7 text-green" />
            <p className="text-sm font-medium text-green-deep">{file.name}</p>
            <p className="text-xs text-muted-foreground">Click to choose a different file</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-7 w-7 text-muted-foreground" />
            <p className="text-sm font-medium text-green-deep">Drag &amp; drop your receipt here</p>
            <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or PDF · up to 5MB</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <Button onClick={handleUpload} disabled={!file || uploading} className="w-full gap-2">
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading…
          </>
        ) : (
          "Upload Receipt"
        )}
      </Button>
    </div>
  );
}
