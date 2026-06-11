import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { WhatsAppButton } from "@/components/storefront/WhatsAppButton";
import { CartDrawer } from "@/components/storefront/CartDrawer";
import { WishlistProvider } from "@/components/storefront/WishlistProvider";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1" id="main-content">
        {children}
      </main>
      <Footer />
      <WhatsAppButton />
      <CartDrawer />
      <WishlistProvider />
    </div>
  );
}
