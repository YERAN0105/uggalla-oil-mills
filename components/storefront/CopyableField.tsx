"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyableFieldProps {
  label: string;
  value: string;
  /** Show a copy button (defaults to false — plain display row). */
  copyable?: boolean;
}

/** A label/value row with an optional one-tap copy button. */
export function CopyableField({ label, value, copyable }: CopyableFieldProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy. Please copy it manually.");
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-green-deep break-all">{value}</p>
      </div>
      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          className={cn(
            "flex-shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-lg border transition-colors",
            copied
              ? "border-green bg-green/10 text-green"
              : "border-sand text-muted-foreground hover:border-green/40 hover:text-green"
          )}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
