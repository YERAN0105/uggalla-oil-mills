"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "uggalla-cookie-consent";

/**
 * Lightweight cookie-consent banner. Purely informational (we only use essential
 * cookies for auth/cart) — stores the acknowledgement in localStorage. Respects
 * the mounted-guard pattern to avoid a hydration mismatch.
 */
export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      // localStorage unavailable — don't nag.
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // ignore
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-border bg-cream/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-cream/80"
    >
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-green-deep">
          We use essential cookies to keep you signed in and remember your cart. See our{" "}
          <Link href="/privacy" className="underline hover:text-green">
            Privacy Policy
          </Link>
          .
        </p>
        <Button onClick={accept} size="sm" className="shrink-0">
          Got it
        </Button>
      </div>
    </div>
  );
}
