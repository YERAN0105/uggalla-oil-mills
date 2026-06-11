"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[account] route error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-sand bg-white px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <AlertCircle className="h-7 w-7" />
      </div>
      <h2 className="font-display text-lg text-green-deep">Something went wrong</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        We couldn&apos;t load this part of your account. Please try again.
      </p>
      <Button onClick={reset} className="mt-5">
        Try again
      </Button>
    </div>
  );
}
