import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropletSVG } from "@/components/shared/DropletSVG";
import { ORDER_STATUS_LABEL, orderStatusVariant } from "@/lib/orders/status";

/** Page heading used at the top of each account sub-page. */
export function AccountPageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <DropletSVG className="h-5 w-5 text-gold-warm" />
          <h1 className="font-display text-2xl text-green-deep md:text-3xl">{title}</h1>
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Branded empty state with an optional CTA. */
export function EmptyState({
  icon,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-sand bg-white px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage/30 text-green">
        {icon ?? <DropletSVG className="h-7 w-7 text-green" />}
      </div>
      <h2 className="font-display text-lg text-green-deep">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {ctaHref && ctaLabel && (
        <Button asChild className="mt-5">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      )}
    </div>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return <Badge variant={orderStatusVariant(status)}>{ORDER_STATUS_LABEL[status] ?? status}</Badge>;
}
