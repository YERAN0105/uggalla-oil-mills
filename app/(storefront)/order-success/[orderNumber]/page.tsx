import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Bell, Building2, Copy } from "lucide-react";
import { Container } from "@/components/shared/Container";
import { FadeIn } from "@/components/shared/FadeIn";
import { Button } from "@/components/ui/button";
import { SuccessCheck } from "@/components/storefront/SuccessCheck";
import { OrderDetailView } from "@/components/storefront/OrderDetailView";
import { BankReceiptUpload } from "@/components/storefront/BankReceiptUpload";
import { getOrderForView } from "@/lib/orders/data";
import { signOrderToken } from "@/lib/orders/token";
import { getBankDetails } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Order Confirmed" };
export const dynamic = "force-dynamic";

interface SuccessPageProps {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
}

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "every week",
  biweekly: "every 2 weeks",
  monthly: "every month",
};

export default async function OrderSuccessPage({ params, searchParams }: SuccessPageProps) {
  const { orderNumber } = await params;
  const { t } = await searchParams;

  const order = await getOrderForView(orderNumber, t);
  if (!order) notFound();

  const token = t ?? signOrderToken(orderNumber);

  // Is the viewer the logged-in owner? (controls "View Order" destination)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && user.id === order.user_id;

  const subscriptionItem = order.order_items.find((i) => i.options.is_subscription);
  const bankDetails = order.payment_method === "bank_transfer" ? await getBankDetails() : null;

  return (
    <section className="bg-cream min-h-screen">
      <Container className="py-12 md:py-16">
        <FadeIn className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center space-y-4 mb-10">
            <SuccessCheck />
            <h1 className="font-display text-3xl md:text-4xl text-green-deep">Thank you for your order!</h1>
            <p className="text-muted-foreground">
              Your order has been placed. A confirmation will follow shortly.
            </p>
            <div className="inline-flex items-center gap-2 rounded-full border border-sand bg-white px-4 py-2">
              <span className="text-sm text-muted-foreground">Order number</span>
              <span className="font-display font-semibold text-green-deep">{order.order_number}</span>
            </div>
          </div>

          {/* Payment-specific next steps */}
          {order.payment_method === "bank_transfer" && bankDetails && (
            <div className="mb-8 rounded-2xl border border-gold-warm/40 bg-gold/5 p-5">
              <h2 className="flex items-center gap-2 font-display text-lg text-green-deep mb-3">
                <Building2 className="h-5 w-5 text-gold-warm" />
                Complete your bank transfer
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Transfer the total of{" "}
                <strong className="text-green-deep">
                  {new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" }).format(order.total)}
                </strong>{" "}
                to the account below, then upload your receipt so we can verify and confirm your order.
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm mb-4">
                <dt className="text-muted-foreground">Bank</dt>
                <dd className="text-green-deep font-medium">{bankDetails.bank_name}</dd>
                <dt className="text-muted-foreground">Account name</dt>
                <dd className="text-green-deep font-medium">{bankDetails.account_name}</dd>
                <dt className="text-muted-foreground">Account no.</dt>
                <dd className="text-green-deep font-medium flex items-center gap-2">
                  {bankDetails.account_number}
                  <Copy className="h-3 w-3 text-muted-foreground" />
                </dd>
                <dt className="text-muted-foreground">Branch</dt>
                <dd className="text-green-deep font-medium">{bankDetails.branch}</dd>
              </dl>
              <BankReceiptUpload
                orderNumber={order.order_number}
                token={token}
                alreadyUploaded={!!order.bank_receipt}
              />
            </div>
          )}

          {order.payment_method === "cod" && (
            <div className="mb-8 rounded-2xl border border-green/20 bg-green/5 p-5 text-sm">
              <h2 className="font-display text-lg text-green-deep mb-1">Cash on Delivery</h2>
              <p className="text-muted-foreground">
                Your order is placed and pending confirmation. Our team will call you shortly to confirm the
                details. Please have the exact amount ready on delivery.
              </p>
            </div>
          )}

          {order.payment_method === "payhere" && order.payment_status !== "paid" && (
            <div className="mb-8 rounded-2xl border border-sand bg-white p-5 text-sm">
              <p className="text-muted-foreground">
                We&apos;re confirming your payment. If it hasn&apos;t completed,{" "}
                <Link href={`/checkout/pay/${order.order_number}`} className="text-green underline">
                  try paying again
                </Link>
                .
              </p>
            </div>
          )}

          {/* Subscription confirmation */}
          {subscriptionItem && (
            <div className="mb-8 flex items-start gap-3 rounded-2xl border border-sage/60 bg-sage/10 p-5">
              <Bell className="h-5 w-5 text-green flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-deep">
                We&apos;ll remind you to reorder{" "}
                <strong>{INTERVAL_LABEL[subscriptionItem.options.subscription_interval ?? "monthly"]}</strong>.
                You can manage your reminders anytime from your account.
              </p>
            </div>
          )}

          {/* Order details */}
          <OrderDetailView order={order} />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            {isOwner ? (
              <Button asChild>
                <Link href={`/account/orders/${order.order_number}`}>View Order</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={`/orders/track?order=${order.order_number}`}>Track Order</Link>
              </Button>
            )}
            <Button asChild variant={isOwner ? "outline" : "default"}>
              <Link href="/shop">Continue Shopping</Link>
            </Button>
          </div>

          {!isOwner && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Save this page to track your order, or use your order number and email at{" "}
              <Link href="/orders/track" className="underline hover:text-green">
                order tracking
              </Link>
              .
            </p>
          )}
        </FadeIn>
      </Container>
    </section>
  );
}
