import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { LogIn, Building2, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { Button } from "@/components/ui/button";
import { OrderDetailView } from "@/components/storefront/OrderDetailView";
import { StatusTimeline } from "@/components/account/StatusTimeline";
import { BankReceiptUpload } from "@/components/storefront/BankReceiptUpload";
import { CopyableField } from "@/components/storefront/CopyableField";
import { getOrderForView } from "@/lib/orders/data";
import { signOrderToken } from "@/lib/orders/token";
import { getBankDetails } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/brand";
import { formatShortDate } from "@/lib/date";

export const metadata: Metadata = { title: "Your Order" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}

/**
 * The single canonical order view. Opened by the "View Order" link in
 * notification emails AND by the guest track form (which redirects here after a
 * successful lookup), so there is exactly one read-only order experience.
 *
 * Access is by the HMAC order token (`?t=`), so it works WITHOUT logging in — for
 * guests and for customers reading the email on a signed-out device.
 *  - Logged-in owner  → redirected to the full /account order page (manage/cancel).
 *  - Everyone else with a valid token → read-only view with the progress bar, and
 *    a "Log in to manage" option for customer (non-guest) orders.
 *
 * Note: the sibling static route /orders/track takes precedence over this dynamic
 * segment, so the guest lookup form is unaffected.
 */
export default async function OrderViewPage({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const { t } = await searchParams;

  const order = await getOrderForView(orderNumber, t);
  if (!order) notFound();

  // If the viewer is the signed-in owner, send them to the full account page.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === order.user_id;
  if (isOwner) redirect(`/account/orders/${order.order_number}`);

  // Otherwise: read-only view via the token. Offer "log in to manage" only for
  // customer (non-guest) orders.
  const canLogInToManage = !!order.user_id;
  const token = t ?? signOrderToken(order.order_number);

  // Unpaid bank-transfer orders (no receipt yet, or rejected) can upload here.
  const showBankUpload =
    order.status !== "cancelled" &&
    order.status !== "refunded" &&
    order.payment_method === "bank_transfer" &&
    order.payment_status !== "paid" &&
    (!order.bank_receipt || order.bank_receipt.status === "rejected");
  const bankDetails = showBankUpload ? await getBankDetails() : null;

  return (
    <section className="bg-cream min-h-screen">
      <Container className="py-12 md:py-16">
        <FadeIn className="max-w-2xl mx-auto">
          <div className="mb-8 text-center space-y-2">
            <h1 className="font-display text-3xl text-green-deep md:text-4xl">Your order</h1>
            <div className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2">
              <span className="text-sm text-muted-foreground">Order number</span>
              <span className="font-display font-semibold text-green-deep">{order.order_number}</span>
            </div>
            <p className="text-sm text-muted-foreground">Placed {formatShortDate(order.created_at)}</p>
          </div>

          {/* Progress bar — same timeline logged-in customers see */}
          <div className="mb-8">
            <StatusTimeline
              status={order.status}
              fulfillmentType={order.fulfillment_type}
              history={order.history}
              placedAt={order.created_at}
            />
          </div>

          {canLogInToManage && (
            <div className="mb-8 flex flex-col items-start gap-3 rounded-2xl border border-sage/60 bg-sage/10 p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-green-deep">
                This is your order. Log in to manage it — cancel, reorder, or track all your orders.
              </p>
              <Button asChild className="flex-shrink-0">
                <Link href={`/login?redirect=/account/orders/${order.order_number}`}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Log in to manage
                </Link>
              </Button>
            </div>
          )}

          {/* Bank transfer: receipt received & under review */}
          {order.status !== "cancelled" &&
            order.status !== "refunded" &&
            order.payment_method === "bank_transfer" &&
            order.payment_status === "pending_transfer" &&
            order.bank_receipt?.status === "pending" && (
              <div className="mb-8 rounded-2xl border border-green/30 bg-green/5 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green" />
                  <div>
                    <p className="font-semibold text-green-deep">
                      Receipt received — we&apos;re verifying your payment
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      We&apos;ll confirm your order once the transfer is verified. This usually takes 1–2
                      business days.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* Bank transfer: upload receipt */}
          {showBankUpload && bankDetails && (
            <div className="mb-8 rounded-2xl border border-gold-warm/40 bg-gold/5 p-5">
              <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-green-deep">
                <Building2 className="h-5 w-5 text-gold-warm" />
                {order.bank_receipt?.status === "rejected"
                  ? "Re-upload your receipt"
                  : "Complete your bank transfer"}
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Transfer <strong className="text-green-deep">{formatCurrency(order.total)}</strong> to the
                account below, then upload your receipt so we can verify and confirm your order.
              </p>
              <div className="mb-2 divide-y divide-sand rounded-xl border border-sand bg-white px-4">
                <CopyableField label="Bank" value={bankDetails.bank_name} />
                <CopyableField label="Account name" value={bankDetails.account_name} copyable />
                <CopyableField label="Account number" value={bankDetails.account_number} copyable />
                <CopyableField label="Branch" value={bankDetails.branch} />
                <CopyableField label="Reference" value={order.order_number} copyable />
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Please add the <strong>reference</strong> ({order.order_number}) to your transfer so we can
                match your payment.
              </p>
              <BankReceiptUpload
                orderNumber={order.order_number}
                token={token}
                alreadyUploaded={!!order.bank_receipt && order.bank_receipt.status !== "rejected"}
              />
            </div>
          )}

          <OrderDetailView order={order} />

          <div className="mt-8 flex justify-center">
            <Button asChild>
              <Link href="/shop">Continue shopping</Link>
            </Button>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}
