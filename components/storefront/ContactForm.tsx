"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ContactForm() {
  return (
    <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Name</Label>
          <Input id="contact-name" placeholder="Your name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-phone">Phone</Label>
          <Input id="contact-phone" type="tel" placeholder="+94 77 XXX XXXX" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-email">Email</Label>
        <Input id="contact-email" type="email" placeholder="you@email.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">Subject</Label>
        <Input id="contact-subject" placeholder="How can we help?" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          rows={5}
          placeholder="Tell us more..."
          className="w-full rounded-lg border border-input bg-white px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-green focus:border-green resize-none"
        />
      </div>
      <Button type="submit" className="w-full" size="lg">
        Send Message
      </Button>
    </form>
  );
}
