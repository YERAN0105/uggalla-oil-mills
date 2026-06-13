"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingBag,
  PackageSearch,
  Boxes,
  Tags,
  FolderTree,
  Users,
  Repeat,
  Wallet,
  Ticket,
  Images,
  Truck,
  CalendarDays,
  Star,
  Gift,
  Settings,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/shared/BrandLogo";
import type { AdminBadgeCounts } from "@/types/admin";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: keyof AdminBadgeCounts;
}

const NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag, badgeKey: "pendingOrders" },
  { label: "Bulk Requests", href: "/admin/bulk-requests", icon: PackageSearch, badgeKey: "newBulkRequests" },
  { label: "Products", href: "/admin/products", icon: Boxes },
  { label: "Brands", href: "/admin/brands", icon: Tags },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: Repeat },
  { label: "Payments Pending", href: "/admin/payments/pending", icon: Wallet, badgeKey: "pendingPayments" },
  { label: "Coupons", href: "/admin/coupons", icon: Ticket },
  { label: "Banners", href: "/admin/banners", icon: Images },
  { label: "Delivery Zones", href: "/admin/delivery-zones", icon: Truck },
  { label: "Schedule", href: "/admin/schedule", icon: CalendarDays },
  { label: "Reviews", href: "/admin/reviews", icon: Star, badgeKey: "pendingReviews" },
  { label: "Loyalty", href: "/admin/loyalty", icon: Gift },
  { label: "Settings", href: "/admin/settings", icon: Settings },
  { label: "Activity Logs", href: "/admin/logs", icon: ScrollText },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({
  badges,
  onNavigate,
  footer,
}: {
  badges: AdminBadgeCounts;
  onNavigate?: () => void;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-green-deep text-white">
      <div className="flex h-16 shrink-0 items-center gap-2 border-b border-white/10 px-4">
        <BrandLogo href="/admin" variant="compact" />
        <span className="font-display text-sm font-semibold text-white/90">Admin</span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          const count = item.badgeKey ? badges[item.badgeKey] : 0;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {count > 0 && (
                <span className="inline-flex min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 py-0.5 text-[11px] font-bold text-green-deep">
                  {count > 99 ? "99+" : count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {footer && <div className="shrink-0 border-t border-white/10 p-3">{footer}</div>}
    </div>
  );
}
