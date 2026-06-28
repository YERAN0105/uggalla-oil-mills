import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description: `Return, refund, and cancellation policy for ${brand.name}.`,
};

export default function RefundPolicyPage() {
  return (
    <>
      <section className="py-16 bg-green-deep text-white">
        <Container>
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Legal</span>
            <h1 className="font-display text-5xl font-bold">Return &amp; Refund Policy</h1>
            <p className="text-white/60 mt-2 text-sm">Last updated: June 2026</p>
          </FadeIn>
        </Container>
      </section>

      <section className="py-16 bg-cream">
        <Container size="narrow">
          <FadeIn>
            <div className="prose max-w-none space-y-6 text-body">
              <p className="text-muted-foreground italic">
                Because our products are food items (edible oils), we are unable to accept
                returns for change of mind or once a product has been opened or used. We do,
                however, stand fully behind the quality of every order. If something arrives
                damaged, defective, or incorrect, we will make it right.
              </p>

              <h2 className="font-display text-2xl text-green-deep">1. Eligible Returns &amp; Refunds</h2>
              <p>
                You may request a replacement or refund if your order arrives in any of the
                following conditions:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>The product is damaged or leaking on arrival</li>
                <li>The product is defective or has passed its best-before date on delivery</li>
                <li>You received the wrong item or an incorrect quantity</li>
              </ul>

              <h2 className="font-display text-2xl text-green-deep">2. What We Cannot Accept</h2>
              <p>
                As a food-safety measure, we cannot accept returns or issue refunds for:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Change of mind or no longer needing the product</li>
                <li>Products that have been opened, used, or partially consumed</li>
                <li>Issues reported outside the timeframe below</li>
              </ul>

              <h2 className="font-display text-2xl text-green-deep">3. How to Make a Claim</h2>
              <p>
                Please contact us within <strong>48 hours</strong> of delivery at{" "}
                <a href="mailto:uggallaoilmills@gmail.com" className="text-green hover:underline">
                  uggallaoilmills@gmail.com
                </a>{" "}
                or via WhatsApp, with your order number and a clear photo of the issue (for
                damaged, defective, or incorrect items). Claims submitted with photo evidence
                help us resolve your request quickly.
              </p>

              <h2 className="font-display text-2xl text-green-deep">4. Resolution</h2>
              <p>
                Once we verify your claim, we will offer either a replacement of the affected
                item or a full refund, at our discretion. Where a return of the product is
                required, {brand.name} covers the return delivery cost for any item that was
                damaged, defective, or sent in error.
              </p>

              <h2 className="font-display text-2xl text-green-deep">5. Refund Method &amp; Timing</h2>
              <p>
                Approved refunds are issued to your original payment method. Online card and
                wallet payments made through PayHere are refunded to the same card or account.
                Please allow <strong>7–10 business days</strong> for the refund to be processed
                and reflected on your statement, depending on your bank or payment provider.
              </p>

              <h2 className="font-display text-2xl text-green-deep">6. Order Cancellations</h2>
              <p>
                You may cancel an order free of charge while it is still awaiting confirmation
                (before it has been processed for dispatch). To cancel, use the cancel option in
                your account order details or contact us as soon as possible. If the order was
                paid online, the amount will be refunded to your original payment method within
                the timeframe above.
              </p>

              <h2 className="font-display text-2xl text-green-deep">7. Contact</h2>
              <p>
                For any questions about returns, refunds, or cancellations, contact us at{" "}
                <a href="mailto:uggallaoilmills@gmail.com" className="text-green hover:underline">
                  uggallaoilmills@gmail.com
                </a>
                . {brand.name}, {brand.address}.
              </p>
            </div>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
