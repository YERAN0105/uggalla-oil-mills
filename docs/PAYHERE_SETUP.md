# PayHere Setup

PayHere (https://www.payhere.lk/developers/) powers retail card/wallet payments and the optional
bulk-quote "pay online" link. **Everything is already built** — the integration activates the
moment the merchant keys are present in the environment (`isPayHereEnabled`). Until then, checkout
simply doesn't offer "Pay Online" and the `/quote/[token]` page shows a graceful "not available"
message.

## 1. Merchant account

1. Sign up for a PayHere merchant account and complete business verification.
2. In the merchant dashboard, create/note your **Merchant ID** and **Merchant Secret**.
3. Add your domain(s) under **Domains & Credentials** so checkout requests are accepted.

## 2. Environment variables

```
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_MODE=sandbox        # use 'live' in production
# Optional overrides (sensible defaults derive from NEXT_PUBLIC_APP_URL):
PAYHERE_NOTIFY_URL=https://yourdomain/api/payments/payhere/webhook
PAYHERE_RETURN_URL=
PAYHERE_CANCEL_URL=
```

`NEXT_PUBLIC_APP_URL` must be your real domain in production so the return/notify URLs resolve.

## 3. How the flow works

- **Retail checkout:** order is created with `payment_status = pending`, the customer is redirected
  to PayHere's hosted page (`/checkout/pay/[orderNumber]`), and PayHere POSTs the result to the
  webhook.
- **Webhook** (`/api/payments/payhere/webhook`): verifies the MD5 signature, stores the raw payload
  in `payments`, and on success marks the order `paid` + `confirmed` and enqueues the (debounced)
  confirmation email. It always returns HTTP 200; invalid signatures are logged, not written.
- **Bulk quote pay-online:** when the admin picks "Pay online", a secure `/quote/[token]` link is
  generated. The customer reviews the quote and pays; on success a tracked order is created and
  linked to the request.

## 4. Sandbox testing

With `PAYHERE_MODE=sandbox`, use PayHere's sandbox test cards. Place a retail order end-to-end and
confirm the webhook flips the order to paid/confirmed.

## 5. Going live

- Switch `PAYHERE_MODE=live` and use live credentials.
- Do **one** small real transaction, confirm it appears as paid, then refund it.
- Double-check the webhook URL is reachable from PayHere (public HTTPS).

## Security notes

- The merchant secret lives only in the server environment — never in client code or the database.
  The admin **Settings → Payment** tab only shows whether PayHere is configured, never the keys.
- Signature verification (both the checkout hash and the webhook `md5sig`) is implemented in
  `lib/payments/payhere.ts` per the PayHere spec.
