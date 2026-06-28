import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `Terms and conditions for ${brand.name}.`,
};

export default function TermsPage() {
  return (
    <>
      <section className="py-16 bg-green-deep text-white">
        <Container>
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Legal</span>
            <h1 className="font-display text-5xl font-bold">Terms &amp; Conditions</h1>
            <p className="text-white/60 mt-2 text-sm">Last updated: June 2026</p>
          </FadeIn>
        </Container>
      </section>

      <section className="py-16 bg-cream">
        <Container size="narrow">
          <FadeIn>
            <div className="prose max-w-none space-y-6 text-body">
              <p className="text-muted-foreground italic">
                Please read these terms carefully before using our website or placing an order. By
                accessing or using our platform, you agree to be bound by these terms.
              </p>

              <h2 className="font-display text-2xl text-green-deep">1. Use of the Website</h2>
              <p>
                This website is operated by {brand.name}. You may use the site for lawful purposes
                only. You agree not to use the site in any way that breaches applicable laws or
                causes harm to others.
              </p>

              <h2 className="font-display text-2xl text-green-deep">2. Orders &amp; Payment</h2>
              <p>
                All orders are subject to acceptance and product availability. Prices are displayed
                in Sri Lankan Rupees (LKR) and are subject to change without notice. Payment must
                be received in full before dispatch except for approved COD orders.
              </p>

              <h2 className="font-display text-2xl text-green-deep">3. Delivery</h2>
              <p>
                Delivery times are estimates only and may vary due to factors beyond our control.
                We are not liable for delays caused by couriers or unforeseen circumstances.
              </p>

              <h2 className="font-display text-2xl text-green-deep">4. Returns &amp; Refunds</h2>
              <p>
                If you receive a damaged, defective, or incorrect item, please contact us within
                48 hours of delivery. As our products are food items, we do not accept change-of-mind
                returns. Full details, including how to make a claim, refund timing, and
                cancellations, are set out in our{" "}
                <a href="/refund-policy" className="text-green hover:underline">
                  Return &amp; Refund Policy
                </a>
                .
              </p>

              <h2 className="font-display text-2xl text-green-deep">5. Intellectual Property</h2>
              <p>
                All content on this website, including text, images, logos, and design, is the
                property of {brand.name} and may not be reproduced without written permission.
              </p>

              <h2 className="font-display text-2xl text-green-deep">6. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the
                website after changes constitutes acceptance of the updated terms.
              </p>

              <h2 className="font-display text-2xl text-green-deep">7. Contact</h2>
              <p>
                For questions about these terms, please contact us at{" "}
                <a href={`mailto:${brand.email}`} className="text-green hover:underline">
                  {brand.email}
                </a>
                .
              </p>
            </div>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
