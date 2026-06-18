"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitContact } from "@/lib/marketing/actions";

const EMPTY = { name: "", phone: "", email: "", subject: "", message: "" };

export function ContactForm() {
  const [f, setF] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await submitContact(f);
    setLoading(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Thanks for reaching out — we'll be in touch soon.");
    setF(EMPTY);
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" required value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+94 77 XXX XXXX" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">Subject</Label>
        <Input id="contact-subject" value={f.subject} onChange={(e) => set("subject", e.target.value)} placeholder="How can we help?" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          rows={5}
          required
          value={f.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Tell us more..."
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green focus:border-green resize-none"
        />
      </div>
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? "Sending…" : "Send Message"}
      </Button>
    </form>
  );
}
