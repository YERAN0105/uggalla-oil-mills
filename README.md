# Uggalla Oil Mills — E-Commerce Platform

Premium coconut oil e-commerce platform for Uggalla Oil Mills, Padukka, Sri Lanka.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase (Postgres + Auth + Storage, RLS) · Tailwind CSS · shadcn/ui · Framer Motion · Zustand · Zod

---

## Getting Started

### 1. Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- A [Supabase](https://supabase.com) project (free tier is fine for development)

### 2. Clone & Install

```bash
git clone <your-repo-url>
cd uggalla-oil-mills
npm install
```

### 3. Environment Variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in at minimum:

```
NEXT_PUBLIC_SUPABASE_URL=       # Required
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # Required
SUPABASE_SERVICE_ROLE_KEY=      # Required
```

All other variables are **optional** and the app runs without them. Features degrade gracefully:
- `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` → shows the "Continue with Google" button
- `RESEND_API_KEY` → enables transactional emails
- `PAYHERE_MERCHANT_ID` + `PAYHERE_MERCHANT_SECRET` → enables online payments
- `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` → enables WhatsApp notifications

### 4. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Setup

### Apply Migrations

In your Supabase dashboard → SQL Editor, run **all** migrations in order:

1. **`001_initial_schema.sql`** — all tables, types, indexes, triggers
2. **`002_rls_policies.sql`** — Row Level Security policies
3. **`003_storage_buckets.sql`** — Storage buckets & policies
4. **`004_min_price_trigger.sql`** — keeps `products.base_price` = `MIN(product_sizes.price)`
5. **`005_address_delivery_zone.sql`** — remembers a delivery zone per saved address
6. **`006_email_has_account.sql`** — checkout "you already have an account" helper
7. **`007_phase4_account.sql`** — account soft-delete, one-review-per-item, review delete policy
8. **`008_phase5_admin.sql`** — admin customer notes, `banner-images` + `site-assets` storage buckets
9. **`009_notification_debounce.sql`** — debounced order-status notifications (buffer + ledger)
10. **`010_receipt_notifications.sql`** — bank-receipt notification track
11. **`011_receipt_id_anchor.sql`** — receipt-id anchor for correction/apology logic

> After deploy, the **minute-level dispatcher** for debounced order-status emails is
> scheduled via Supabase `pg_cron`/`pg_net` — see [`docs/POST_DEPLOY_STEPS.md`](docs/POST_DEPLOY_STEPS.md).

> **Tip:** If you have the Supabase CLI installed:
> ```bash
> supabase db push
> ```

### Seed Data

After migrations, run both seed files in the SQL Editor (both are idempotent — safe to re-run):

1. **`supabase/seed.sql`** — base reference data (brands, categories, delivery zones, time slots, settings, bank details)
2. **`supabase/seed-products.sql`** — 9 sample products (5 retail Royal Coco with sizes, 4 bulk Uggalla Oil Mills)

> Run `seed.sql` **first** — `seed-products.sql` references the brand/category UUIDs it inserts.

### Create Admin User

Add your admin credentials to `.env.local`:

```
ADMIN_SEED_EMAIL=admin@example.com
ADMIN_SEED_PASSWORD=your-secure-password
```

Then run:

```bash
npm run seed-admin
```

This creates an auth user and sets `role = 'admin'` in `public.users`. Log in at `/login`.

### Supabase Storage Buckets

Run `supabase/migrations/003_storage_buckets.sql` in the SQL Editor to create buckets:
`product-images`, `brand-images`, `category-images`, `payment-receipts`, `bulk-attachments`, `review-images`

---

## Optional Integrations

The app is designed to work with **only Supabase** configured. Add these later:

| Feature | Env Vars | Effect |
|---|---|---|
| Google OAuth | `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` + `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Shows "Continue with Google" button |
| Email (Resend) | `RESEND_API_KEY` | Transactional emails (order confirmations, etc.) |
| Online Payments | `PAYHERE_MERCHANT_ID` + `PAYHERE_MERCHANT_SECRET` | Enables PayHere checkout; bulk quote pay-online link |
| WhatsApp | `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` | WhatsApp notifications |

**No code changes required** — just add the env vars and restart the dev server.

---

## Project Structure

```
app/
  (storefront)/   Homepage, shop, cart, checkout, account, orders/track, static pages
  (auth)/         Login, register, forgot/reset password
  admin/          Admin panel (Phase 5)
  auth/callback/  OAuth callback
  api/            Webhooks (PayHere), search, cron endpoints (Phase 6)
components/
  ui/             Base UI primitives (Button, Input, Dialog, etc.)
  shared/         BrandLogo, Container, FadeIn, DropletSVG
  storefront/     Header, Footer, cart drawer, product cards, checkout, wishlist
  account/        Account-area UI (nav, orders, subscriptions, reviews, addresses…)
lib/
  supabase/       client.ts (browser), server.ts (SSR), admin.ts (service-role)
  account/        Account data reads + server actions (orders, addresses, profile…)
  checkout/       Order creation, coupons, slot/zone data, schema
  orders/         Order read models, HMAC access token, status presentation, receipts
  loyalty/        Earn/reverse points engine (server-only)
  wishlist/       DB-backed wishlist actions + guest-merge
  products.ts     Catalog queries (server-only)   product-utils.ts  Pure helpers (client-safe)
  brand.ts        Brand config (name, tagline, contact, currency)
  integrations.ts Feature flags for optional services
  date.ts         Colombo timezone helpers          settings.ts  Typed settings reads
stores/
  cart.ts         Zustand cart (localStorage: uggalla-cart)
  wishlistStore.ts Zustand wishlist (localStorage: uggalla-wishlist)
supabase/
  migrations/     SQL migration files (run 001 → 007 in order)
  seed.sql        Base reference data    seed-products.sql  Sample products
scripts/
  seed-admin.ts   Create admin user
types/
  supabase.ts     DB schema types    checkout.ts / account.ts  Read-model types
```

---

## Build Phases

| Phase | Status | What's built |
|---|---|---|
| Phase 1 | ✅ Done | Foundation, auth, DB schema, brand system, homepage |
| Phase 2 | ✅ Done | Products, catalog, search, product detail, wishlist UI, bulk request form |
| Phase 3 | ✅ Done | Cart, checkout, PayHere + bank transfer + COD, orders, subscriptions, guest tracking |
| Phase 4 | ✅ Done | Customer account: orders, invoices, subscriptions, bulk-request history, addresses, DB wishlist, loyalty, reviews, profile |
| Phase 5 | ✅ Done | Full admin panel — dashboard, all CRUD, orders, bulk quotes, customers, settings, logs |
| Phase 6 | ✅ Done | Email + WhatsApp notifications, subscription-reminder & review crons, bulk quote pay-online page, SEO, polish |

See `MASTER_SPEC.md` for the full spec and `docs/PHASE_N.md` for each phase's detail. Project conventions for contributors are in `CLAUDE.md`.

---

## Notifications (Phase 6)

Transactional notifications go out over **email (Resend)** and **WhatsApp (Cloud API)**, both
gated by their env vars — when a channel isn't configured its sends are skipped (never error).

- **Order-status & bank-receipt emails** are **debounced** (≈3 min) and forward-only — see
  `CLAUDE.md` → "Notifications & Crons" and `docs/POST_DEPLOY_STEPS.md`.
- **Transactional events** (`welcome`, `bulk_request_received`, `bulk_quote_sent`,
  `subscription_reminder`, `review_request`) live in `lib/notifications/transactional.ts`.
- **Branded templates:** `emails/OrderStatusEmail.tsx` (orders) + `emails/NotificationEmail.tsx`
  (everything else). WhatsApp templates are listed in `lib/notifications/whatsapp.ts` and must be
  created/approved in Meta — see [`docs/WHATSAPP_SETUP.md`](docs/WHATSAPP_SETUP.md).
- **Per-channel + per-event toggles:** Admin → Settings → Notifications.

### Scheduled jobs (cron)

| Route | Schedule | Driven by |
|---|---|---|
| `/api/cron/dispatch-notifications` | every minute (only when rows are due) | Supabase `pg_cron` (post-deploy) |
| `/api/cron/subscription-reminders` | daily | Vercel Cron (`vercel.json`) |
| `/api/cron/review-requests` | daily | Vercel Cron (`vercel.json`) |

All cron routes require `Authorization: Bearer ${CRON_SECRET}`. Vercel sends this header
automatically for the jobs in `vercel.json` once `CRON_SECRET` is set in the project env.

---

## Deployment (Vercel)

1. Push to GitHub and import the repo into Vercel.
2. Set all production env vars (Supabase, `NEXT_PUBLIC_APP_URL`, `RESEND_*`, `CRON_SECRET`, and —
   when ready — `PAYHERE_*` and `WHATSAPP_*`).
3. Provision the production Supabase project and run migrations `001`→`011` + both seed files.
4. After the first deploy, complete [`docs/POST_DEPLOY_STEPS.md`](docs/POST_DEPLOY_STEPS.md)
   (schedule the `pg_cron` dispatcher; verify a test notification end-to-end).
5. Add a custom domain + SSL; submit `/sitemap.xml` to Google Search Console.

See also: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md),
[`docs/PAYHERE_SETUP.md`](docs/PAYHERE_SETUP.md),
[`docs/WHATSAPP_SETUP.md`](docs/WHATSAPP_SETUP.md), and the non-technical
[`docs/ADMIN_GUIDE.md`](docs/ADMIN_GUIDE.md).

### Favicons & PWA icons

Brand icons are generated from `public/logo.jpeg` by [`scripts/generate-icons.ts`](scripts/generate-icons.ts)
(`npm run generate-icons`): `app/icon.png` (browser-tab favicon) and `app/apple-icon.png` (iOS) via
Next's icon convention, plus `public/icon-192.png`, `public/icon-512.png`, and a maskable
`public/icon-maskable-512.png` referenced by `app/manifest.ts`. Re-run the script after changing the logo.

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (writes files)
npm run seed-admin   # Create admin user (requires ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD in .env.local)
npx tsc --noEmit     # Type-check only
```

> `npm run build` fails with an `EPERM … .next/trace` error while `npm run dev` is running (the dev server locks `.next`). To verify changes without stopping the dev server, use `npx tsc --noEmit`.
