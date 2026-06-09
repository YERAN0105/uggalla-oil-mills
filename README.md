# Uggalla Oil Mills — E-Commerce Platform

Premium coconut oil e-commerce platform for Uggalla Oil Mills, Padukka, Sri Lanka.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase · Tailwind CSS · shadcn/ui · Framer Motion

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

In your Supabase dashboard → SQL Editor, run the migrations in order:

1. **`supabase/migrations/001_initial_schema.sql`** — all tables, types, indexes, triggers
2. **`supabase/migrations/002_rls_policies.sql`** — Row Level Security policies
3. **`supabase/migrations/003_storage_buckets.sql`** — Storage buckets & policies

> **Tip:** If you have the Supabase CLI installed:
> ```bash
> supabase db push
> ```

### Seed Data

After migrations, run the seed file to populate initial data (brand, categories, zones, slots, settings):

```sql
-- In Supabase SQL Editor, paste and run:
-- (contents of supabase/seed.sql)
```

Or with the CLI:
```bash
supabase db seed --db-url "your-db-connection-string"
```

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
  (storefront)/   Homepage, shop, cart, checkout, account, static pages
  (auth)/         Login, register, forgot/reset password
  admin/          Admin panel (Phase 5)
  auth/callback/  OAuth callback
  api/            Webhooks, cron endpoints
components/
  ui/             Base UI components (Button, Input, Card, etc.)
  shared/         BrandLogo, Container, FadeIn, DropletSVG
  storefront/     Header, Footer, WhatsAppButton
lib/
  supabase/       client.ts, server.ts, admin.ts
  brand.ts        Brand config (name, tagline, contact, colors)
  integrations.ts Feature flags for optional services
  date.ts         Colombo timezone helpers
  utils.ts        cn() class merger
supabase/
  migrations/     SQL migration files (run in order)
  seed.sql        Initial data seed
scripts/
  seed-admin.ts   Create admin user
types/
  supabase.ts     TypeScript types for DB schema
```

---

## Build Phases

| Phase | Status | What's built |
|---|---|---|
| Phase 1 | ✅ Done | Foundation, auth, DB schema, brand system, homepage |
| Phase 2 | Pending | Products, catalog, search, product detail, wishlist, bulk request form |
| Phase 3 | Pending | Cart, checkout, payments, orders, subscriptions |
| Phase 4 | Pending | Customer account, order history, loyalty, reviews |
| Phase 5 | Pending | Full admin panel |
| Phase 6 | Pending | Email/WhatsApp notifications, SEO, performance, deployment |

---

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier
npm run seed-admin   # Create admin user (requires ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD in .env.local)
```
