import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BadgeProps } from "@/components/ui/badge";
import { AccountPageHeading, EmptyState } from "@/components/account/primitives";
import { getAccountUser, getAccountBulkRequests } from "@/lib/account/data";
import { isPayHereEnabled } from "@/lib/integrations";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";
import type { AccountBulkRequest } from "@/types/account";

export const metadata: Metadata = { title: "Bulk Requests" };

const STATUS_LABEL: Record<AccountBulkRequest["status"], string> = {
  new: "New",
  in_progress: "In progress",
  quoted: "Quoted",
  accepted: "Accepted",
  rejected: "Declined",
  completed: "Completed",
};

function statusVariant(status: AccountBulkRequest["status"]): BadgeProps["variant"] {
  switch (status) {
    case "quoted":
    case "accepted":
      return "gold";
    case "completed":
      return "default";
    case "rejected":
      return "destructive";
    case "in_progress":
      return "sage";
    default:
      return "secondary";
  }
}

export default async function BulkRequestsPage() {
  const user = await getAccountUser();
  if (!user) redirect("/login?redirect=/account/bulk-requests");
  const requests = await getAccountBulkRequests(user.id);

  return (
    <div>
      <AccountPageHeading
        title="Bulk Requests"
        description="Your loose / wholesale oil quote requests and the quotes you've received."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/bulk-request">Request a quote</Link>
          </Button>
        }
      />

      {requests.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-7 w-7 text-green" />}
          title="No bulk requests yet"
          description="Need oil in volume? Send us a quote request and we'll get back to you with pricing."
          ctaHref="/bulk-request"
          ctaLabel="Request a bulk quote"
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const hasQuote = req.quoted_total != null && ["quoted", "accepted", "completed"].includes(req.status);
            const expired = req.quote_expires_at ? new Date(req.quote_expires_at) < new Date() : false;
            const showPayLink =
              hasQuote &&
              req.payment_mode === "online" &&
              isPayHereEnabled &&
              req.quote_token &&
              !req.converted_order_id &&
              !expired;

            return (
              <div key={req.id} className="rounded-2xl border border-sand bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sage/30 text-green">
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium text-green-deep">{req.product_name ?? "Loose / bulk oil"}</p>
                      <p className="text-xs text-muted-foreground">
                        {req.quantity} {req.unit} · {req.fulfillment_type === "delivery" ? "Delivery" : "Pickup"} ·
                        Submitted {formatShortDate(req.created_at)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={statusVariant(req.status)}>{STATUS_LABEL[req.status]}</Badge>
                </div>

                {req.notes && (
                  <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-green-deep">Your note:</span> {req.notes}
                  </p>
                )}

                {/* Quote */}
                {hasQuote && (
                  <div className="mt-3 rounded-xl border border-gold-warm/40 bg-gold/5 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gold-warm">
                      Your quote
                    </p>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm text-muted-foreground">
                        {req.quoted_unit_price != null && (
                          <span>
                            {formatCurrency(req.quoted_unit_price)} / {req.unit} ·{" "}
                          </span>
                        )}
                        Total
                      </div>
                      <span className="font-display text-xl font-semibold text-green-deep">
                        {formatCurrency(req.quoted_total!)}
                      </span>
                    </div>
                    {req.quote_message && (
                      <p className="mt-2 border-t border-gold-warm/30 pt-2 text-sm text-green-deep/80">
                        {req.quote_message}
                      </p>
                    )}

                    {/* Payment handling */}
                    <div className="mt-3">
                      {req.converted_order_id ? (
                        <p className="text-sm text-green">
                          ✓ Paid —{" "}
                          {req.converted_order_number ? (
                            <Link
                              href={`/account/orders/${req.converted_order_number}`}
                              className="font-medium underline"
                            >
                              view order {req.converted_order_number}
                            </Link>
                          ) : (
                            "order created"
                          )}
                        </p>
                      ) : req.payment_mode === "online" ? (
                        showPayLink ? (
                          <Button asChild size="sm" variant="gold">
                            <Link href={`/quote/${req.quote_token}`}>Review &amp; pay online</Link>
                          </Button>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            {expired
                              ? "This payment link has expired — please contact us to arrange payment."
                              : "Online payment will be available shortly."}
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Our team will arrange payment and delivery with you directly (phone / bank / cash).
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {req.status === "rejected" && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    We were unable to fulfil this request. Please contact us if you&apos;d like to discuss
                    alternatives.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
