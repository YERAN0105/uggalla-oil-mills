"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn } from "@/components/shared/FadeIn";
import { submitBulkRequest, type BulkRequestFormState } from "./actions";
import type { ProductWithRelations } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface BulkRequestFormProps {
  products: ProductWithRelations[];
  preselectedProductId?: string;
}

const initialState: BulkRequestFormState = { status: "idle" };

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-destructive mt-1">{errors[0]}</p>;
}

export function BulkRequestForm({ products, preselectedProductId }: BulkRequestFormProps) {
  const [state, action, pending] = useActionState(submitBulkRequest, initialState);

  if (state.status === "success") {
    return (
      <FadeIn className="text-center py-12 space-y-4">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green/10 mx-auto">
          <CheckCircle2 className="h-8 w-8 text-green" />
        </div>
        <h2 className="font-display text-2xl text-green-deep">Quote Request Received!</h2>
        <p className="text-muted-foreground max-w-sm mx-auto">
          Thank you! We&apos;ve received your bulk request and will send you a quote within 24 hours. Check your email for a confirmation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button asChild variant="outline">
            <Link href="/shop">Continue Shopping</Link>
          </Button>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </div>
      </FadeIn>
    );
  }

  const fieldErrors =
    state.status === "error" ? (state.fieldErrors ?? {}) : {};

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.status === "error" && state.fieldErrors == null && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {state.message}
        </div>
      )}

      {/* Contact info */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Your Contact Details
        </legend>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Nimal Perera"
              required
              aria-describedby={fieldErrors.name ? "name-error" : undefined}
              className={cn(fieldErrors.name && "border-destructive")}
            />
            <FieldError errors={fieldErrors.name} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="+94771234567"
              required
              aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              className={cn(fieldErrors.phone && "border-destructive")}
            />
            <FieldError errors={fieldErrors.phone} />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={cn(fieldErrors.email && "border-destructive")}
          />
          <FieldError errors={fieldErrors.email} />
        </div>
      </fieldset>

      {/* Product & quantity */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Product &amp; Quantity
        </legend>

        {products.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="product_id">Product of Interest</Label>
            <select
              id="product_id"
              name="product_id"
              defaultValue={preselectedProductId ?? ""}
              className="flex h-10 w-full rounded-md border border-input bg-cream px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <option value="">Select a product (optional)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity Needed *</Label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              placeholder="e.g. 50"
              required
              aria-describedby={fieldErrors.quantity ? "quantity-error" : undefined}
              className={cn(fieldErrors.quantity && "border-destructive")}
            />
            <FieldError errors={fieldErrors.quantity} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="unit">Unit *</Label>
            <select
              id="unit"
              name="unit"
              defaultValue="litres"
              className="flex h-10 w-full rounded-md border border-input bg-cream px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream"
            >
              <option value="litres">Litres</option>
              <option value="cans">Cans (20L each)</option>
              <option value="kg">Kilograms</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </fieldset>

      {/* Fulfillment */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Delivery or Pickup
        </legend>

        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { value: "delivery", label: "Delivery", desc: "We deliver island-wide" },
            { value: "pickup", label: "Mill Pickup", desc: "Collect from Padukka" },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex items-start gap-3 p-4 rounded-xl border border-sand hover:border-green/40 cursor-pointer has-[:checked]:border-green has-[:checked]:bg-green/5 transition-colors"
            >
              <input
                type="radio"
                name="fulfillment_type"
                value={opt.value}
                defaultChecked={opt.value === "delivery"}
                className="mt-0.5 accent-green"
              />
              <div>
                <p className="text-sm font-semibold text-green-deep">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="address_line1">Delivery Address (if delivery)</Label>
            <Input
              id="address_line1"
              name="address_line1"
              placeholder="Street address, area"
              aria-describedby={fieldErrors.address_line1 ? "address-error" : undefined}
              className={cn(fieldErrors.address_line1 && "border-destructive")}
            />
            <FieldError errors={fieldErrors.address_line1} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address_city">City / Town</Label>
            <Input id="address_city" name="address_city" placeholder="e.g. Colombo, Kandy" />
          </div>
        </div>
      </fieldset>

      {/* Preferred date & notes */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Additional Details
        </legend>

        <div className="space-y-1">
          <Label htmlFor="preferred_date">Preferred Date (optional)</Label>
          <Input
            id="preferred_date"
            name="preferred_date"
            type="date"
            min={new Date(Date.now() + 24 * 3600000).toISOString().split("T")[0]}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Notes / Special Requirements (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any special requirements, delivery instructions, or other details…"
            rows={4}
            maxLength={1000}
          />
        </div>
      </fieldset>

      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting…
          </>
        ) : (
          "Submit Quote Request"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        We typically respond within 24 hours.{" "}
        <Link href="/contact" className="underline hover:text-green transition-colors">
          Need faster help? Contact us directly.
        </Link>
      </p>
    </form>
  );
}
