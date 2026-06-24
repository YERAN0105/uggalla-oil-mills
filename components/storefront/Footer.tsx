"use client";

import Link from "next/link";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Container } from "@/components/shared/Container";
import { brand } from "@/lib/brand";
import { DropletSVG } from "@/components/shared/DropletSVG";
import type { NavCategory } from "@/components/storefront/Header";
import type { ShopInfo } from "@/types/checkout";

const supportLinks = [
  { href: "/faq", label: "FAQ" },
  { href: "/delivery-info", label: "Delivery Info" },
  { href: "/contact", label: "Contact Us" },
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/refund-policy", label: "Return & Refund Policy" },
  { href: "/privacy", label: "Privacy Policy" },
];

export function Footer({
  categories,
  shopInfo,
}: {
  categories: NavCategory[];
  shopInfo: ShopInfo;
}) {
  // Category links are data-driven so hidden categories drop out of the footer too.
  const quickLinks = [
    { href: "/shop", label: "Shop" },
    ...categories.map((c) => ({ href: `/shop?category=${c.slug}`, label: c.name })),
    { href: "/bulk-request", label: "Bulk Orders" },
    { href: "/about", label: "About Us" },
  ];

  return (
    <footer className="bg-green-deep text-white/80" aria-label="Site footer">
      {/* Newsletter band */}
      <div className="border-b border-white/10 py-10">
        <Container>
          <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:justify-between">
            <div>
              <p className="text-eyebrow text-gold/80 mb-1">Stay in the loop</p>
              <h3 className="font-display text-2xl text-white">
                Fresh oil news, recipes & offers
              </h3>
            </div>
            <form className="flex gap-2 w-full sm:w-auto" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 sm:w-64 h-11 rounded-lg border border-white/20 bg-white/10 px-4 text-white placeholder:text-white/40 focus:outline-none focus:border-gold text-sm"
                aria-label="Email address for newsletter"
              />
              <button
                type="submit"
                className="h-11 px-5 rounded-lg bg-gold text-green-deep font-semibold text-sm hover:bg-gold-warm transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </Container>
      </div>

      {/* Main footer grid */}
      <Container>
        <div className="py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo variant="full" href="/" className="mb-4" />
            <p className="text-sm leading-relaxed text-white/60 mb-5">
              Pure coconut oil from Padukka, Sri Lanka.
            </p>
            <div className="flex items-center gap-3">
              {brand.socials.facebook && (
                <a
                  href={brand.socials.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              )}
              {brand.socials.instagram && (
                <a
                  href={brand.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                  className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {/* WhatsApp */}
              <a
                href={`https://wa.me/${shopInfo.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="h-9 w-9 rounded-full border border-white/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
              Shop
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
              Support
            </h4>
            <ul className="space-y-2.5">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-gold transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm tracking-wide uppercase">
              Contact
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-sm text-white/60">
                <MapPin className="h-4 w-4 text-gold mt-0.5 flex-shrink-0" />
                {shopInfo.address}
              </li>
              <li>
                <a
                  href={`tel:${shopInfo.phone}`}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-gold transition-colors"
                >
                  <Phone className="h-4 w-4 text-gold flex-shrink-0" />
                  {shopInfo.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${shopInfo.email}`}
                  className="flex items-center gap-2 text-sm text-white/60 hover:text-gold transition-colors"
                >
                  <Mail className="h-4 w-4 text-gold flex-shrink-0" />
                  {shopInfo.email}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </Container>

      {/* Bottom bar */}
      <div className="border-t border-white/10 py-5">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/40">
            <p>
              © {new Date().getFullYear()} {shopInfo.name}. All rights reserved.
            </p>
            <div className="flex items-center gap-1">
              <DropletSVG size={16} className="text-gold/50" />
              <span>Pure coconut oil from Padukka, Sri Lanka</span>
            </div>
          </div>
        </Container>
      </div>
    </footer>
  );
}
