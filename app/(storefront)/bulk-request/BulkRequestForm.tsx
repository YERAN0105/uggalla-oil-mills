"use client";

import { useState, useMemo, useRef } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FadeIn } from "@/components/shared/FadeIn";
import { submitBulkRequest } from "./actions";
import { BulkRequestSchema } from "./schema";
import type { ProductWithRelations } from "@/types/supabase";
import { cn } from "@/lib/utils";

interface BulkRequestFormProps {
  products: ProductWithRelations[];
  preselectedProductId?: string;
}

type Values = {
  name: string;
  email: string;
  product_id: string;
  quantity: string;
  unit: string;
  fulfillment_type: "delivery" | "pickup";
  address_line1: string;
  address_city: string;
  preferred_date: string;
  notes: string;
};

const SELECT_CLASS =
  "flex h-10 w-full rounded-md border border-input bg-cream px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-cream";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function BulkRequestForm({ products, preselectedProductId }: BulkRequestFormProps) {
  const [values, setValues] = useState<Values>({
    name: "",
    email: "",
    product_id: preselectedProductId ?? "",
    quantity: "",
    unit: "litres",
    fulfillment_type: "delivery",
    address_line1: "",
    address_city: "",
    preferred_date: "",
    notes: "",
  });
  const [phoneDigits, setPhoneDigits] = useState("");
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // The phone field is entered as 9 digits and combined with +94 for validation.
  const formValues = useMemo(
    () => ({ ...values, phone: phoneDigits ? `+94${phoneDigits}` : "" }),
    [values, phoneDigits]
  );

  // Live validation with the SAME schema the server uses.
  const errors = useMemo(() => {
    const result = BulkRequestSchema.safeParse(formValues);
    return result.success
      ? {}
      : (result.error.flatten().fieldErrors as Record<string, string[]>);
  }, [formValues]);

  // "Reward early, punish late": a field's error is shown only after it has been
  // blurred or a submit was attempted — then it clears live as the field becomes valid.
  const showError = (field: string): string | undefined =>
    touched.has(field) || submitted ? errors[field]?.[0] : undefined;

  const setField = (field: keyof Values, value: string) =>
    setValues((v) => ({ ...v, [field]: value }));

  const markTouched = (field: string) =>
    setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));

  const scrollToFirstError = () => {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.focus({ preventScroll: true });
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError(null);

    if (Object.keys(errors).length > 0) {
      scrollToFirstError();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitBulkRequest(formValues);
      if (res.status === "success") {
        setSuccessId(res.requestId);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setServerError(res.message);
        requestAnimationFrame(() =>
          formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        );
      }
    } catch {
      setServerError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successId) {
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

  const isDelivery = values.fulfillment_type === "delivery";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" noValidate>
      {serverError && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
          {serverError}
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
              placeholder="e.g. Nimal Perera"
              autoComplete="name"
              value={values.name}
              onChange={(e) => setField("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name") ? true : undefined}
              className={cn(showError("name") && "border-destructive")}
            />
            <FieldError message={showError("name")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="phone">Phone *</Label>
            <div className="flex">
              <span className="flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground select-none">
                +94
              </span>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="771234567"
                maxLength={9}
                autoComplete="tel-national"
                value={phoneDigits}
                onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ""))}
                onBlur={() => markTouched("phone")}
                aria-invalid={showError("phone") ? true : undefined}
                className={cn("rounded-l-none", showError("phone") && "border-destructive")}
              />
            </div>
            <FieldError message={showError("phone")} />
            {!showError("phone") && (
              <p className="text-xs text-muted-foreground">Enter 9 digits after +94, e.g. 771234567</p>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            onBlur={() => markTouched("email")}
            aria-invalid={showError("email") ? true : undefined}
            className={cn(showError("email") && "border-destructive")}
          />
          <FieldError message={showError("email")} />
        </div>
      </fieldset>

      {/* Product & quantity */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Product &amp; Quantity
        </legend>

        {products.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="product_id">Product of Interest *</Label>
            <select
              id="product_id"
              value={values.product_id}
              onChange={(e) => setField("product_id", e.target.value)}
              onBlur={() => markTouched("product_id")}
              aria-invalid={showError("product_id") ? true : undefined}
              className={cn(SELECT_CLASS, showError("product_id") && "border-destructive")}
            >
              <option value="">Select a product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <FieldError message={showError("product_id")} />
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="quantity">Quantity Needed *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              placeholder="e.g. 50"
              value={values.quantity}
              onChange={(e) => setField("quantity", e.target.value)}
              onBlur={() => markTouched("quantity")}
              aria-invalid={showError("quantity") ? true : undefined}
              className={cn(showError("quantity") && "border-destructive")}
            />
            <FieldError message={showError("quantity")} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="unit">Unit *</Label>
            <select
              id="unit"
              value={values.unit}
              onChange={(e) => setField("unit", e.target.value)}
              className={SELECT_CLASS}
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
                checked={values.fulfillment_type === opt.value}
                onChange={() => setField("fulfillment_type", opt.value)}
                className="mt-0.5 accent-green"
              />
              <div>
                <p className="text-sm font-semibold text-green-deep">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {isDelivery && (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="address_line1">Delivery Address *</Label>
              <Input
                id="address_line1"
                placeholder="Street address, area"
                value={values.address_line1}
                onChange={(e) => setField("address_line1", e.target.value)}
                onBlur={() => markTouched("address_line1")}
                aria-invalid={showError("address_line1") ? true : undefined}
                className={cn(showError("address_line1") && "border-destructive")}
              />
              <FieldError message={showError("address_line1")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address_city">City / Town *</Label>
              <Input
                id="address_city"
                placeholder="e.g. Colombo, Kandy"
                value={values.address_city}
                onChange={(e) => setField("address_city", e.target.value)}
                onBlur={() => markTouched("address_city")}
                aria-invalid={showError("address_city") ? true : undefined}
                className={cn(showError("address_city") && "border-destructive")}
              />
              <FieldError message={showError("address_city")} />
            </div>
          </div>
        )}
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
            type="date"
            value={values.preferred_date}
            onChange={(e) => setField("preferred_date", e.target.value)}
            min={new Date(Date.now() + 24 * 3600000).toISOString().split("T")[0]}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="notes">Notes / Special Requirements (optional)</Label>
          <Textarea
            id="notes"
            placeholder="Any special requirements, delivery instructions, or other details…"
            rows={4}
            maxLength={1000}
            value={values.notes}
            onChange={(e) => setField("notes", e.target.value)}
          />
        </div>
      </fieldset>

      <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={isSubmitting}>
        {isSubmitting ? (
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
