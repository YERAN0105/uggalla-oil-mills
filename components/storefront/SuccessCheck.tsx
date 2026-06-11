"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";

/** Branded animated success checkmark for the order confirmation page. */
export function SuccessCheck() {
  return (
    <m.div
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green/10"
    >
      <m.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 16 }}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-green text-white"
      >
        <Check className="h-7 w-7" strokeWidth={3} />
      </m.span>
    </m.div>
  );
}
