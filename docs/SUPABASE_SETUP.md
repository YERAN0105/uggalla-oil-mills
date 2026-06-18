# Supabase Setup

Supabase is the only **required** service (Postgres + Auth + Storage). Everything else is optional.

## 1. Create the project

1. Sign in at [supabase.com](https://supabase.com) → **New project**.
2. Choose a region close to Sri Lanka (e.g. Singapore) and a strong database password.
3. Once provisioned, go to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose to the browser)

## 2. Run migrations (in order)

Open **SQL Editor** and run each file from `supabase/migrations/` in order, **001 → 011**. They
are written to be re-runnable. Highlights:

- `001` schema, `002` RLS policies, `003` storage buckets.
- `004` keeps `products.base_price` equal to the cheapest size (don't edit base_price by hand for
  retail products).
- `008` adds admin notes + the `banner-images` / `site-assets` buckets.
- `009`–`011` add the debounced notification tables (buffer, ledger, receipt track).

> RLS is enabled on **every** table. The app authorizes admin/server writes in application code via
> the service-role client; customer reads/writes are constrained by policies. The helper function
> `public.is_admin()` is used throughout — don't bypass it.

## 3. Seed data

Run, in order (both idempotent):

1. `supabase/seed.sql` — brands, categories, zones, slots, settings, bank details.
2. `supabase/seed-products.sql` — 9 sample products.

## 4. Storage buckets

`003` and `008` create the public buckets: `product-images`, `brand-images`, `category-images`,
`payment-receipts`, `bulk-attachments`, `review-images`, `banner-images`, `site-assets`. Admin
uploads run browser-side via the authenticated Supabase client (storage RLS grants admins write).

## 5. Auth configuration

- **Email/password** is on by default. For development you may disable "Confirm email"
  (Authentication → Providers → Email) so signups work without an inbox round-trip — **re-enable it
  before launch.**
- **Google OAuth (optional):** add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, set
  `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`, and add `${APP_URL}/auth/callback` as a redirect URL.
- Set the **Site URL** and redirect URLs to your deployed domain in Authentication → URL
  Configuration.

## 6. Create the admin user

Set `ADMIN_SEED_EMAIL` + `ADMIN_SEED_PASSWORD` in your env and run `npm run seed-admin`. This
creates the auth user and sets `role = 'admin'` in `public.users`.

## 7. Post-deploy: the notification dispatcher

The minute-level debounced-notification dispatcher is scheduled with `pg_cron` + `pg_net` **after
deploy** (Supabase can't reach localhost). Follow [`POST_DEPLOY_STEPS.md`](POST_DEPLOY_STEPS.md):
enable the `pg_cron` and `pg_net` extensions, set `CRON_SECRET`, and run the scheduling SQL pointing
at your production URL.

## Backups

The Supabase free tier includes automatic daily backups; verify your plan's retention before
launch and consider point-in-time recovery on paid tiers.
