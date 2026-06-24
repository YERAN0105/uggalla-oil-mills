import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { BulkRequestForm } from "./BulkRequestForm";
import { getProducts } from "@/lib/products";
import { getCheckoutUser } from "@/lib/checkout/data";
import { brand } from "@/lib/brand";
import { Phone, Mail, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Bulk Order Request",
  description: `Request a wholesale or bulk coconut oil quote from ${brand.name}. We supply restaurants, hotels, bakeries, and exporters island-wide.`,
};

interface BulkRequestPageProps {
  searchParams: Promise<{ product?: string }>;
}

export default async function BulkRequestPage({ searchParams }: BulkRequestPageProps) {
  const sp = await searchParams;

  // Fetch bulk products for the selector + the logged-in user's saved addresses
  const [{ products: bulkProducts }, { user, addresses }] = await Promise.all([
    getProducts({ purchaseType: "bulk_quote" }),
    getCheckoutUser(),
  ]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Hero */}
      <div className="bg-green-deep text-white py-12">
        <Container>
          <FadeIn>
            <span className="text-gold text-xs font-semibold uppercase tracking-widest">
              Wholesale &amp; Bulk
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-2 mb-3">
              Request a Bulk Quote
            </h1>
            <p className="text-white/70 max-w-xl text-sm sm:text-base">
              Uggalla Oil Mills supplies bulk coconut oil to restaurants, hotels, bakeries, food manufacturers, and exporters across Sri Lanka. Fill in the form and we&apos;ll send you a competitive quote within 24 hours.
            </p>
          </FadeIn>
        </Container>
      </div>

      <Container className="py-10">
        <div className="grid lg:grid-cols-3 gap-10">
          {/* Form */}
          <div className="lg:col-span-2">
            <FadeIn>
              <div className="bg-white rounded-2xl border border-sand p-6 sm:p-8">
                <h2 className="font-display text-xl text-green-deep mb-6">
                  Tell Us What You Need
                </h2>
                <BulkRequestForm
                  products={bulkProducts}
                  preselectedProductId={sp.product}
                  user={user}
                  addresses={addresses}
                />
              </div>
            </FadeIn>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <FadeIn className="space-y-6">
              <div className="bg-white rounded-2xl border border-sand p-6">
                <h3 className="font-display text-lg text-green-deep mb-4">
                  Why Buy Bulk from Us?
                </h3>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  {[
                    "Pure, quality coconut oil — consistent in every order",
                    "Volume pricing — the more you order, the better the rate",
                    "20L food-grade cans or custom packaging available",
                    "Island-wide delivery within 2–5 business days",
                    "Export-ready documentation on request",
                    "Consistent quality — same batch, same standards",
                  ].map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green flex-shrink-0" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-green-deep text-white rounded-2xl p-6 space-y-4">
                <h3 className="font-display text-lg">Need to Talk First?</h3>
                <p className="text-white/70 text-sm">
                  Reach out to our sales team directly. We&apos;re happy to discuss pricing, logistics, and custom requirements.
                </p>
                <div className="space-y-3 text-sm">
                  <a
                    href={`tel:${brand.phone.replace(/\s/g, "")}`}
                    className="flex items-center gap-2 text-white hover:text-gold transition-colors"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    {brand.phone}
                  </a>
                  <a
                    href={`mailto:${brand.email}`}
                    className="flex items-center gap-2 text-white hover:text-gold transition-colors"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    {brand.email}
                  </a>
                  <div className="flex items-start gap-2 text-white/70">
                    <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    {brand.address}
                  </div>
                </div>
              </div>
            </FadeIn>
          </aside>
        </div>
      </Container>
    </div>
  );
}
