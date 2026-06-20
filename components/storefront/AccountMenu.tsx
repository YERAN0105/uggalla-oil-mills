"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, Package, Repeat, Heart, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";
import type { AuthUserInfo } from "@/hooks/useAuthUser";

const LINKS = [
  { href: "/account", label: "Account", icon: User },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/subscriptions", label: "Subscriptions", icon: Repeat },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
];

function initials(name: string | null, email: string): string {
  const base = name?.trim() || email;
  return (
    base
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export function AccountMenu({ user, isAdmin = false }: { user: AuthUserInfo | null; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <Button variant="ghost" size="icon" aria-label="Sign in" asChild className="hidden sm:inline-flex">
        <Link href="/login?redirect=/account">
          <User className="h-5 w-5" />
        </Link>
      </Button>
    );
  }

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-green text-xs font-bold text-gold transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {initials(user.name, user.email)}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-sand bg-cream py-1 shadow-lg">
          <div className="border-b border-sand px-4 py-2">
            <p className="truncate text-sm font-semibold text-green-deep">{user.name || "My account"}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
          {isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 border-b border-sand bg-green/5 px-4 py-2 text-sm font-semibold text-green transition-colors hover:bg-green hover:text-white"
            >
              <LayoutDashboard className="h-4 w-4" />
              Admin Dashboard
            </Link>
          )}
          {LINKS.map((l) => {
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-green-deep/80 transition-colors hover:bg-sand hover:text-green"
              >
                <Icon className="h-4 w-4 text-green/70" />
                {l.label}
              </Link>
            );
          })}
          <form action={signOut} className="border-t border-sand">
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-green-deep/80 transition-colors hover:bg-sand hover:text-red-600"
            >
              <LogOut className="h-4 w-4 text-green/70" />
              Logout
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
