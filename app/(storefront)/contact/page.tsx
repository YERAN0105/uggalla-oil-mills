import type { Metadata } from "next";
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { ContactForm } from "@/components/storefront/ContactForm";
import { brand } from "@/lib/brand";
import { getShopInfo } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${brand.name}. We're here to help.`,
};

export default async function ContactPage() {
  const shopInfo = await getShopInfo();
  const whatsappNumber = shopInfo.whatsapp.replace(/\D/g, "");
  const mapSrc =
    brand.googleMapsEmbedUrl ||
    `https://www.google.com/maps?q=${encodeURIComponent(shopInfo.address)}&output=embed`;

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
                  to say hello. Reach out and we&apos;ll get back to you as quickly as possible.
                </p>

                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage/50 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-deep">Address</p>
                      <p className="text-muted-foreground text-sm">{shopInfo.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage/50 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-deep">Phone</p>
                      <a href={`tel:${shopInfo.phone}`} className="text-sm text-green hover:underline">
                        {shopInfo.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-sage/50 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-deep">Email</p>
                      <a href={`mailto:${shopInfo.email}`} className="text-sm text-green hover:underline">
                        {shopInfo.email}
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

                {/* Map */}
                <div className="rounded-xl overflow-hidden h-64 border border-sand">
                  <iframe
                    title={`${shopInfo.name} location on Google Maps`}
                    src={mapSrc}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
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
