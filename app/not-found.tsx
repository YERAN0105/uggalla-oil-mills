import Link from "next/link";
import { Home, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/shared/Container";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { BrandLogo } from "@/components/shared/BrandLogo";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-green via-gold to-green" />

      <header className="py-6 px-4 flex justify-center">
        <BrandLogo variant="full" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <Container size="narrow">
          <div className="text-center space-y-6">
            {/* SVG illustration */}
            <div className="relative mx-auto w-40 h-40" aria-hidden="true">
              {/* Large decorative droplet */}
              <div className="absolute inset-0 flex items-center justify-center">
                <DropletSVG size={120} className="text-green/20" />
              </div>
              {/* 404 text */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-5xl font-bold text-green/40">404</span>
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="font-display text-4xl font-bold text-green-deep">
                Page not found
              </h1>
              <p className="text-muted-foreground text-lg max-w-sm mx-auto">
                Looks like this page has dried up. Let&apos;s get you back to fresh, pure coconut oil.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Button variant="default" size="lg" asChild>
                <Link href="/">
                  <Home className="h-4 w-4" /> Go Home
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/shop">
                  <ShoppingBag className="h-4 w-4" /> Browse Shop
                </Link>
              </Button>
            </div>

            <p className="text-sm text-muted-foreground pt-4">
              <Link href="/" className="inline-flex items-center gap-1 text-green hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Back
              </Link>
            </p>
          </div>
        </Container>
      </main>
    </div>
  );
}
