"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut, User } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { AdminSearch } from "./AdminSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdminUser } from "@/types/admin";

const TITLES: Record<string, string> = {
  "/admin": "Dashboard",
  "/admin/orders": "Orders",
  "/admin/bulk-requests": "Bulk Requests",
  "/admin/products": "Products",
  "/admin/brands": "Brands",
  "/admin/categories": "Categories",
  "/admin/customers": "Customers",
  "/admin/subscriptions": "Subscriptions",
  "/admin/payments/pending": "Payments Pending",
  "/admin/coupons": "Coupons",
  "/admin/banners": "Banners",
  "/admin/delivery-zones": "Delivery Zones",
  "/admin/schedule": "Schedule",
  "/admin/reviews": "Reviews",
  "/admin/loyalty": "Loyalty",
  "/admin/settings": "Settings",
  "/admin/logs": "Activity Logs",
};

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname];
  const match = Object.keys(TITLES)
    .filter((k) => k !== "/admin" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? TITLES[match] : "Admin";
}

export function AdminTopbar({
  user,
  onOpenSidebar,
}: {
  user: AdminUser;
  onOpenSidebar: () => void;
}) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-sand bg-cream/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenSidebar}
        className="rounded-lg p-2 text-green-deep hover:bg-sand lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <h1 className="font-display text-lg font-bold text-green-deep">{titleFor(pathname)}</h1>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden sm:block">
          <AdminSearch />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-green text-sm font-bold text-white"
              aria-label="Admin menu"
            >
              {(user.name || user.email || "A").charAt(0).toUpperCase()}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuLabel className="normal-case">
              <div className="font-semibold text-green-deep">{user.name || "Admin"}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/" className="flex items-center gap-2">
                <User className="h-4 w-4" /> View storefront
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center gap-2 text-red-600">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
