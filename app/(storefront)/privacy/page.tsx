import type { Metadata } from "next";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `Privacy policy for ${brand.name}.`,
};

export default function PrivacyPage() {
  return (
    <>
      <section className="py-16 bg-green-deep text-white">
        <Container>
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Legal</span>
            <h1 className="font-display text-5xl font-bold">Privacy Policy</h1>
            <p className="text-white/60 mt-2 text-sm">Last updated: June 2026</p>
          </FadeIn>
        </Container>
      </section>

      <section className="py-16 bg-cream">
        <Container size="narrow">
          <FadeIn>
            <div className="prose max-w-none space-y-6 text-body">
              <p>
                {brand.name} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is committed to
                protecting your personal information. This policy explains how we collect, use,
                and safeguard your data when you use our website.
              </p>

              <h2 className="font-display text-2xl text-green-deep">Information We Collect</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Name, email address, phone number (when you register or order)</li>
                <li>Delivery address and preferences</li>
                <li>Order history and payment records</li>
                <li>Communications with our team</li>
                <li>Website usage data (via analytics, if enabled)</li>
              </ul>

              <h2 className="font-display text-2xl text-green-deep">How We Use Your Information</h2>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Processing and fulfilling your orders</li>
                <li>Sending order confirmations and delivery updates</li>
                <li>Responding to your enquiries</li>
                <li>Sending newsletters (only with your consent)</li>
                <li>Improving our website and services</li>
              </ul>

              <h2 className="font-display text-2xl text-green-deep">Data Security</h2>
              <p>
                We use Supabase with Row Level Security to store your data securely. Payment
                processing is handled by PayHere; we do not store card details on our servers.
              </p>

              <h2 className="font-display text-2xl text-green-deep">Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal data at any time.
                Contact us at{" "}
                <a href={`mailto:${brand.email}`} className="text-green hover:underline">
                  {brand.email}
                </a>{" "}
                to exercise these rights.
              </p>

              <h2 className="font-display text-2xl text-green-deep">Cookies</h2>
              <p>
                We use essential cookies for session management. We may use analytics cookies
                (opt-in only) to understand how visitors use our site.
              </p>
            </div>
          </FadeIn>
        </Container>
      </section>
    </>
  );
}
