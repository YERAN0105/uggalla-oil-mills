"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m, AnimatePresence } from "framer-motion";
import { Menu, X, Heart, User, ChevronDown, Package, LogOut, LayoutDashboard } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/storefront/SearchBar";
import { CartButton } from "@/components/storefront/CartButton";
import { AccountMenu } from "@/components/storefront/AccountMenu";
import { useWishlistStore } from "@/stores/wishlistStore";
import { useAuthUser } from "@/hooks/useAuthUser";
import { signOut } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

type NavLink = {
  href: string;
  label: string;
  dropdown?: { href: string; label: string }[];
};

export type NavCategory = { name: string; slug: string };
/** Active promo strip for the top bar, or null to use the default message. */
export type HeaderPromo = { headline: string | null; cta_text: string | null; cta_link: string | null } | null;

export function Header({
  categories,
  promo,
  isAdmin = false,
}: {
  categories: NavCategory[];
  promo?: HeaderPromo;
  isAdmin?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const { user } = useAuthUser();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Shop dropdown is data-driven from active categories (hidden ones are filtered
  // out upstream by getCategories), so the menu always matches what the store shows.
  const navLinks: NavLink[] = [
    { href: "/", label: "Home" },
    {
      href: "/shop",
      label: "Shop",
      dropdown: [
        { href: "/shop", label: "All Products" },
        ...categories.map((c) => ({
          href: `/shop/category/${c.slug}`,
          label: c.name,
        })),
      ],
    },
    { href: "/sale", label: "Sale" },
    { href: "/bulk-request", label: "Bulk Orders" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      {/* Announcement bar — driven by an active "promo" banner (Admin → Banners),
          falling back to the default free-delivery message when none is set. */}
      <div className="bg-green-deep text-white text-xs sm:text-sm py-2 text-center px-4">
        {promo?.headline ? (
          <>
            {promo.headline}
            {promo.cta_text && promo.cta_link ? (
              <>
                {" — "}
                <Link
                  href={promo.cta_link}
                  className="font-semibold underline underline-offset-2 hover:text-gold transition-colors"
                >
                  {promo.cta_text}
                </Link>
              </>
            ) : null}
          </>
        ) : (
          <>
            {brand.tagline} —{" "}
            <Link href="/shop" className="font-semibold underline underline-offset-2 hover:text-gold transition-colors">
              Shop Now
            </Link>
          </>
        )}
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
              {navLinks.map((link) => {
                const isActive =
                  link.dropdown && link.href === "/shop"
                    ? pathname.startsWith("/shop")
                    : pathname === link.href;

                if (!link.dropdown) {
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                        isActive
                          ? "text-green font-semibold"
                          : "text-green-deep/70 hover:text-green hover:bg-sand"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                }

                return (
                  <div key={link.href} className="relative group">
                    <Link
                      href={link.href}
                      onClick={(e) => e.currentTarget.blur()}
                      className={cn(
                        "inline-flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150",
                        isActive
                          ? "text-green font-semibold"
                          : "text-green-deep/70 hover:text-green hover:bg-sand"
                      )}
                    >
                      {link.label}
                      <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200 group-hover:rotate-180" />
                    </Link>
                    {/* Dropdown — pt-2 bridges the gap so it stays open on hover */}
                    <div className="absolute left-0 top-full pt-2 hidden group-hover:block group-focus-within:block z-50">
                      <div className="min-w-[200px] rounded-xl border border-sand bg-cream shadow-lg overflow-hidden py-1">
                        {link.dropdown.map((item) => (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={(e) => e.currentTarget.blur()}
                            className={cn(
                              "block px-4 py-2.5 text-sm transition-colors",
                              pathname === item.href
                                ? "text-green font-semibold bg-sand/60"
                                : "text-green-deep/80 hover:text-green hover:bg-sand"
                            )}
                          >
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-1">
              {/* Search (desktop) */}
              <div className="hidden sm:block">
                <SearchBar />
              </div>

              {/* Wishlist with count badge */}
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Wishlist (${wishlistCount} items)`}
                asChild
                className="hidden sm:inline-flex relative"
              >
                <Link href="/account/wishlist">
                  <Heart className="h-5 w-5" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-400 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                </Link>
              </Button>

              {/* Account avatar / menu */}
              <AccountMenu user={user} isAdmin={isAdmin} />

              {/* Cart drawer trigger */}
              <CartButton />

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
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-green-deep/40 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
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

              {/* Mobile search */}
              <div className="px-5 pt-4">
                <SearchBar fullWidth onNavigate={() => setMobileOpen(false)} />
              </div>

              <nav className="flex-1 overflow-y-auto p-5 flex flex-col gap-1">
                {navLinks.map((link) => (
                  <div key={link.href}>
                    <Link
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
                    {/* Category sub-links (categories only — parent link already covers All Products) */}
                    {link.dropdown && (
                      <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-sand pl-3">
                        {link.dropdown
                          .filter((item) => item.href !== "/shop")
                          .map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm transition-colors",
                                pathname === item.href
                                  ? "text-green font-semibold bg-sand"
                                  : "text-green-deep/75 hover:bg-sand"
                              )}
                            >
                              {item.label}
                            </Link>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </nav>

              <div className="p-5 border-t border-sand flex flex-col gap-2">
                {user ? (
                  <>
                    {isAdmin && (
                      <Button className="w-full justify-start gap-2" asChild>
                        <Link href="/admin">
                          <LayoutDashboard className="h-4 w-4" /> Admin Dashboard
                        </Link>
                      </Button>
                    )}
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <Link href="/account">
                        <User className="h-4 w-4" /> My Account
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2" asChild>
                      <Link href="/account/orders">
                        <Package className="h-4 w-4" /> Orders
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start gap-2 relative" asChild>
                      <Link href="/account/wishlist">
                        <Heart className="h-4 w-4" /> Wishlist
                        {wishlistCount > 0 && (
                          <span className="ml-auto bg-red-400 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                            {wishlistCount}
                          </span>
                        )}
                      </Link>
                    </Button>
                    <form action={signOut}>
                      <Button type="submit" variant="ghost" className="w-full justify-start gap-2 text-red-600">
                        <LogOut className="h-4 w-4" /> Logout
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button className="w-full" asChild>
                      <Link href="/login?redirect=/account">Sign in</Link>
                    </Button>
                    <Button variant="outline" className="w-full" asChild>
                      <Link href="/register">Create account</Link>
                    </Button>
                  </>
                )}
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
