import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about ${brand.name} products and ordering.`,
};

const faqs = [
  {
    q: "What makes Uggalla Oil Mills oils different?",
    a: "Our oils are pure and natural — sourced from quality Sri Lankan produce, with no chemicals, no additives, and no preservatives. We focus on freshness and quality in every bottle.",
  },
  {
    q: "Which of your oils can I cook with?",
    a: "Our cooking oils — such as coconut, sunflower, and rice bran — are excellent for frying, sautéing, baking, and finishing dishes, with a clean, natural flavour that suits Sri Lankan cuisine. Specialty products like hair oil and lamp oil are not edible and should never be used for cooking; each product page makes this clear.",
  },
  {
    q: "Do you deliver island-wide?",
    a: "Yes, we deliver to all areas of Sri Lanka. Delivery fees and estimated times vary by zone. Check our Delivery Info page for details.",
  },
  {
    q: "How do I place a bulk/wholesale order?",
    a: "Visit our Bulk Orders page and fill out the quote request form. Our team will review your requirements and get back to you with pricing and delivery details.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept online payments via PayHere (cards, eZ Cash, mCash), bank transfers, and cash on delivery for eligible orders.",
  },
  {
    q: "Can I set up a reorder reminder?",
    a: "Yes! On any product page you can opt in to a reorder reminder. Choose your preferred frequency (weekly, fortnightly, or monthly) and we'll send you a reminder with a one-tap reorder link.",
  },
  {
    q: "How long does the oil keep?",
    a: "Shelf life varies by oil type. Stored in a cool, dry place, our oils typically stay fresh for 12–18 months from the production date — check the best-before date on each bottle.",
  },
  {
    q: "What sizes do you offer?",
    a: "We currently offer our Royal Coco oil in 200ml, 500ml, and 1 litre bottles and various packet sizes. Bulk loose oil is available on request.",
  },
];

export default function FAQPage() {
  return (
    <>
      <section className="py-16 bg-green-deep text-white">
        <Container>
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Help Centre</span>
            <h1 className="font-display text-5xl font-bold">Frequently Asked Questions</h1>
          </FadeIn>
        </Container>
      </section>

      <section className="py-16 bg-cream">
        <Container size="narrow">
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <details className="group bg-white rounded-xl border border-sand shadow-sm overflow-hidden">
                  <summary className="flex cursor-pointer items-center justify-between p-5 font-semibold text-green-deep hover:bg-sand/50 transition-colors list-none">
                    {faq.q}
                    <span className="ml-4 flex-shrink-0 text-green transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed border-t border-sand pt-4">
                    {faq.a}
                  </div>
                </details>
              </FadeIn>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
