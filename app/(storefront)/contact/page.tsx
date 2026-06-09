import type { Metadata } from "next";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { ContactForm } from "@/components/storefront/ContactForm";
import { brand } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${brand.name}. We're here to help.`,
};

export default function ContactPage() {
  const whatsappNumber = brand.whatsapp.replace(/\D/g, "");

  return (
    <>
      <section className="py-16 bg-green-deep text-white">
        <Container>
          <FadeIn>
            <span className="text-eyebrow text-gold/80 mb-3 block">Get in Touch</span>
            <h1 className="font-display text-5xl font-bold">Contact Us</h1>
          </FadeIn>
        </Container>
      </section>

      <section className="py-16 bg-cream">
        <Container>
          <div className="grid lg:grid-cols-2 gap-14">
            {/* Contact info */}
            <FadeIn direction="right">
              <div className="space-y-8">
                <h2 className="font-display text-3xl text-green-deep">We&apos;d love to hear from you</h2>
                <p className="text-body">
                  Whether you have a question about our products, need a bulk quote, or just want
                  to say hello — reach out and we&apos;ll get back to you as quickly as possible.
                </p>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage/50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-deep">Address</p>
                      <p className="text-muted-foreground text-sm">{brand.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage/50 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-deep">Phone</p>
                      <a href={`tel:${brand.phone}`} className="text-sm text-green hover:underline">
                        {brand.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage/50 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-deep">Email</p>
                      <a href={`mailto:${brand.email}`} className="text-sm text-green hover:underline">
                        {brand.email}
                      </a>
                    </div>
                  </div>
                </div>

                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#25D366] text-white font-semibold text-sm hover:bg-[#1ebe5d] transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  Chat on WhatsApp
                </a>

                {/* Map placeholder */}
                <div className="rounded-xl overflow-hidden h-48 bg-sage/30 flex items-center justify-center border border-sand">
                  <div className="text-center text-muted-foreground text-sm space-y-1">
                    <MapPin className="h-8 w-8 mx-auto text-green/40" />
                    <p>Map embed coming soon</p>
                    <p className="text-xs">{brand.address}</p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Contact form */}
            <FadeIn direction="left">
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-sand">
                <h3 className="font-display text-2xl text-green-deep mb-6">Send us a message</h3>
                <ContactForm />
              </div>
            </FadeIn>
          </div>
        </Container>
      </section>
    </>
  );
}
