import type { Metadata } from "next";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShoppingBag,
  Clock,
  AlertTriangle,
  PackageSearch,
  Wallet,
  Star,
  Repeat,
  ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import { Panel } from "@/components/admin/primitives";
import { Badge } from "@/components/ui/badge";
import { RevenueChart } from "@/components/admin/dashboard/RevenueChart";
import { StatusDonut } from "@/components/admin/dashboard/StatusDonut";
import { QuickStatusSelect } from "@/components/admin/orders/QuickStatusSelect";
import {
  getDashboardKpis,
  getRevenueSeries,
  getTopProducts,
  getOrdersByStatus,
  getRecentOrders,
  getPendingStrip,
} from "@/lib/admin/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [kpis, s7, s30, s90, s365, top, byStatus, recent, pending] = await Promise.all([
    getDashboardKpis(),
    getRevenueSeries(7),
    getRevenueSeries(30),
    getRevenueSeries(90),
    getRevenueSeries(365),
    getTopProducts(10),
    getOrdersByStatus(),
    getRecentOrders(10),
    getPendingStrip(),
  ]);

  const maxUnits = Math.max(1, ...top.map((t) => t.units));

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Today's Revenue"
          value={formatCurrency(kpis.todayRevenue)}
          change={kpis.revenueChangePct}
          icon={<Wallet className="h-5 w-5" />}
        />
        <KpiCard
          label="Today's Orders"
          value={String(kpis.todayOrders)}
          change={kpis.ordersChangePct}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <KpiCard
          label="Pending Orders"
          value={String(kpis.pendingOrders)}
          icon={<Clock className="h-5 w-5" />}
          href="/admin/orders?status=pending_confirmation"
        />
        <KpiCard
          label="Low Stock"
          value={String(kpis.lowStock)}
          icon={<AlertTriangle className="h-5 w-5" />}
          href="/admin/products?lowStock=1"
          alert={kpis.lowStock > 0}
        />
      </div>

      {/* Pending items strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StripItem
          icon={<PackageSearch className="h-4 w-4" />}
          label="New bulk requests"
          count={pending.bulkRequests}
          href="/admin/bulk-requests?status=new"
        />
        <StripItem
          icon={<Wallet className="h-4 w-4" />}
          label="Bank approvals"
          count={pending.bankApprovals}
          href="/admin/payments/pending"
        />
        <StripItem
          icon={<Star className="h-4 w-4" />}
          label="Pending reviews"
          count={pending.pendingReviews}
          href="/admin/reviews?status=pending"
        />
        <StripItem
          icon={<Repeat className="h-4 w-4" />}
          label="Active subscriptions"
          count={pending.activeSubscriptions}
          href="/admin/subscriptions?status=active"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart series={{ "7": s7, "30": s30, "90": s90, "365": s365 }} />
        </div>
        <StatusDonut slices={byStatus} />
      </div>

      {/* Top products + recent orders */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 font-display text-lg font-semibold text-green-deep">
            Top selling (30 days)
          </h2>
          {top.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No sales yet.</p>
          ) : (
            <ul className="space-y-3">
              {top.map((t) => (
                <li key={t.productId ?? t.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-green-deep">{t.name}</span>
                    <span className="ml-2 shrink-0 text-muted-foreground">{t.units} units</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full bg-green"
                      style={{ width: `${(t.units / maxUnits) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-green-deep">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-sm font-medium text-green hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-sand/70 px-3 py-2"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/admin/orders/${o.order_number}`}
                      className="block truncate text-sm font-semibold text-green-deep hover:underline"
                    >
                      {o.order_number}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {o.customer} · {formatShortDate(o.created_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden text-sm font-medium text-green-deep sm:block">
                      {formatCurrency(o.total)}
                    </span>
                    <QuickStatusSelect orderId={o.id} status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  change,
  icon,
  href,
  alert,
}: {
  label: string;
  value: string;
  change?: number | null;
  icon: React.ReactNode;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <Panel className={alert ? "border-gold/60" : undefined}>
      <div className="flex items-start justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-green/70">{icon}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-bold text-green-deep">{value}</div>
      {change !== undefined && change !== null && (
        <div
          className={`mt-1 flex items-center gap-1 text-xs font-medium ${
            change >= 0 ? "text-green" : "text-red-600"
          }`}
        >
          {change >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5" />
          )}
          {Math.abs(change)}% vs yesterday
        </div>
      )}
    </Panel>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

function StripItem({
  icon,
  label,
  count,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-sand bg-white px-4 py-3 transition-colors hover:border-green/40"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sand text-green">
        {icon}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg font-bold text-green-deep">{count}</span>
          {count > 0 && <Badge variant="gold" className="text-[10px]">new</Badge>}
        </div>
        <p className="truncate text-xs text-muted-foreground">{label}</p>
      </div>
    </Link>
  );
}
