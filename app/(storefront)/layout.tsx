import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { WishlistProvider } from "@/components/storefront/WishlistProvider";
import { CookieConsent } from "@/components/storefront/CookieConsent";
import { JsonLd } from "@/components/shared/JsonLd";
import { MaintenanceGate } from "@/components/storefront/MaintenanceGate";
import { getCategories } from "@/lib/products";
import { getPromoBanner } from "@/lib/banners";
import { getShopInfo } from "@/lib/settings";
import { brand } from "@/lib/brand";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const gate = await MaintenanceGate();
  if (gate) return gate;

  const [categories, promo, shopInfo] = await Promise.all([
    getCategories(),
    getPromoBanner(),
    getShopInfo(),
  ]);

  const organizationLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: shopInfo.name,
    url: APP_URL,
    logo: `${APP_URL}/logo.jpeg`,
    description: brand.tagline,
    email: shopInfo.email,
    telephone: shopInfo.phone,
    address: { "@type": "PostalAddress", addressLocality: "Padukka", addressCountry: "LK" },
  };

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={organizationLd} />
      {/* Skip-to-content for keyboard / screen-reader users. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-green focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Header categories={categories} promo={promo} />
      <main className="flex-1" id="main-content">
        {children}
      </main>
      <Footer categories={categories} shopInfo={shopInfo} />
      <WhatsAppButton whatsapp={shopInfo.whatsapp} />
      <CartDrawer />
      <WishlistProvider />
      <CookieConsent />
    </div>
  );
}
