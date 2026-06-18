"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { subscribeNewsletter } from "@/lib/marketing/actions";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await subscribeNewsletter(email);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Thanks for subscribing! Check your inbox.");
    setEmail("");
  };

  return (
    <form className="flex gap-2 max-w-sm mx-auto" onSubmit={handleSubmit}>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="flex-1 h-11 rounded-lg border border-input bg-white px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green focus:border-green"
        aria-label="Email for newsletter"
      />
      <Button type="submit" size="default" disabled={loading}>
        {loading ? "…" : "Subscribe"}
      </Button>
    </form>
  );
}
