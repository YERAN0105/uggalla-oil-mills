# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (writes files)
npm run seed-admin   # Create admin user — requires ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD in .env.local
```

### Seeding Products (Phase 2)

Run `supabase/seed-products.sql` in the Supabase SQL Editor after the three migrations.
It inserts the Royal Coco brand, three categories (Bottles, Packets, Bulk), and 7 sample products with sizes and images. Idempotent — safe to re-run.

There are no automated tests yet (added in a later phase).

## Architecture

**Next.js 15 App Router** with two completely separate experiences sharing one codebase:

- `app/(storefront)/` — customer-facing store (public)
- `app/admin/` — admin panel, protected by middleware (`role = 'admin'` in `public.users`)
- `app/(auth)/` — login/register/reset, uses server actions in `app/(auth)/actions.ts`
- `app/auth/callback/` — Supabase OAuth callback route
- `app/api/` — webhooks and cron endpoints (built in later phases)

**Supabase** is the only required service. Everything else is optional and controlled by flags in `lib/integrations.ts`. Never check `process.env` directly for optional integrations — always use the exported booleans (`isResendEnabled`, `isGoogleAuthEnabled`, `isPayHereEnabled`, `isWhatsAppEnabled`).

**Three Supabase clients** — use the right one for the context:
- `lib/supabase/client.ts` — browser (Client Components)
- `lib/supabase/server.ts` — server (Server Components, Route Handlers, Server Actions)
- `lib/supabase/admin.ts` — service-role, bypasses RLS — server-only, never import in client code

**Middleware** (`middleware.ts`) refreshes sessions on every request and redirects unauthenticated users away from `/admin/*`. It also checks `public.users.role = 'admin'` before allowing access.

**Brand config** lives entirely in `lib/brand.ts` (name, tagline, contact, currency, timezone) and `app/globals.css` (CSS variables for the color palette). The Tailwind theme in `tailwind.config.ts` maps those CSS variables. Change brand details in one place — nowhere else.

**All dates and times** must use `lib/date.ts` helpers, which wrap `date-fns-tz` for the `Asia/Colombo` timezone. Never use raw `new Date()` formatting for user-visible timestamps.

**Money columns** in the DB are `numeric(12,2)` — never floats. Format for display using `formatCurrency()` from `lib/brand.ts`.

## Database

Migrations in `supabase/migrations/` must be run in order (001 → 002 → 003) via the Supabase SQL Editor or CLI. RLS is enabled on every table. The helper function `public.is_admin()` is used throughout RLS policies — do not bypass it.

The `public.users` table extends `auth.users` via a trigger (`handle_new_user`). Always upsert into `public.users` by `id`; never insert a row that doesn't have a matching `auth.users` entry.

## Build Phases

Phases 1 and 2 are complete. Phases 3–6 are pending. Do not build features from future phases when working on the current one. Each phase has a spec in `docs/PHASE_N.md` and the full spec is in `MASTER_SPEC.md`.

| Phase | Scope |
|---|---|
| 1 ✅ | Foundation, auth, DB schema, brand system, homepage |
| 2 ✅ | Products, catalog, search, PDP, wishlist, bulk request form |
| 3 | Cart, checkout, PayHere + bank transfer + COD, orders, subscriptions |
| 4 | Customer account, order history, loyalty points, reviews |
| 5 | Full admin panel |
| 6 | Email/WhatsApp notifications, SEO, performance, Vercel deployment |

## Key Conventions

- Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs).
- Mutations use Server Actions, not API routes, unless it's a webhook.
- `components/ui/` — base primitives (Button, Input, Card, etc.)
- `components/shared/` — layout helpers used across both storefront and admin (BrandLogo, Container, FadeIn, DropletSVG)
- `components/storefront/` — storefront-specific (Header, Footer, WhatsAppButton)
- The `FadeIn` component (`components/shared/FadeIn.tsx`) wraps Framer Motion and respects `prefers-reduced-motion` globally via CSS in `globals.css`.
- The Google OAuth button is conditionally rendered based on `isGoogleAuthEnabled` — the login page always works with email/password even when Google is not configured.
