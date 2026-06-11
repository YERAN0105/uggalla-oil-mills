# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run format       # Prettier (writes files)
npm run seed-admin   # Create admin user — requires ADMIN_SEED_EMAIL + ADMIN_SEED_PASSWORD in .env.local
npx tsc --noEmit     # Type-check only
```

`npm run build` fails with an `EPERM ... .next/trace` error while `npm run dev` is running (the dev server locks `.next`). To verify changes without stopping the dev server, use `npx tsc --noEmit` instead.

### Seeding Products (Phase 2)

Run `supabase/seed.sql` (base reference data) and `supabase/seed-products.sql` in the Supabase SQL Editor after the migrations. Both are idempotent — safe to re-run.

`seed-products.sql` inserts two brands, three categories (Bottles, Packets, Bulk), and 9 sample products — 5 retail (Royal Coco, with sizes) and 4 bulk (Uggalla Oil Mills, one per oil type, no sizes). **Its brand/category UUIDs must match the ones already inserted by `seed.sql`** — `seed.sql` runs first and `ON CONFLICT (slug) DO UPDATE` keeps the original UUID, so a mismatch produces a foreign-key error on the product inserts.

There are no automated tests yet (added in a later phase).

## Architecture

**Next.js 15 App Router** with two completely separate experiences sharing one codebase:

- `app/(storefront)/` — customer-facing store (public)
- `app/admin/` — admin panel, protected by middleware (`role = 'admin'` in `public.users`)
- `app/(auth)/` — login/register/reset, uses server actions in `app/(auth)/actions.ts`
- `app/auth/callback/` — Supabase OAuth callback route
- `app/api/` — webhooks and cron endpoints (e.g. the PayHere webhook at `app/api/payments/payhere/webhook`; subscription/review crons come in Phase 6)

**Supabase** is the only required service. Everything else is optional and controlled by flags in `lib/integrations.ts`. Never check `process.env` directly for optional integrations — always use the exported booleans (`isResendEnabled`, `isGoogleAuthEnabled`, `isPayHereEnabled`, `isWhatsAppEnabled`).

**Three Supabase clients** — use the right one for the context:
- `lib/supabase/client.ts` — browser (Client Components)
- `lib/supabase/server.ts` — server (Server Components, Route Handlers, Server Actions)
- `lib/supabase/admin.ts` — service-role, bypasses RLS — server-only, never import in client code

**Middleware** (`middleware.ts`) refreshes sessions on every request, redirects unauthenticated users away from `/account/*`, and redirects them away from `/admin/*` (additionally checking `public.users.role = 'admin'`). Account pages also guard server-side via `getAccountUser()` (which returns `null` for blocked/soft-deleted users) — defense in depth.

**Brand config** lives entirely in `lib/brand.ts` (name, tagline, contact, currency, timezone) and `app/globals.css` (CSS variables for the color palette). The Tailwind theme in `tailwind.config.ts` maps those CSS variables. Change brand details in one place — nowhere else.

**All dates and times** must use `lib/date.ts` helpers, which wrap `date-fns-tz` for the `Asia/Colombo` timezone. Never use raw `new Date()` formatting for user-visible timestamps.

**Money columns** in the DB are `numeric(12,2)` — never floats. Format for display using `formatCurrency()` from `lib/brand.ts`.

**Two brands, by product type.** Retail bottles and packets belong to the **Royal Coco** brand; bulk / wholesale products belong to the **Uggalla Oil Mills** brand. Bulk products are *not* Royal Coco. When adding or seeding products, assign the brand by product type, not by company name.

## Database

Migrations in `supabase/migrations/` must be run in order (001 → 007) via the Supabase SQL Editor or CLI. RLS is enabled on every table. The helper function `public.is_admin()` is used throughout RLS policies — do not bypass it. (Migration 007 adds `users.deleted_at` for soft-deleting accounts, a unique index enforcing one review per `order_item_id`, and a customer "delete own review" policy.)

The `public.users` table extends `auth.users` via a trigger (`handle_new_user`). Always upsert into `public.users` by `id`; never insert a row that doesn't have a matching `auth.users` entry.

**`products.base_price` is trigger-managed (migration 004).** A trigger keeps it equal to `MIN(product_sizes.price)` on every size insert/update/delete. Treat it as read-only — never set it by hand in app code, and in the Phase 5 admin panel surface it as a calculated field (require at least one size before a product can be published, since the trigger only fires once sizes exist).

## Product Price Model

A product's displayed price ("from Rs. X") is the **minimum of its `product_sizes.price`**. Retail products (bottles, packets) have several sizes; **bulk products have no `product_sizes` rows at all** — their price lives in `products.base_price`, and `getMinPrice()` falls back to it. That split drives everything price-related:

- **Display & sorting:** use `getMinPrice()`; sort by `base_price` (the trigger keeps it equal to the min size price for sized products, and it's the indicative price for bulk).
- **Price-range filtering:** `getProducts()` in `lib/products.ts` unions **two** ID sets — products with *any size in range* (retail) and *sizeless products whose `base_price` is in range* (bulk). This is how bulk products participate in price filtering despite having no sizes. The union is safe for retail because the migration-004 trigger guarantees `base_price = MIN(size price)`, so any retail product matched via `base_price` is always already matched via a size. `getProducts()` resolves all size/price/brand/category matches into ID lists first, then filters the product query by those IDs.
- **Client/server split:** `lib/products.ts` is server-only (it imports `lib/supabase/server.ts` → `next/headers`). Pure helpers that client components need (`getMinPrice`, `getPrimaryImage`) live in `lib/product-utils.ts`. Client Components must import from `lib/product-utils`, never `lib/products`.

## Catalog Routing & Filters

A category can be viewed two ways, and they are intentionally different:

- **`/shop?category=<slug>`** — a *filter* on the main shop page (multi-select, additive with other filters). The homepage cards link to the dedicated pages, but the FilterSidebar checkboxes drive this param.
- **`/shop/category/<slug>`** — a *dedicated* landing page with a hero banner and brand eyebrow. It scopes products by the **route slug** and deliberately **ignores any `?category=` param** — don't "fix" it to read that param.

`FilterSidebar` (and `MobileFilterDrawer`) take `hideCategories` / `hideBrands` / `hideSizes` props so a page can drop filter sections that don't apply. Category pages hide Category and Brand always (the page is already scoped to one category, which maps to one brand), and hide Size on the bulk category (bulk products have no sizes). The main `/shop` shows all four.

## Cart, Checkout & Orders (Phase 3)

**Cart is a Zustand `persist` store** (`stores/cart.ts`, localStorage key `uggalla-cart`). `partialize` persists only `items` + `appliedCoupon` — never the transient `isDrawerOpen` flag. Pure selectors (`getSubtotal`, `getCartCount`, `computeCouponDiscount`) are exported from the store file so non-React code can use them. The drawer is global (mounted in `app/(storefront)/layout.tsx` as `<CartDrawer />`) and opened via the store's `openDrawer()`; the header `CartButton` triggers it. Only retail products may enter the cart — bulk goes through the quote flow.

**The client price is never trusted.** Adding to cart calls `validateCartItem` (`lib/cart/actions.ts`) which re-fetches the product/size and returns a recomputed line. `createOrder` (`lib/checkout/actions.ts`) re-fetches *everything* again and recomputes subtotal, coupon, loyalty, delivery, tax, and total server-side before inserting. Treat any price arriving from the client as display-only.

**Order writes go through the service-role admin client** (`createAdminClient`), not the RLS-bound server client. This is deliberate: guest orders (`user_id IS NULL`) and the multi-row order/items/history/coupon/loyalty/subscription/stock mutations need to bypass RLS, and **authorization is enforced in app code instead**. Follow this pattern for order-related writes; don't try to route them through RLS.

**Settings are read via the admin client** (`lib/settings.ts`, server-only). The RLS policy only exposes `shop_info`/`tax`/`subscription_frequencies` publicly, but the storefront needs `cod_limits`/`bank_details`/`loyalty` for guests and non-admin users. `getSetting<T>(key, fallback)` always returns a typed value (falls back to in-file defaults). `bank_details` lives in `seed.sql`.

**Guest order access uses a stateless HMAC token** (`lib/orders/token.ts`; secret = `ORDER_TOKEN_SECRET ?? CRON_SECRET ?? SUPABASE_SERVICE_ROLE_KEY`). `getOrderForView(orderNumber, token)` grants access if the token verifies *or* the logged-in user owns the order. The order-success page passes `?t=<token>`; `/orders/track` matches by order number + email/phone. Order numbers are `UOM-YYYYMMDD-XXXXXX` (Colombo date), generated in app code, not the DB default.

**PayHere is fully built but gated by `isPayHereEnabled`.** Checkout only offers "Pay Online" when that flag is true, and `createOrder` rejects the `payhere` method server-side while it's false — but the redirect page (`/checkout/pay/[orderNumber]`), webhook (`/api/payments/payhere/webhook`), and `lib/payments/payhere.ts` (MD5 hash + signature verification) all exist and activate the moment merchant keys are set. The webhook always returns 200; invalid-signature payloads are logged only (never written, since `payments.order_id` is NOT NULL). Use the same "build it fully, gate the entry point" approach for other optional integrations.

**Subscriptions are reminder-only** — `createOrder` inserts a `subscriptions` row (`next_reminder_date = delivery_date + interval`) for subscription-flagged items, **only for logged-in users**, and stores no payment instrument. Guests are nudged to log in; the order still proceeds without the subscription. Never add auto-charge.

**Slot capacity** is a count of non-cancelled orders for a `(date, slot)` pair (`getSlotAvailability` for display, re-checked in `createOrder`). A small race window is accepted at this scale.

## Customer Account (Phase 4)

The logged-in account lives under `app/(storefront)/account/` with a server-guarded `layout.tsx` + sticky `AccountNav`. A single `account/loading.tsx` and `account/error.tsx` act as the Suspense/error boundary for every sub-page.

**Account reads use the service-role admin client filtered by `user_id`** (`lib/account/data.ts`), the same pattern as order writes. This is deliberate: RLS-bound joins would drop rows whose referenced product has since been unpublished (e.g. a subscription or wishlist item for a now-hidden product), and the account needs to surface those as "no longer available". Authorization is the `.eq("user_id", userId)` filter. Read models live in `types/account.ts`.

**Loyalty earn/reverse logic is in `lib/loyalty/engine.ts` — a plain server module, NOT a `"use server"` file**, so it is never exposed as a client-callable action. `earnLoyaltyForOrder` is idempotent (guarded by an existing `earn` transaction) and is wired to fire when an order becomes `delivered` (the admin trigger lands in Phase 5). `reverseLoyaltyForOrder` refunds redeemed points and claws back earned points, and is called from the customer cancel flow. Earn rate, redemption rate, and expiry all come from the `loyalty` setting.

**Cancelling an order** (`cancelOrder` in `lib/account/actions.ts`) is only allowed while `status = 'pending_confirmation'` (`isCancellable` in `lib/orders/status.ts`) and reverses everything the order touched: restores tracked stock, deletes `coupon_usage`, calls `reverseLoyaltyForOrder`, cancels subscriptions created from the order, and writes status history. Only a `paid` order's `payment_status` flips to `refunded` — unpaid orders keep theirs.

**Wishlist is DB-backed but the Zustand store stays the source of truth for the live header count.** `stores/wishlistStore.ts` persists the guest id list to `localStorage` (`uggalla-wishlist`) and carries a transient `authed` flag. `components/storefront/WishlistProvider.tsx` (mounted in the storefront layout) calls `syncWishlist(localIds)` once on mount: for signed-in users it merges the guest list into the DB and replaces the store with the authoritative list; guests keep their local list. `WishlistButton` mutates optimistically and persists via `toggleWishlistDb` when `authed` (reverting on failure). All wishlist server actions are in `lib/wishlist/actions.ts`.

**Order presentation is centralized in `lib/orders/status.ts`** — status/payment labels, badge tones (`orderStatusVariant`), and the timeline step order (`timelineSteps`, `statusStepIndex`). Reuse these everywhere an order status is rendered rather than re-declaring label maps.

**Invoices are print-to-PDF, not a PDF library.** `/account/orders/[orderNumber]/invoice` renders an `#invoice-print-area` and a client `window.print()` button, with print-isolation CSS that hides all other page chrome. There is intentionally no `@react-pdf/renderer` dependency.

## Build Phases

Phases 1–4 are complete. Phases 5–6 are pending. Do not build features from future phases when working on the current one. Each phase has a spec in `docs/PHASE_N.md` and the full spec is in `MASTER_SPEC.md`.

| Phase | Scope |
|---|---|
| 1 ✅ | Foundation, auth, DB schema, brand system, homepage |
| 2 ✅ | Products, catalog, search, PDP, wishlist, bulk request form |
| 3 ✅ | Cart, checkout, PayHere + bank transfer + COD, orders, subscriptions |
| 4 ✅ | Customer account, order history, loyalty points, reviews, subscription & bulk-request management |
| 5 | Full admin panel |
| 6 | Email/WhatsApp notifications, SEO, performance, Vercel deployment |

Two hooks were left ready for Phase 5: `earnLoyaltyForOrder` (call when an admin marks an order `delivered`) and `products.base_price` surfaced as a read-only calculated field.

## Key Conventions

- Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs).
- Mutations use Server Actions, not API routes, unless it's a webhook.
- `components/ui/` — base primitives (Button, Input, Card, etc.)
- `components/shared/` — layout helpers used across both storefront and admin (BrandLogo, Container, FadeIn, DropletSVG)
- `components/storefront/` — storefront-specific (Header, Footer, WhatsAppButton); `components/account/` — account-area UI (nav, order/subscription/review/address/wishlist managers, shared `primitives.tsx`)
- `stores/` — Zustand client-side stores: `cart.ts` (`uggalla-cart`) and `wishlistStore.ts` (`uggalla-wishlist`), both `localStorage`-persisted.
- The `FadeIn` component (`components/shared/FadeIn.tsx`) wraps Framer Motion and respects `prefers-reduced-motion` globally via CSS in `globals.css`.
- The Google OAuth button is conditionally rendered based on `isGoogleAuthEnabled` — the login page always works with email/password even when Google is not configured.
- `globals.css` applies a global brand-green `:focus-visible` ring to **every** focusable element. To suppress it on a specific element (e.g. a text input styled as a borderless pill), add `focus-visible:ring-0 focus-visible:ring-offset-0` — don't remove the global rule.

## Zustand + localStorage Hydration

Any component that reads from a Zustand `persist` store must use a mounted guard, or it will produce a React hydration mismatch (the server renders the default empty state; the client rehydrates from `localStorage` with a different value):

```tsx
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
const saved = mounted ? isInWishlist(productId) : false;
```

See `components/storefront/WishlistButton.tsx` as the reference. Apply this pattern to every component that derives UI state from a persisted store.

## Form Validation Pattern

For any non-trivial form, co-locate a `schema.ts` next to the form and server action files. Export a Zod schema and the inferred type from it; import both in the client form (for live "reward early, punish late" validation) and the server action (as the final authority before touching the DB). See `app/(storefront)/bulk-request/schema.ts` as the reference implementation.

The client form should be fully controlled (`useState` per field), track a `touched: Set<string>` for blurred fields and a `submitted: boolean` flag, and derive errors live via `useMemo(() => Schema.safeParse(...))`. Error visibility rule: `(touched.has(field) || submitted) ? errors[field]?.[0] : undefined`.
