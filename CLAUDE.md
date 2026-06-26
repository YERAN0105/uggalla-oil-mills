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

Run `supabase/seed.sql` (base reference data) and `supabase/seed-products.sql` in the Supabase SQL Editor after the migrations. They are idempotent only in the sense that re-running won't error or duplicate — but **`seed.sql` is destructive on re-run against a live DB**: it UPSERTs (`ON CONFLICT … DO UPDATE`), so it overwrites admin-edited brands, categories, delivery zones, time slots, and **every `settings` row** (shop_info, bank_details, tax, loyalty, cod_limits, pickup_limits, notifications) back to the placeholders in the file. Orders/products/customers aren't in `seed.sql` and are untouched. To add a single new settings key to a live DB, never re-run the whole file — run a targeted `insert … on conflict (key) do nothing;` (the file's header documents this).

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

Migrations in `supabase/migrations/` must be run in order (001 → 015) via the Supabase SQL Editor or CLI. RLS is enabled on every table. The helper function `public.is_admin()` is used throughout RLS policies — do not bypass it. (Migration 007 adds `users.deleted_at` for soft-deleting accounts, a unique index enforcing one review per `order_item_id`, and a customer "delete own review" policy. Migration 008 — Phase 5 — adds `users.admin_notes` and the `banner-images` + `site-assets` storage buckets; the admin panel's customer notes, banner images, and shop logo / OG uploads all fail until it is run. Migrations 009–011 — Phase 6 — add the notification debounce buffers + ledger; they are additive/idempotent, but the `pg_cron` schedule that drives the dispatcher is created **post-deploy**, not in a migration — see `docs/POST_DEPLOY_STEPS.md` and "Notifications & Crons" below. Migrations 012–013 add bulk-request line items and an order quote-note column. Migration 014 adds `product_sizes.compare_at_price` for sale-price display — see "Product Price Model" below; until it is run, saving a product with a "Was price" fails. Migration 015 adds `banners.mobile_image_url` for the responsive hero — see "Responsive Hero Images" below; until it is run, saving any banner fails.)

The `public.users` table extends `auth.users` via a trigger (`handle_new_user`). Always upsert into `public.users` by `id`; never insert a row that doesn't have a matching `auth.users` entry.

**`products.base_price` is trigger-managed (migration 004) for retail products.** A trigger keeps it equal to `MIN(product_sizes.price)` on every size insert/update/delete. Treat it as read-only for sized products — never set it by hand. The admin product form surfaces it as a calculated "from" price and blocks publishing a retail product until it has ≥1 size. **Exception: bulk products have no sizes**, so `saveProduct` (`lib/admin/products.ts`) writes `base_price` directly for `purchase_type = 'bulk_quote'` (the trigger never fires for them).

## Product Price Model

A product's displayed price ("from Rs. X") is the **minimum of its `product_sizes.price`**. Retail products (bottles, packets) have several sizes; **bulk products have no `product_sizes` rows at all** — their price lives in `products.base_price`, and `getMinPrice()` falls back to it. That split drives everything price-related:

- **Display & sorting:** use `getMinPrice()`; sort by `base_price` (the trigger keeps it equal to the min size price for sized products, and it's the indicative price for bulk).
- **Price-range filtering:** `getProducts()` in `lib/products.ts` unions **two** ID sets — products with *any size in range* (retail) and *sizeless products whose `base_price` is in range* (bulk). This is how bulk products participate in price filtering despite having no sizes. The union is safe for retail because the migration-004 trigger guarantees `base_price = MIN(size price)`, so any retail product matched via `base_price` is always already matched via a size. `getProducts()` resolves all size/price/brand/category matches into ID lists first, then filters the product query by those IDs.
- **Client/server split:** `lib/products.ts` is server-only (it imports `lib/supabase/server.ts` → `next/headers`). Pure helpers that client components need (`getMinPrice`, `getPrimaryImage`) live in `lib/product-utils.ts`. Client Components must import from `lib/product-utils`, never `lib/products`.

**Sale / discount display is per-size and display-only.** `product_sizes.compare_at_price` (migration 014) is the optional "was" price struck through on the storefront; the real selling price stays in `product_sizes.price`, so cart/checkout/totals never change — discounts are purely presentational. A DB CHECK enforces `compare_at_price IS NULL OR compare_at_price > price`, which means **a non-null `compare_at_price` is, by definition, on sale** (no column-to-column comparison needed when querying). Discount helpers live in `lib/product-utils.ts`: `getSizeDiscount(price, compareAt)` for one size, `getDisplayDiscount(product)` for the cheapest ("from") size shown on cards. The admin product form exposes an optional "Was price" column per size (`lib/admin/products.ts` writes `compare_at_price`; validation refine in `lib/admin/schemas.ts`). Bulk products never show a discount.

**The PDP shares the selected size across components via React context** (`components/storefront/PdpPurchase.tsx`). The price heading (`PdpPriceHeading`), the size picker (`ProductOptions`), and the mobile `StickyBottomBar` all read/write one `selectedSize` through `usePdpSize()` so the displayed price (and that size's own discount) tracks the selection live. A single-size product is auto-selected so its real price shows immediately (no "from"). The provider wraps the whole product page return in `app/(storefront)/shop/[slug]/page.tsx`.

## Responsive Hero Images

The homepage hero (`HeroCarousel`) takes an **optional per-slide mobile (portrait) image** alongside the required wide one. The slide type is `{ image, mobileImage?, … }`: when `mobileImage` is set, the carousel renders **two** stacked `next/image`s — the portrait crop with `sm:hidden` and the wide one with `hidden sm:block` — so phones see the tall crop and ≥sm sees the wide. When it's absent, the single wide image renders on every screen (prior behaviour), so the feature is fully backward-compatible. The fallback is **per slide**, so a slideshow can mix slides that have a mobile crop with ones that don't.

Two image sources feed it (`app/(storefront)/page.tsx`): admin **banners** (`banners.mobile_image_url`, migration 015; uploaded via the "Mobile image" field in `BannersManager`) and the **built-in default** hero — a tall `public/hero-mobile.jpeg` is auto-detected via an `fs.existsSync` check at module load (drop the file in, no code change; absent → wide `hero.jpeg` everywhere). A banner with no mobile crop falls back to its **own** wide image, never the default's mobile crop. **Gotcha:** `mobile_image_url` is a referenced storage column — it's tracked in the orphan **storage sweep** keep-list and in banner delete/replace cleanup (`lib/admin/banners.ts`), so don't add new image columns without wiring both. Recommended upload dimensions for every image type live in `docs/IMAGE_SIZES.md`.

## Catalog Routing & Filters

A category can be viewed two ways, and they are intentionally different:

- **`/shop?category=<slug>`** — a *filter* on the main shop page (multi-select, additive with other filters). The homepage cards link to the dedicated pages, but the FilterSidebar checkboxes drive this param.
- **`/shop/category/<slug>`** — a *dedicated* landing page with a hero banner and brand eyebrow. It scopes products by the **route slug** and deliberately **ignores any `?category=` param** — don't "fix" it to read that param.

`FilterSidebar` (and `MobileFilterDrawer`) take `hideCategories` / `hideBrands` / `hideSizes` props so a page can drop filter sections that don't apply. Category pages hide Category and Brand always (the page is already scoped to one category, which maps to one brand), and hide Size on the bulk category (bulk products have no sizes). The main `/shop` shows all four.

**Sale catalog.** `/sale` is a dedicated landing page (mirrors the shop page layout) that calls `getProducts({ onSale: true })` — the `onSale` filter resolves product IDs from `product_sizes` rows with a non-null `compare_at_price`. The same filter is exposed on `/shop` as an opt-in "On sale only" checkbox (`?sale=1`), shown by passing `showSale` to `FilterSidebar`/`MobileFilterDrawer` (off by default, so it doesn't appear on category or sale pages).

## Cart, Checkout & Orders (Phase 3)

**Cart is a Zustand `persist` store** (`stores/cart.ts`, localStorage key `uggalla-cart`). `partialize` persists only `items` + `appliedCoupon` — never the transient `isDrawerOpen` flag. Pure selectors (`getSubtotal`, `getCartCount`, `computeCouponDiscount`) are exported from the store file so non-React code can use them. The drawer is global (mounted in `app/(storefront)/layout.tsx` as `<CartDrawer />`) and opened via the store's `openDrawer()`; the header `CartButton` triggers it. Only retail products may enter the cart — bulk goes through the quote flow.

**The client price is never trusted.** Adding to cart calls `validateCartItem` (`lib/cart/actions.ts`) which re-fetches the product/size and returns a recomputed line. `createOrder` (`lib/checkout/actions.ts`) re-fetches *everything* again and recomputes subtotal, coupon, loyalty, delivery, tax, and total server-side before inserting. Treat any price arriving from the client as display-only.

**Order writes go through the service-role admin client** (`createAdminClient`), not the RLS-bound server client. This is deliberate: guest orders (`user_id IS NULL`) and the multi-row order/items/history/coupon/loyalty/subscription/stock mutations need to bypass RLS, and **authorization is enforced in app code instead**. Follow this pattern for order-related writes; don't try to route them through RLS.

**Settings are read via the admin client** (`lib/settings.ts`, server-only). The RLS policy only exposes `shop_info`/`tax`/`subscription_frequencies` publicly, but the storefront needs `cod_limits`/`pickup_limits`/`bank_details`/`loyalty` for guests and non-admin users. `getSetting<T>(key, fallback)` always returns a typed value (falls back to in-file defaults). `bank_details` lives in `seed.sql`.

**Guest order access uses a stateless HMAC token** (`lib/orders/token.ts`; secret = `ORDER_TOKEN_SECRET ?? CRON_SECRET ?? SUPABASE_SERVICE_ROLE_KEY`). `getOrderForView(orderNumber, token)` grants access if the token verifies *or* the logged-in user owns the order. The order-success page passes `?t=<token>`; `/orders/track` matches by order number + email/phone. Order numbers are `UOM-YYYYMMDD-XXXXXX` (Colombo date), generated in app code, not the DB default.

**PayHere is fully built but gated by `isPayHereEnabled`.** Checkout only offers "Pay Online" when that flag is true, and `createOrder` rejects the `payhere` method server-side while it's false — but the redirect page (`/checkout/pay/[orderNumber]`), webhook (`/api/payments/payhere/webhook`), and `lib/payments/payhere.ts` (MD5 hash + signature verification) all exist and activate the moment merchant keys are set. The webhook always returns 200; invalid-signature payloads are logged only (never written, since `payments.order_id` is NOT NULL). Use the same "build it fully, gate the entry point" approach for other optional integrations.

**Cash-on-hand-over is one stored method (`payment_method = "cod"`) gated by two settings.** The same "cash" choice is labelled "Cash on Delivery" for delivery and "Pay at Store" for pickup — the label is always derived from `payment_method === "cod"` + `fulfillment_type` (`paymentMethodLabel` in `lib/orders/status.ts`, mirrored in `OrderDetailView`), **never** from a distinct stored tag, so order/admin/invoice views need no change to tell them apart. But the *eligibility gate* differs by fulfillment: delivery uses `cod_limits` (trip cost + refusal risk), pickup uses `pickup_limits` (paid at the counter, low-risk → defaults to no limits). `createOrder` picks the right one server-side; `CheckoutClient` mirrors it for the cash option's show/disable. When touching cash limits, change the gate only — do **not** introduce a `pay_at_store` payment method.

**Subscriptions are reminder-only** — `createOrder` inserts a `subscriptions` row (`next_reminder_date = delivery_date + interval`) for subscription-flagged items, **only for logged-in users**, and stores no payment instrument. Guests are nudged to log in; the order still proceeds without the subscription. Never add auto-charge.

**Slot capacity** is a count of non-cancelled orders for a `(date, slot)` pair (`getSlotAvailability` for display, re-checked in `createOrder`). A small race window is accepted at this scale.

## Customer Account (Phase 4)

The logged-in account lives under `app/(storefront)/account/` with a server-guarded `layout.tsx` + sticky `AccountNav`. A single `account/loading.tsx` and `account/error.tsx` act as the Suspense/error boundary for every sub-page.

**Account reads use the service-role admin client filtered by `user_id`** (`lib/account/data.ts`), the same pattern as order writes. This is deliberate: RLS-bound joins would drop rows whose referenced product has since been unpublished (e.g. a subscription or wishlist item for a now-hidden product), and the account needs to surface those as "no longer available". Authorization is the `.eq("user_id", userId)` filter. Read models live in `types/account.ts`.

**Loyalty earn/reverse logic is in `lib/loyalty/engine.ts` — a plain server module, NOT a `"use server"` file**, so it is never exposed as a client-callable action. `earnLoyaltyForOrder` is idempotent (guarded by an existing `earn` transaction) and fires from `updateOrderStatus` (`lib/admin/orders.ts`) when an admin sets an order to `delivered`. `reverseLoyaltyForOrder` refunds redeemed points and claws back earned points, and is called from both the customer cancel flow and the admin cancel/refund flows. Earn rate, redemption rate, and expiry all come from the `loyalty` setting (editable in `/admin/loyalty`).

**Cancelling an order** (`cancelOrder` in `lib/account/actions.ts`) is only allowed while `status = 'pending_confirmation'` (`isCancellable` in `lib/orders/status.ts`) and reverses everything the order touched: restores tracked stock, deletes `coupon_usage`, calls `reverseLoyaltyForOrder`, cancels subscriptions created from the order, and writes status history. Only a `paid` order's `payment_status` flips to `refunded` — unpaid orders keep theirs.

**Wishlist is DB-backed but the Zustand store stays the source of truth for the live header count.** `stores/wishlistStore.ts` persists the guest id list to `localStorage` (`uggalla-wishlist`) and carries a transient `authed` flag. `components/storefront/WishlistProvider.tsx` (mounted in the storefront layout) calls `syncWishlist(localIds)` once on mount: for signed-in users it merges the guest list into the DB and replaces the store with the authoritative list; guests keep their local list. `WishlistButton` mutates optimistically and persists via `toggleWishlistDb` when `authed` (reverting on failure). All wishlist server actions are in `lib/wishlist/actions.ts`.

**Order presentation is centralized in `lib/orders/status.ts`** — status/payment labels, badge tones (`orderStatusVariant`), and the timeline step order (`timelineSteps`, `statusStepIndex`). Reuse these everywhere an order status is rendered rather than re-declaring label maps.

**Invoices are print-to-PDF, not a PDF library.** `/account/orders/[orderNumber]/invoice` renders an `#invoice-print-area` and a client `window.print()` button, with print-isolation CSS that hides all other page chrome. There is intentionally no `@react-pdf/renderer` dependency.

## Admin Panel (Phase 5)

The entire admin experience lives under `app/admin/` and is a separate world from the storefront — neutral/utilitarian, data-dense. It follows a strict file-layout convention; match it when adding admin features.

**Layout & guard.** `app/admin/layout.tsx` calls `requireAdmin()` (`lib/admin/guard.ts`) and renders `<AdminShell>` (`components/admin/`), which holds the sidebar, top bar, and ⌘K global search (`AdminSearch` → `adminGlobalSearch` in `lib/admin/search.ts`). Middleware already blocks non-admins; `requireAdmin()` (and `getAdminUser()`) is defense-in-depth **and** the source of the acting admin's id for activity logging. Sidebar attention badges come from `getBadgeCounts()` (`lib/admin/badges.ts`).

**File-layout convention for each admin domain:**
- **Actions** → `lib/admin/<domain>.ts`, a `"use server"` file exporting only async server actions. Every action starts with `const admin = await requireAdmin();`, performs the write via `createAdminClient()` (service-role; **all admin writes bypass RLS and authorize in app code**), calls `logActivity(admin.id, { action, targetTable, targetId, metadata })`, then `revalidatePath(...)`. Actions return the shared `ActionResult<T>` type (`types/admin.ts`): `{ ok: true; data? }` | `{ ok: false; error; fieldErrors? }`.
- **Reads** → `lib/admin/<domain>-data.ts`, a plain (non-`"use server"`) server module. Keep reads out of the actions file — a `"use server"` module may only export async actions, so mixing a data fetcher in breaks the build.
- **Pages** → `app/admin/<domain>/page.tsx`, thin server components that parse `searchParams`, call the `-data` reader, and render a client component.
- **UI** → `components/admin/<domain>/`, the interactive client components.

**Validation.** All admin form schemas are centralized in `lib/admin/schemas.ts` (one file, not co-located per-form like the storefront convention below). Client forms and server actions both import from it.

**Activity logging is mandatory** on every write — `logActivity` (`lib/admin/activity.ts`) is fire-and-forget (never throws). The `/admin/logs` viewer reads these rows.

**Shared admin building blocks (reuse, don't reinvent):**
- `components/admin/primitives.tsx` — `AdminPageHeader`, `AdminEmpty`, `Panel`, `Field`, `ConfirmDialog`.
- `components/admin/SortableList.tsx` — generic drag-to-reorder via **native HTML5 DnD** (no `dnd-kit` dependency). Used for brands, categories, banners, and product images.
- `components/admin/ImageUpload.tsx` (single) + `ProductImagesManager` (multi) — uploads run **browser-side** through `lib/admin/upload.ts` (`uploadPublicImage(bucket, file)`) using the *browser* Supabase client; storage RLS grants the authenticated admin write access, so no upload route is needed. Buckets: `product-images`, `brand-images`, `category-images`, `banner-images`, `site-assets`.
- `components/ui/` gained `tabs`, `switch` (dependency-free toggle), `dropdown-menu`, and `table` for the admin.

**Order/bulk specifics.** `updateOrderStatus`, `cancelOrderAdmin`, bank approve/reject, CSV export, etc. live in `lib/admin/orders.ts`; order detail reads in `lib/admin/orders-data.ts`. Print pages (`/admin/orders/[orderNumber]/print/{invoice,packing-slip}`) reuse the same print-isolation CSS pattern as the account invoice. Converting a bulk request to an order (`convertBulkToOrder` in `lib/admin/bulk-requests.ts`) **mirrors a normal checkout order** so it flows through the shared payment/status/notification logic: it creates a single custom bulk line item with `source = 'bulk_conversion'`, starts at `pending_confirmation`, sends the inline `order_placed` email, and the admin picks the offline payment method (`cod` → "Cash on Delivery"/"Pay at Store" by fulfillment, or `bank_transfer`). The request becomes `accepted` on convert and auto-flips to `completed` when the linked order is marked `delivered` (hook in `updateOrderStatus`). Re-quoting (`sendQuote`) is allowed until conversion, then blocked. The customer note → order `notes`; the latest quote message + the request's internal notes are snapshotted into the order's `internal_notes` (authored "Bulk request", rendered as a distinct "From the bulk request" group by `OrderInternalNotes`), and the order links back via a reverse lookup. The admin order page surfaces `order.notes` as a "Customer note" block.

**Rich text is a plain `Textarea`** (product description) — there is intentionally no TipTap/editor dependency.

**Storage cleanup is two-layered.** Per-action cleanup (`lib/admin/storage.ts` — `deletePublicImage`/`deleteReplacedImage`) removes a file the moment its row is deleted/replaced. The catch-all for "upload-then-cancel / replace-before-save" orphans is the **sweep** (`lib/admin/storage-sweep.ts`): it rebuilds a keep-list fresh from the DB on every run and deletes a file **only if BOTH** it is referenced by no live row **and** it is older than a safety buffer. It sweeps **only the 6 public buckets** (`product-images`, `brand-images`, `category-images`, `banner-images`, `review-images`, `site-assets`) — the private `payment-receipts` / `bulk-attachments` buckets are never listed. Note the reference columns differ: `product_images.url` and `review_images.url`, but `brands`/`categories`/`banners` use `image_url`, and `site-assets` is keyed off `settings.shop_info.logo_url` + `seo.og_image_url`. Two entry points share the logic: the admin **Settings → Storage** tab (24h buffer; scan opens a thumbnail gallery — `components/admin/settings/OrphanCleanup.tsx` — with per-image View/Delete + Delete-all, every delete confirmed; the single-delete action **re-verifies** the file is still an orphan before removing), and a weekly cron (7d buffer, below). Both delete paths re-scan before deleting. The sweep never throws — it returns an `error` string. `parseStorageUrl` is exported from `lib/admin/storage.ts` for reuse.

**Settings tab caveat:** PayHere keys stay env-managed (the Payment tab shows status only, never stores keys), consistent with the `lib/integrations.ts` flag contract. The Notifications tab and Maintenance toggle are saved but only take effect in Phase 6.

## Notifications & Crons (Phase 6)

Customer-facing order notifications are **debounced and dispatched by a cron**, never sent inline from a status write. The flow is: status changes **enqueue** a buffered row → a secured cron route **drains** due rows and decides what to send → `notify()` fans out to channels. Four moving parts, all under `lib/notifications/` + `app/api/cron/`:

- **Enqueue** (`lib/notifications/pending.ts`). Every order status-write site calls `enqueueOrderNotification(orderId, status)` instead of notifying directly; bank-receipt decisions call `enqueueReceiptNotification(orderId, outcome, receiptId)`. Each is an UPSERT of **one row per order** (`onConflict: "order_id"`) into its own buffer table (`pending_order_notifications` / `pending_receipt_notifications`), setting `dispatch_after = now() + COOL_OFF_MS` (3 min). A rapid second change overwrites the row and pushes `dispatch_after` out again — **that overwrite *is* the debounce.** Writes use the service-role client (the buffer tables have no public RLS), and the helpers are fire-and-forget — they never throw into the caller's transaction.
- **Dispatch** (`app/api/cron/dispatch-notifications/route.ts`). A `POST` route guarded by `Authorization: Bearer ${CRON_SECRET}`. Drains due rows (`dispatch_after <= now()`, `attempts < MAX_ATTEMPTS`, batch of 50) and applies the send rules below. The **scheduler is deferred to post-deploy** — Supabase `pg_cron`/`pg_net` can't reach localhost — so locally you drive the whole thing by hand with `curl` (see `docs/POST_DEPLOY_STEPS.md`, which also has the production scheduling SQL and a manual test matrix).
- **Send rules (this is the heart of it):**
  - *Order ladder* — forward-only. `order_notification_ledger` is the permanent source of truth for "already notified about this status on this channel". A progression status sends **only if strictly forward** of every logged progression status (rank via `statusStepIndex`); terminal statuses (`cancelled`/`refunded`) send **once**. Backward moves / re-entries are silent. This protection is permanent, not just within the cool-off.
  - *Receipt track* — separate, two-way, on its own buffer + `order_receipt_notice` memory. A `reverted` (admin undo) within the window silently cancels the pending email. An apology-prefixed **correction** fires only on a genuine outcome flip **anchored to the same `receipt_id`** the customer was last told about (a decision on a re-uploaded receipt is a clean email; null ids never trigger a false apology). An approval also writes `confirmed` into the order ledger so the ladder never re-sends a separate confirmation.
  - *Retry* — if every channel genuinely **failed** (not `skipped`), increment `attempts` + record `last_error` and leave the row for the next tick; at `MAX_ATTEMPTS` (5) it's parked. A `skipped` channel (integration disabled / no contact on file) is **not** a failure and never retries. Rows are removed with a **conditional delete** keyed on the captured `dispatch_after`, so a re-enqueue mid-flight is never clobbered.
- **Channels** (`notify()` in `lib/notifications/index.ts`). Fans out to email + WhatsApp via `Promise.allSettled`, returns a per-channel `sent | failed | skipped`, and best-effort logs every attempt to `notification_logs` (audit only — the ledger is the real dedupe). Email uses the branded React Email template `emails/OrderStatusEmail.tsx` through `lib/notifications/email.ts` (Resend, gated by `isResendEnabled`). WhatsApp (`lib/notifications/whatsapp.ts`) is a **real WhatsApp Cloud API sender** (approved-template messages via `sendWhatsAppTemplate`; order-status events map to their templates in `index.ts`'s `whatsAppForEvent`, transactional events in `transactional.ts`), **gated by `isWhatsAppEnabled`** — with no keys set every send returns `skipped` (logged `whatsapp skipped: not configured`), same "build fully, gate the entry point" pattern as PayHere. Template names + variables live in `WHATSAPP_TEMPLATES`; the full setup walkthrough is `docs/WHATSAPP_SETUP.md`. Every template variable is guaranteed non-empty + single-line (WhatsApp rejects empty/multiline params).

The **immediate "order placed" confirmation is the exception** — it is sent inline from `createOrder` (not debounced), because `pending_confirmation` is deliberately excluded from the dispatcher (`eventForStatus` returns `null` for it). Tables for this system come from migrations **009–011** (run them in Supabase before testing notifications).

**Everything else is transactional** (sent directly, not debounced): `lib/notifications/transactional.ts` handles `welcome` (signup), `bulk_request_received` (+ admin alert), `bulk_quote_sent`, `subscription_reminder`, and `review_request`, each via the generic branded template `emails/NotificationEmail.tsx` + a WhatsApp template, honouring the per-channel/per-event toggles in the `notifications` setting (catalog in `lib/notifications/catalog.ts`, surfaced in Admin → Settings → Notifications, default ON). `payment_received` is intentionally NOT a separate email — PayHere-paid maps to the `confirmed` ladder step and bank approval to `bank_receipt_approved`, so the customer is never double-notified. Shared audit logger: `lib/notifications/log.ts`.

**Two daily crons** (`CRON_SECRET`-guarded, accept GET+POST, scheduled in `vercel.json`): `app/api/cron/subscription-reminders` (fires due reminders, advances `next_reminder_date`, never charges) feeding the one-tap `/reorder?sub=<id>` page (`reorderSubscription` in `lib/account/reorder.ts` → `components/storefront/ReorderClient.tsx`), and `app/api/cron/review-requests` (orders delivered exactly 2 days ago, deduped via `notification_logs`). A third **weekly** Vercel cron, `app/api/cron/cleanup-storage` (Sunday), runs the orphan-image sweep with the 7-day buffer but **no-ops unless the `storage_cleanup` setting is enabled** (default OFF) — see "Storage cleanup" under Admin Panel. Only these use Vercel Cron; the minute-level dispatcher stays on pg_cron (post-deploy). The newsletter + contact forms post to `lib/marketing/actions.ts`. There's a dev helper `npm run test-welcome you@email.com "Name"` to preview the welcome email (uses `scripts/tsconfig.email.json` so React-Email JSX renders correctly under tsx).

## Build Phases

Phases 1–6 are built; **only deployment remains** (PayHere/WhatsApp keys, the pg_cron dispatcher schedule, and the Vercel deploy — see `docs/POST_DEPLOY_STEPS.md`). Each phase has a spec in `docs/PHASE_N.md` and the full spec is in `MASTER_SPEC.md`.

| Phase | Scope |
|---|---|
| 1 ✅ | Foundation, auth, DB schema, brand system, homepage |
| 2 ✅ | Products, catalog, search, PDP, wishlist, bulk request form |
| 3 ✅ | Cart, checkout, PayHere + bank transfer + COD, orders, subscriptions |
| 4 ✅ | Customer account, order history, loyalty points, reviews, subscription & bulk-request management |
| 5 ✅ | Full admin panel — dashboard, all CRUD, orders, bulk quotes, customers, settings, activity logs |
| 6 ✅ | Email + WhatsApp notifications (debounced order/receipt dispatcher + transactional events), subscription-reminder & review crons, public `/quote/[token]` pay-online page, maintenance-mode enforcement, SEO (`app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `components/shared/JsonLd.tsx` → Organization/WebSite/Product/BreadcrumbList), `global-error.tsx`, cookie consent, wired newsletter/contact. **Deployment not yet done.** |

**Still gated until keys / deploy** (build it fully, gate the entry point): **PayHere** (online checkout + the `/quote/[token]` pay link) until `PAYHERE_*` keys are set; **WhatsApp** (all sends `skipped`) until `WHATSAPP_*` keys + Meta-approved templates — see `docs/WHATSAPP_SETUP.md`; the **pg_cron dispatcher schedule** and the **Vercel deploy** are post-deploy steps in `docs/POST_DEPLOY_STEPS.md`. Storefront `maintenance` enforcement lives in `components/storefront/MaintenanceGate.tsx` (admins bypass).

## Key Conventions

- Server Components by default; add `"use client"` only when needed (interactivity, hooks, browser APIs).
- Mutations use Server Actions, not API routes, unless it's a webhook.
- `components/ui/` — base primitives (Button, Input, Card, etc.)
- `components/shared/` — layout helpers used across both storefront and admin (BrandLogo, Container, FadeIn, DropletSVG)
- `components/storefront/` — storefront-specific (Header, Footer, WhatsAppButton); `components/account/` — account-area UI (nav, order/subscription/review/address/wishlist managers, shared `primitives.tsx`); `components/admin/` — admin UI, grouped per domain (see "Admin Panel" above)
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

For any non-trivial **storefront** form, co-locate a `schema.ts` next to the form and server action files. Export a Zod schema and the inferred type from it; import both in the client form (for live "reward early, punish late" validation) and the server action (as the final authority before touching the DB). See `app/(storefront)/bulk-request/schema.ts` as the reference implementation. (The admin panel deviates from co-location: all admin schemas live in the single `lib/admin/schemas.ts` — see "Admin Panel" above.)

The client form should be fully controlled (`useState` per field), track a `touched: Set<string>` for blurred fields and a `submitted: boolean` flag, and derive errors live via `useMemo(() => Schema.safeParse(...))`. Error visibility rule: `(touched.has(field) || submitted) ? errors[field]?.[0] : undefined`.
