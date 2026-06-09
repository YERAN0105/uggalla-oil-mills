# Phase 6: Notifications, Polish & Launch

> **Read `MASTER_SPEC.md` first.** Phases 1–5 must be complete.

---

## Goal of Phase 6

Wire all notifications (Email + WhatsApp), complete the bulk-request quote notifications, build the subscription reminder system, polish the entire app, and deploy to production. By the end of this phase the project is launch-ready.

---

## Tasks

### 1. Email Setup (Resend)

- Install `resend` and `@react-email/components`
- Create `lib/notifications/email.ts` with a typed `sendEmail({ to, subject, react, replyTo? })` wrapper
- Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL`
- Branded React Email templates (green/gold/cream, logo)

### 2. WhatsApp Setup (Cloud API)

- Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
- Set up Meta Business Account, WhatsApp Business App, phone number (or test number for dev)
- Register message templates with Meta (each needs approval — start EARLY; ~24h):
  - `order_confirmation` (name, order_number, total, delivery_date)
  - `payment_received` (name, order_number)
  - `order_confirmed` (name, order_number)
  - `order_preparation` (name, order_number)
  - `out_for_delivery` (name, order_number, delivery_window)
  - `ready_for_pickup` (name, order_number, pickup_window)
  - `order_delivered` (name, order_number)
  - `order_cancelled` (name, order_number, reason)
  - `bank_receipt_rejected` (name, order_number, reason)
  - `review_request` (name, order_number)
  - `bulk_request_received` (name)
  - `bulk_quote_sent` (name, product, quantity, quoted_total, payment_link) — the `payment_link` variable is populated only when the admin chose the **online** payment mode; for **offline** quotes it's omitted and the message states the shop will arrange payment & delivery
  - `subscription_reminder` (name, product, reorder_link)
  - `welcome` (name)
- Create `lib/notifications/whatsapp.ts`:
  - `sendWhatsAppTemplate({ to, templateName, languageCode='en', components })` → POST to `https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages`
  - Auth via `WHATSAPP_ACCESS_TOKEN`
  - E.164 phone validation (`+94XXXXXXXXX`)
  - Robust error handling — log failures, never throw into the user flow
- Webhook `app/api/whatsapp/webhook/route.ts` — verify `WHATSAPP_VERIFY_TOKEN`, log delivery status to DB

### 3. Notification Orchestrator

Create `lib/notifications/index.ts`:

```typescript
type NotificationEvent =
  | 'order_placed' | 'payment_received' | 'order_confirmed'
  | 'order_in_preparation' | 'out_for_delivery' | 'ready_for_pickup'
  | 'order_delivered' | 'order_cancelled' | 'bank_receipt_rejected'
  | 'review_request' | 'bulk_request_received' | 'bulk_quote_sent'
  | 'subscription_reminder' | 'welcome';

export async function notify(event: NotificationEvent, payload: any) {
  // 1. Load settings (email enabled? whatsapp enabled?)
  // 2. Fan out to handlers
  // 3. Each handler is fire-and-forget with try/catch + DB log
  // 4. Return immediately so the user flow isn't blocked
}
```

- Implement each event handler
- Use `Promise.allSettled` + log failures
- Store every send in the `notification_logs` table: event, channel, recipient, status, error, payload, sent_at
- Idempotency: `idempotency_key` (e.g., `order_id + event`) prevents duplicates on retries

### 4. Wire Notifications into Existing Flows

- **Phase 1**: signup → `welcome`
- **Phase 3**: order placed → `order_placed`; PayHere paid webhook → `payment_received`
- **Phase 5**: bank receipt rejected → `bank_receipt_rejected`
- **Phase 5** admin status transitions:
  - `confirmed` → `order_confirmed`
  - `in_preparation` → `order_in_preparation`
  - `out_for_delivery` → `out_for_delivery`
  - `ready_for_pickup` → `ready_for_pickup`
  - `delivered` → `order_delivered` + schedule `review_request` for 2 days later
  - `cancelled` → `order_cancelled` (with reason)
- **Bulk requests (Phase 2 + 5)**:
  - Customer submits a bulk request → `bulk_request_received` (customer ack) + admin alert email to the shop
  - Admin sends quote → `bulk_quote_sent`. For an **offline** quote the message gives the price + message and says the shop will arrange payment & delivery. For an **online** quote it includes the `/quote/[token]` pay-online link (see Task 5b).

### 5. Subscription Reminder Cron (NEW — the core of the subscription feature)

The subscription feature is reminder-only — this cron is what makes it work.

- Implement `app/api/cron/subscription-reminders/route.ts`, protected by `CRON_SECRET`
- Daily run: find `subscriptions` where `status='active'` AND `next_reminder_date <= today`
- For each: fire `subscription_reminder` (email + WhatsApp) containing a **one-tap reorder link** (e.g., `/reorder?sub=<id>`) that pre-fills the cart with the subscription's product/size/quantity; set `last_reminder_at = now`; advance `next_reminder_date` by the interval
- **Never charge anything** — the customer always checks out manually
- Build the `/reorder?sub=<id>` route: validates the subscription belongs to the logged-in user (or prompts login), adds the item to cart, redirects to `/cart`
- Configure the cron in `vercel.json`

### 5b. Bulk Quote Online-Payment Page (`/quote/[token]`) — optional pay-online flow

This powers the **optional** "pay online" mode for bulk quotes (offline remains the default; this whole feature is gated by `isPayHereEnabled`).

- Build a public page `app/(storefront)/quote/[token]/page.tsx`:
  - Validate the `quote_token` against the `bulk_requests` row (HMAC + check `quote_expires_at`)
  - Show the quote: product, quantity, unit price, quoted total, the admin's message, and the expiry date
  - Provide a short checkout (fulfillment + address if needed) and a **"Accept & Pay"** button that pays via PayHere (reuse the Phase 3 PayHere code)
  - On successful payment: create a real `orders` row linked to the request (set `converted_order_id`, mark the request `accepted`/`completed`), and the order appears in the customer's order history
  - Handle states cleanly: expired link, already-paid, cancelled/rejected request — show a friendly branded message
- If PayHere is **not** configured, this page should not be reachable (no online quotes are ever generated in that case); show a graceful "this link isn't available" message rather than erroring
- No cart involvement; this is its own mini-checkout

### 6. Review Request Cron

- `app/api/cron/review-requests/route.ts` (protected by `CRON_SECRET`)
- Daily: find orders delivered exactly 2 days ago, fire `review_request`
- Configure in `vercel.json`

### 7. Notification Template Editor (Admin Settings)

In Admin Settings → Notifications (shell built in Phase 5):
- For each event, edit email subject + body (markdown editor with placeholder pickers)
- WhatsApp templates are immutable (set in Meta dashboard) — show content + variable list for reference
- Per-event enable/disable (email + WhatsApp independently)

### 8. SEO Pass

- Generate `sitemap.xml` (`next-sitemap` or built-in) + `robots.txt`
- Structured data:
  - **Organization** schema on every page (Uggalla Oil Mills)
  - **Product** schema on PDPs (verify from Phase 2)
  - **BreadcrumbList** on PDPs + category pages
  - **WebSite** with `SearchAction` on homepage
- Verify all dynamic pages have proper metadata
- OG image: branded default; per-product OG uses main product image
- Google verification meta tag config; submit sitemap to Search Console post-deploy

### 9. Performance Pass

- Audit bundle size: remove unused imports, lazy-load heavy components
- Image audit: correct `sizes` + aspect ratios everywhere
- Font optimization: subset, preload critical fonts
- `next/dynamic` for non-critical client components (e.g., admin rich text editor)
- DB query optimization: missing indexes, `select` only needed columns
- ISR / static generation where possible (About, FAQ)
- Cache headers on API routes
- Lighthouse targets: Homepage 90+ all; PDP 85+ Perf / 95+ others; Checkout 80+ Perf / 95+ others; Admin 75+ Perf / 90+ others

### 10. Accessibility Pass

- Run axe DevTools on all major pages; fix all violations
- Keyboard-test every flow (no mouse)
- Screen-reader test signup, checkout, account, bulk request
- Meaningful `alt` on all images
- Color contrast: verify green-on-cream and gold combos pass WCAG AA (4.5:1 normal, 3:1 large)
- Focus management: modals trap focus, return focus on close
- Skip-to-content link in storefront layout

### 11. Animation Polish Pass

- Smooth page transitions (Framer Motion `AnimatePresence`)
- Stagger animations on lists
- Product card hover refinement
- Add-to-cart success: brief floating thumbnail flying into the cart icon
- Loading skeletons match real layouts
- Branded, animated toasts
- Respect `prefers-reduced-motion` everywhere

### 12. Final Polish

- Empty states everywhere (catalog, search, wishlist, orders, subscriptions, bulk requests, admin tables)
- Error states with retry CTAs
- 404 + 500 pages branded (oil-droplet / coconut motif)
- Favicon set (multiple sizes, incl. PWA icon) from the logo
- `manifest.json` for basic PWA installability
- Cookie consent banner (good practice)
- Newsletter signup wired (collect into `newsletter_subscribers`, send welcome email)
- Contact form wired (sends to shop email)
- Final mobile QA at 375px; cross-browser test (Chrome, Safari, Firefox)

### 13. Deployment

- Push to GitHub; connect Vercel project
- Set all production env vars (real Supabase URL/keys, PayHere live credentials, Resend prod key, WhatsApp prod credentials, `CRON_SECRET`)
- Custom domain + SSL
- Vercel Analytics + Web Analytics
- Test PayHere in live mode with a real small transaction (then refund)
- Test WhatsApp templates with real numbers
- Final Lighthouse on production URL
- Submit sitemap to Google Search Console
- Set up Vercel Cron for subscription reminders + review requests

### 14. Documentation

Create / finalize:
- **README.md**: setup, env vars, migrations, seed, dev commands, deployment
- **docs/ADMIN_GUIDE.md**: how to add brands/products, manage orders, handle bulk requests + quotes, oversee subscriptions, configure settings — written for a non-technical shop owner
- **docs/PAYHERE_SETUP.md**: PayHere merchant onboarding
- **docs/WHATSAPP_SETUP.md**: Meta Business setup, template approval, phone verification
- **docs/SUPABASE_SETUP.md**: project creation, RLS notes, storage buckets

### 15. Launch Checklist

- [ ] All Phase 1–5 features verified working in production
- [ ] All env vars set in Vercel (prod), incl. `CRON_SECRET`
- [ ] Custom domain live with SSL
- [ ] Supabase production project provisioned and migrated
- [ ] PayHere live mode tested with real transaction
- [ ] WhatsApp templates all approved by Meta (incl. `bulk_quote_sent`, `subscription_reminder`)
- [ ] Email sending verified (check spam — SPF/DKIM set up)
- [ ] Sitemap submitted to Google Search Console
- [ ] Admin user created in production with secure password
- [ ] Real Royal Coco products + photos uploaded by admin (bottles, packets, bulk)
- [ ] Banner content set
- [ ] Delivery zones + time slots configured
- [ ] Subscription frequencies configured; one test reminder verified end-to-end
- [ ] Settings configured: shop info, tax, payment keys, notification toggles
- [ ] Test retail order placed end-to-end on production
- [ ] Test bulk request submitted + quote sent on production
- [ ] Privacy policy + T&C reviewed for SL compliance
- [ ] Backup strategy in place (Supabase automatic backups verified)
- [ ] Error monitoring set up (Sentry recommended — free tier)
- [ ] Analytics tracking verified

---

## Phase 6 Completion Checklist

- [ ] All notification triggers fire correctly via email + WhatsApp
- [ ] Notification logs visible in DB
- [ ] Idempotency prevents duplicate notifications
- [ ] **Subscription reminder cron fires daily; one-tap reorder link pre-fills the cart; nothing is auto-charged**
- [ ] Review request cron fires daily for orders delivered 2 days ago
- [ ] **Bulk request received + bulk quote sent notifications work (offline quote = no link; online quote = `/quote/[token]` pay-online link, gated by PayHere)**
- [ ] **Optional bulk quote online-payment page works: valid link → pay via PayHere → order created and linked; expired/already-paid links handled gracefully**
- [ ] SEO: sitemap, robots, structured data verified
- [ ] Lighthouse targets met on key pages
- [ ] Accessibility: axe shows no critical violations
- [ ] Animation polish complete, `prefers-reduced-motion` respected
- [ ] Deployment to Vercel successful with custom domain
- [ ] Documentation written
- [ ] Launch checklist fully ticked
- [ ] No TypeScript errors, no console errors anywhere
- [ ] **You can place a real retail order AND submit a bulk request end-to-end on the live site**

🎉 **You're launched.**
