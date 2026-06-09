"use client";

import { Button } from "@/components/ui/button";

export function NewsletterForm() {
  return (
    <form
      className="flex gap-2 max-w-sm mx-auto"
      onSubmit={(e) => e.preventDefault()}
    >
      <input
        type="email"
        placeholder="your@email.com"
        className="flex-1 h-11 rounded-lg border border-input bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green focus:border-green"
        aria-label="Email for newsletter"
      />
      <Button type="submit" size="default">
        Subscribe
      </Button>
    </form>
  );
}
