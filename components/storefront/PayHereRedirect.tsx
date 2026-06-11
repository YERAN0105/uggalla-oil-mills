"use client";

import { useEffect, useRef } from "react";
import type { PayHereCheckoutParams } from "@/lib/payments/payhere";
import { DropletSVG } from "@/components/shared/DropletSVG";

/**
 * Auto-submits a hidden form to PayHere's hosted checkout. Rendered by the
 * /checkout/pay/[orderNumber] page once the server has computed the signed
 * params. Shows a branded "redirecting" state while the POST happens.
 */
export function PayHereRedirect({ params }: { params: PayHereCheckoutParams }) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const t = setTimeout(() => formRef.current?.submit(), 600);
    return () => clearTimeout(t);
  }, []);

  // Fields PayHere expects (excluding our helper-only keys).
  const fields: Record<string, string> = {
    merchant_id: params.merchant_id,
    return_url: params.return_url,
    cancel_url: params.cancel_url,
    notify_url: params.notify_url,
    order_id: params.order_id,
    items: params.items,
    currency: params.currency,
    amount: params.amount,
    first_name: params.first_name,
    last_name: params.last_name,
    email: params.email,
    phone: params.phone,
    address: params.address,
    city: params.city,
    country: params.country,
    hash: params.hash,
  };

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-4">
      <DropletSVG className="h-14 w-14 text-green animate-pulse" />
      <h1 className="font-display text-2xl text-green-deep">Redirecting to secure payment…</h1>
      <p className="text-sm text-muted-foreground max-w-sm">
        Please wait while we take you to PayHere to complete your payment. Do not refresh or close this page.
      </p>

      <form ref={formRef} method="post" action={params.checkoutUrl}>
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <noscript>
          <button type="submit" className="underline">
            Continue to PayHere
          </button>
        </noscript>
      </form>
    </div>
  );
}
