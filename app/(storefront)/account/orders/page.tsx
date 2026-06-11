import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Package } from "lucide-react";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { Pagination } from "@/components/storefront/Pagination";
import { AccountPageHeading, EmptyState, OrderStatusBadge } from "@/components/account/primitives";
import { OrdersFilterBar } from "@/components/account/OrdersFilterBar";
import { getAccountUser, getAccountOrders } from "@/lib/account/data";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";

export const metadata: Metadata = { title: "My Orders" };

const PAGE_SIZE = 8;

interface PageProps {
  searchParams: Promise<{
    status?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/orders");

  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const { orders, totalCount } = await getAccountOrders(user.id, {
    status: sp.status,
    search: sp.search,
    from: sp.from,
    to: sp.to,
    page,
    pageSize: PAGE_SIZE,
  });

  const filtered = !!(sp.status || sp.search || sp.from || sp.to);

  return (
    <div>
      <AccountPageHeading title="Orders" description="Track and manage your past and current orders." />

      <OrdersFilterBar
        status={sp.status ?? "all"}
        search={sp.search ?? ""}
        from={sp.from ?? ""}
        to={sp.to ?? ""}
      />

      {orders.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<Package className="h-7 w-7 text-green" />}
            title="No matching orders"
            description="Try clearing your filters to see all of your orders."
            ctaHref="/account/orders"
            ctaLabel="Clear filters"
          />
        ) : (
          <EmptyState
            icon={<Package className="h-7 w-7 text-green" />}
            title="No orders yet"
            description="When you place an order it will appear here, ready to track."
            ctaHref="/shop"
            ctaLabel="Browse the shop"
          />
        )
      ) : (
        <>
          <ul className="space-y-3">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/account/orders/${order.order_number}`}
                  className="block rounded-2xl border border-sand bg-white p-4 transition-colors hover:border-green/30"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {order.thumbnails.length > 0 ? (
                          order.thumbnails.map((src, i) => (
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
                        <p className="font-display font-semibold text-green-deep">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(order.created_at)} · {order.item_count} item
                          {order.item_count === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="font-semibold text-green-deep">{formatCurrency(order.total)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Pagination totalCount={totalCount} pageSize={PAGE_SIZE} currentPage={page} />
        </>
      )}
    </div>
  );
}
