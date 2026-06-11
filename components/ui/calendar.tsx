"use client";

import { DayPicker, type DayPickerProps } from "react-day-picker";
import "react-day-picker/style.css";
import { cn } from "@/lib/utils";

/**
 * Brand-styled single-date picker. Wraps react-day-picker and themes it to the
 * green/gold palette via CSS custom properties. Disabled-day logic (lead time,
 * holidays, past dates) is passed in by the caller through `disabled`.
 */
export function Calendar({ className, ...props }: DayPickerProps) {
  return (
    <DayPicker
      className={cn("rdp-uggalla", className)}
      style={
        {
          // react-day-picker v9 theming hooks
          "--rdp-accent-color": "var(--color-green)",
          "--rdp-accent-background-color": "rgba(27,107,58,0.1)",
          "--rdp-today-color": "var(--color-gold-warm)",
          "--rdp-day-width": "2.4rem",
          "--rdp-day-height": "2.4rem",
          "--rdp-day_button-width": "2.4rem",
          "--rdp-day_button-height": "2.4rem",
          "--rdp-font-family": "var(--font-sans)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
