"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { Menu, X, Search, Heart, ShoppingCart, User } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/bulk-request", label: "Bulk Orders" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Announcement bar */}
      <div className="bg-green-deep text-white text-xs sm:text-sm py-2 text-center px-4">
        Free delivery on orders over Rs. {brand.freeDeliveryThreshold.toLocaleString()} —{" "}
        <Link href="/shop" className="font-semibold underline underline-offset-2 hover:text-gold transition-colors">
          Shop Now
        </Link>
      </div>

      {/* Main header */}
      <header
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300",
          scrolled
            ? "bg-cream/95 backdrop-blur-sm shadow-[0_2px_16px_rgba(18,53,36,0.08)]"
            : "bg-cream"
        )}
      >
        <Container>
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Logo */}
            <BrandLogo variant="full" className="flex-shrink-0" />

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                    pathname === link.href
                      ? "text-green font-semibold"
                      : "text-green-deep/70 hover:text-green hover:bg-sand"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Search" asChild>
                <Link href="/shop?search=true">
                  <Search className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Wishlist" asChild className="hidden sm:inline-flex">
                <Link href="/account/wishlist">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Account" asChild className="hidden sm:inline-flex">
                <Link href="/account">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Cart (0 items)" className="relative" asChild>
                <Link href="/cart">
                  <ShoppingCart className="h-5 w-5" />
                  {/* Cart badge placeholder — wired in Phase 3 */}
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-gold text-green-deep text-[10px] font-bold flex items-center justify-center leading-none">
                    0
                  </span>
                </Link>
              </Button>

              {/* Mobile hamburger */}
              <Button
                variant="ghost"
                size="icon"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                className="md:hidden ml-1"
                onClick={() => setMobileOpen((o) => !o)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </Container>

        {/* Gold hairline border */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-gold-warm/30 to-transparent" />
      </header>

      {/* Mobile slide-in menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-green-deep/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            {/* Drawer */}
            <m.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-cream shadow-2xl md:hidden flex flex-col"
              role="dialog"
              aria-label="Mobile navigation"
            >
              <div className="flex items-center justify-between p-5 border-b border-sand">
                <BrandLogo variant="compact" href="/" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="flex-1 overflow-y-auto p-5 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl text-base font-medium transition-colors",
                      pathname === link.href
                        ? "bg-green text-white"
                        : "text-green-deep hover:bg-sand"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>

              <div className="p-5 border-t border-sand flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link href="/account">
                    <User className="h-4 w-4" /> My Account
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start gap-2" asChild>
                  <Link href="/account/wishlist">
                    <Heart className="h-4 w-4" /> Wishlist
                  </Link>
                </Button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
