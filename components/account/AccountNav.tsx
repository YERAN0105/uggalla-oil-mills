"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Repeat,
  FileText,
  MapPin,
  Heart,
  Award,
  Star,
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/(auth)/actions";

const NAV = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/account/bulk-requests", label: "Bulk Requests", icon: FileText },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/loyalty", label: "Loyalty Points", icon: Award },
  { href: "/account/reviews", label: "Reviews", icon: Star },
  { href: "/account/profile", label: "Profile", icon: User },
] as const;

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AccountNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: sticky vertical sidebar */}
      <nav className="hidden lg:flex lg:flex-col lg:gap-1" aria-label="Account navigation">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-green text-white shadow-sm"
                  : "text-green-deep/75 hover:bg-sand hover:text-green-deep"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-gold" : "text-green/70")} />
              {item.label}
            </Link>
          );
        })}
        <form action={signOut} className="mt-2 border-t border-sand pt-2">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-green-deep/75 transition-colors hover:bg-sand hover:text-red-600"
          >
            <LogOut className="h-4 w-4 text-green/70" />
            Logout
          </button>
        </form>
      </nav>

      {/* Mobile / tablet: wrapping tab strip */}
      <nav
        className="lg:hidden flex flex-wrap gap-2 pb-1"
        aria-label="Account navigation"
      >
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, "exact" in item ? item.exact : false);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-green bg-green text-white"
                  : "border-sand bg-white text-green-deep/75 hover:border-green/40"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
        <form action={signOut} className="flex-shrink-0">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-full border border-sand bg-white px-3.5 py-2 text-sm font-medium text-red-600/80 transition-colors hover:border-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </form>
      </nav>
    </>
  );
}
