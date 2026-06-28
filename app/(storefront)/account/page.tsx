import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Package, Award, Repeat, Heart, ArrowRight, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { OrderStatusBadge } from "@/components/account/primitives";
import { getAccountUser, getDashboard } from "@/lib/account/data";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "My Account" };

const KPIS = [
  { key: "orders", label: "Total Orders", href: "/account/orders", icon: Package },
  { key: "loyalty", label: "Loyalty Points", href: "/account/loyalty", icon: Award },
  { key: "subs", label: "Active Subscriptions", href: "/account/subscriptions", icon: Repeat },
  { key: "wishlist", label: "Wishlist Items", href: "/account/wishlist", icon: Heart },
] as const;

export default async function AccountDashboard() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account");
  const data = await getDashboard(user.id);

  const values: Record<string, number> = {
    orders: data.totalOrders,
    loyalty: data.loyaltyPoints,
    subs: data.activeSubscriptions,
    wishlist: data.wishlistCount,
  };

  return (
    <div>
      {/* Welcome banner */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-sand bg-gradient-to-br from-green to-green-deep p-6 text-white">
        <div className="flex items-center gap-2">
          <DropletSVG className="h-5 w-5 text-gold" />
          <span className="text-xs font-semibold uppercase tracking-wider text-gold">Welcome back</span>
        </div>
        <h1 className="mt-2 font-display text-3xl">Hello, {data.firstName}</h1>
        <p className="mt-1 text-sm text-white/80">
          Manage your orders, reminders, and rewards, all in one place.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {KPIS.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.key}
              href={kpi.href}
              className="group rounded-2xl border border-sand bg-white p-4 transition-all hover:border-green/30 hover:shadow-[0_8px_30px_rgba(27,107,58,0.10)]"
            >
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-green" />
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
              <p className="mt-3 font-display text-2xl font-semibold text-green-deep">
                {values[kpi.key].toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </Link>
          );
        })}
      </div>

      {/* Recent order */}
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg text-green-deep">Recent order</h2>
          {data.recentOrder && (
            <Link href="/account/orders" className="text-sm font-medium text-green hover:underline">
              View all
            </Link>
          )}
        </div>

        {data.recentOrder ? (
          <Link
            href={`/account/orders/${data.recentOrder.order_number}`}
            className="block rounded-2xl border border-sand bg-white p-4 transition-colors hover:border-green/30"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {data.recentOrder.thumbnails.length > 0 ? (
                    data.recentOrder.thumbnails.map((src, i) => (
                      <div
                        key={i}
                        className="relative h-12 w-12 overflow-hidden rounded-lg border-2 border-white bg-sand"
                      >
                        <Image src={src} alt="" fill sizes="48px" className="object-cover" />
                      </div>
                    ))
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sand">
                      <DropletSVG className="h-6 w-6 text-sage" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display font-semibold text-green-deep">
                    {data.recentOrder.order_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatShortDate(data.recentOrder.created_at)} · {data.recentOrder.item_count}{" "}
                    item{data.recentOrder.item_count === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={data.recentOrder.status} />
                <span className="font-semibold text-green-deep">
                  {formatCurrency(data.recentOrder.total)}
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <div className="rounded-2xl border border-dashed border-sand bg-white p-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-sage" />
            <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t placed any orders yet.</p>
            <Button asChild className="mt-4">
              <Link href="/shop">Start shopping</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Continue shopping */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gold-warm/30 bg-gold/5 p-5">
        <div>
          <p className="font-display text-green-deep">Running low on oil?</p>
          <p className="text-sm text-muted-foreground">Restock from our bottles, packets and bulk range.</p>
        </div>
        <Button asChild variant="gold">
          <Link href="/shop">Continue Shopping</Link>
        </Button>
      </div>
    </div>
  );
}
