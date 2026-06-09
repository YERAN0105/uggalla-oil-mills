import Link from "next/link";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { DropletSVG } from "@/components/shared/DropletSVG";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Decorative top accent */}
      <div className="h-1 bg-gradient-to-r from-green via-gold to-green" />

      {/* Header */}
      <header className="py-6 px-4">
        <div className="max-w-sm mx-auto flex justify-center">
          <BrandLogo variant="full" href="/" />
        </div>
      </header>

      {/* Decorative flourishes */}
      <div className="fixed top-16 left-6 opacity-10 pointer-events-none" aria-hidden="true">
        <DropletSVG size={80} className="text-green" />
      </div>
      <div className="fixed bottom-16 right-6 opacity-10 pointer-events-none" aria-hidden="true">
        <DropletSVG size={60} className="text-gold" />
      </div>
      <div className="fixed top-1/2 -translate-y-1/2 right-12 opacity-5 pointer-events-none" aria-hidden="true">
        <DropletSVG size={120} className="text-green" />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center text-xs text-muted-foreground">
        <Link href="/privacy" className="hover:text-green transition-colors">Privacy</Link>
        {" · "}
        <Link href="/terms" className="hover:text-green transition-colors">Terms</Link>
        {" · "}
        <Link href="/" className="hover:text-green transition-colors">Home</Link>
      </footer>
    </div>
  );
}
