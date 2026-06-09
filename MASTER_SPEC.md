# 🥥 Uggalla Oil Mills — Master Project Specification

> **This is the source of truth for the entire project.** Every phase prompt references this document. Keep this file in your repository root. When Claude Code needs to verify a requirement, design decision, or scope boundary, it reads from here.

---

## 1. Project Overview

A **full-featured, professional e-commerce platform** for **Uggalla Oil Mills**, a single coconut-oil business based in Padukka, Sri Lanka. The platform consists of two completely separate experiences:

- **Customer storefront** — for browsing, buying, and subscribing to coconut oil products
- **Admin dashboard** — for full operational control over brands, products, orders, customers, bulk quote requests, subscriptions, and marketing

The application must feel **pure, natural, and premium** — like a trusted artisan coconut-oil producer with deep Sri Lankan roots, not a generic e-commerce template. Every detail (typography, spacing, animations, micro-interactions) should reinforce a clean, wholesome, trustworthy brand built around the company's green-and-gold identity.

### Business Context

- **Company:** Uggalla Oil Mills
- **Product brand:** **Royal Coco** (a brand owned by Uggalla Oil Mills). The system supports multiple brands, but Royal Coco is the only one at launch.
- **What they sell:** Coconut oil only — in **bottles**, **packets**, and **bulk (loose)** quantities.
- **Market:** Sri Lanka (head office and mill in Padukka; sells island-wide)
- **Currency:** LKR (Sri Lankan Rupee), formatted as `Rs. 4,500.00`
- **Timezone:** **Asia/Colombo** — all dates, delivery/pickup dates, time slots, and timestamps are displayed and computed in Sri Lanka time
- **Language:** English only
- **Single shop / single mill**, no multi-branch support
- **Admin-only** staff role (no separate baker/driver/operator accounts)
- **Logo:** Provided (green wordmark "UGGALLA OIL MILLS" with a green coconut-oil-droplet "U" mark on a golden-yellow field). The brand name, tagline, contact details, colors, and fonts must be easy to replace from a single config file.

### Two ways a customer buys

1. **Retail products (Bottles & Packets)** — normal e-commerce: pick a product → choose size + quantity + optional note → add to cart → checkout → pay. May optionally be **subscribed to** (reorder reminders).
2. **Bulk (loose) oil** — a **quote request flow**: the customer sees the product and its indicative price, enters the quantity they need plus their details, and submits a request. This lands in the admin panel. The admin reviews it, sets a price/discount, and sends a quote back to the customer (email + WhatsApp). When sending the quote, the admin chooses how it gets paid: **(a) Offline (default)** — payment and delivery arranged by the shop directly (phone / bank transfer / cash); or **(b) Pay online (optional)** — the quote includes a secure link to a quote-acceptance page where the customer can pay via PayHere, which then creates a real tracked order. The pay-online option only appears when PayHere is configured; otherwise every bulk quote is offline.

---

## 2. Tech Stack (Non-Negotiable)

| Layer | Technology |
|---|---|
| Framework | **Next.js 15 (App Router)** with TypeScript (strict mode) |
| Database | **Supabase PostgreSQL** with Row Level Security (RLS) |
| Auth | **Supabase Auth** — Email/Password + Google OAuth |
| File Storage | **Supabase Storage** (product images, brand/category images, payment receipts, bulk-request attachments) |
| Styling | **Tailwind CSS** + **shadcn/ui** components |
| Animations | **Framer Motion** |
| Forms | **React Hook Form** + **Zod** schema validation |
| Client State | **Zustand** (cart, wishlist) |
| Server State | **TanStack Query** (React Query v5) |
| Charts | **Recharts** (admin dashboard) |
| Payments | **PayHere** (Sri Lankan gateway) + Bank Transfer + Cash on Delivery |
| Email | **Resend** for transactional emails |
| WhatsApp | **WhatsApp Cloud API** (Meta) for order + quote notifications |
| Scheduled jobs | **Vercel Cron** (subscription reminders, review requests) |
| Deployment | **Vercel** |
| Image Handling | `next/image` with Supabase Storage as source |
| Icons | **Lucide React** |
| Date/Time | **date-fns** + **date-fns-tz** + **react-day-picker**; all dates/times handled in **Asia/Colombo** |

### Required Code Quality
- TypeScript strict mode, no `any` types
- ESLint + Prettier configured
- Component-driven architecture (small, focused components)
- Server Components by default, Client Components only when needed
- Server Actions for mutations where appropriate
- Proper loading states, error boundaries, and empty states everywhere
- Accessibility: semantic HTML, ARIA labels, keyboard navigation, focus rings
- Responsive: mobile-first; tested at 375px, 768px, 1024px, 1440px

---

## 3. Design Direction — Pure, Natural & Premium

The visual identity is the single most important differentiator. The site should feel **fresh, wholesome, and trustworthy** — a premium natural-foods brand with clear Sri Lankan coconut heritage. Clean and bright, but warm and grounded.

### Aesthetic Pillars
- **Logo-driven palette** — built around the brand's **deep forest green** and **golden yellow**, balanced with a **warm cream** background and soft neutral tones so the site is eye-catching but never harsh. (Full palette below.)
- **Typography pairing** — one warm, characterful display typeface for headings (e.g., **Fraunces**, or **Libre Caslon Text**) and one clean, friendly sans-serif for body (e.g., **Inter** or **DM Sans**). The logo's bold geometric lettering can be echoed in eyebrow labels and buttons. Pick from Google Fonts.
- **Generous whitespace** — let the design breathe; treat key pages like a clean editorial layout.
- **Photography-first layouts** — large hero images of coconut groves, golden oil pouring, bottles in natural light, the mill, and Sri Lankan estate scenes. Build layouts that look great even before real photos exist (use elegant placeholders).
- **Subtle animations** — Framer Motion for gentle fade-ins on scroll, soft hover transitions, smooth page transitions, light parallax. Nothing flashy.
- **Tasteful ornamentation** — thin gold hairlines, a small leaf/droplet flourish derived from the logo mark, soft natural shadows. Use sparingly.
- **Micro-interactions** — buttons with warm hover states, smooth cart drawer slide-in, refined toast notifications, skeleton loaders matching the brand tone.
- **Trust signals** — "100% pure," "naturally pressed," origin/heritage notes, certifications, freshness — woven in tastefully, never gimmicky.

### Color Palette (starting point — define in `globals.css` and `tailwind.config.ts`)

| Token | Suggested hex | Use |
|---|---|---|
| `--color-green` (primary) | `#1B6B3A` | Primary brand color: headings accents, primary buttons, logo mark |
| `--color-green-deep` (ink) | `#123524` | Body text, dark surfaces, footer |
| `--color-gold` (accent) | `#F6C026` | Accent: highlights, badges, CTAs, the logo's yellow |
| `--color-gold-warm` | `#E0A92E` | Hairlines, secondary accent, hover states |
| `--color-cream` (background) | `#FBF7EE` | Page background (never pure white) |
| `--color-sand` | `#F1E9D6` | Muted surfaces, cards, section bands |
| `--color-sage` | `#CFE0CF` | Soft neutral, tags, subtle dividers |

The site may use **green as the dominant brand color with gold as the accent**, on a cream canvas — this keeps the logo's energy while staying easy on the eyes. Claude Code may refine these values for contrast/accessibility as long as they stay faithful to the logo.

### What to Avoid
- Generic Bootstrap/Tailwind UI looks
- An overwhelming all-yellow page (use yellow as an accent, not the whole background)
- Loud gradients, neon colors, harsh borders
- Stock e-commerce layouts (Shopify default vibes)
- Sans-serif-only typography with no warmth
- Childish or cartoonish elements (we are premium-natural, not novelty)

### Brand Configuration File
Create a single source of truth (`lib/brand.ts` + `app/globals.css` CSS variables) so the brand name, tagline, contact details, colors, and fonts can be changed in one place.

```ts
// lib/brand.ts (shape — fill real values)
export const brand = {
  name: "Uggalla Oil Mills",
  shortName: "Uggalla",
  tagline: "Pure Coconut Oil, Naturally Pressed in Padukka", // PLACEHOLDER — editable
  phone: "+94 7X XXX XXXX",        // TODO: real number
  whatsapp: "+94 7X XXX XXXX",     // TODO: real number (E.164)
  email: "hello@uggallaoilmills.lk", // TODO: real email
  address: "Padukka, Sri Lanka",     // TODO: full address
  socials: { facebook: "", instagram: "", tiktok: "" },
};
```

---

## 4. Feature Inventory

### 4.1 Customer-Facing Features

#### Homepage
- Cinematic hero section (full-width image of coconut grove / golden oil + headline + CTA, subtle parallax)
- Featured products carousel (manually curated by admin)
- Category showcase (Bottles / Packets / Bulk)
- Brand story strip ("From the Uggalla mill in Padukka…")
- Bestsellers grid
- "Why our oil" section (purity / natural pressing / local sourcing — 3–4 trust points)
- "How it works" section (Choose → Order → Delivered)
- Subscription teaser ("Never run out — set a reorder reminder")
- Customer testimonials/reviews highlights
- Newsletter signup
- Instagram-style gallery section (optional, CMS-driven row)

#### Product Catalog (`/shop`)
- Filter sidebar: category (Bottles / Packets / Bulk), brand, size, price range
- Sort: newest, price ↑/↓, popularity, rating
- Pagination or infinite scroll
- Quick view modal on cards
- Wishlist heart icon on each card
- Responsive grid (1 col mobile, 2 tablet, 3-4 desktop)
- **Retail products** show "Add to Cart"; **bulk products** show "Request a Quote"

#### Search
- Sticky search bar with autocomplete suggestions
- Results page with same filtering as catalog

#### Product Detail Page (`/shop/[slug]`)
- Image gallery with zoom + thumbnail navigation
- Product info: name, brand, price (updates with size selection), description, key facts (e.g., extraction method, shelf life), usage notes
- **Product options** (see §5 below): size, quantity, optional note
- **Subscription option** (only if enabled on the product): "Remind me to reorder" + frequency picker
- "Add to Cart" + "Buy Now" CTAs (retail) **or** "Request a Quote" CTA (bulk)
- Wishlist toggle
- Reviews section with star breakdown + filter
- "You may also like" section
- Estimated delivery info widget

#### Bulk / Loose Oil Quote Request (`/bulk-request`, also reachable from any bulk product)
- Form for requesting a quote on loose/bulk coconut oil:
  - Name, phone, email
  - Product of interest (pre-filled if coming from a bulk product page)
  - Quantity needed (e.g., litres) + unit
  - Delivery or pickup, address (if delivery), preferred date
  - Notes / special requirements
- Submission creates a **bulk request** entry in the admin panel
- Customer receives confirmation email + WhatsApp (auto-acknowledgement)
- Admin reviews → sets price/discount → sends quote (email + WhatsApp). The admin picks the payment method on the quote: **offline by default** (shop arranges payment & delivery), or an **optional pay-online link** (when PayHere is configured) that takes the customer to a secure quote-acceptance page to pay and create a tracked order. Admin may also convert an accepted request into a tracked order manually.

#### Cart (`/cart`) — retail only
- Cart drawer (slide-in from right) accessible from any page
- Full cart page with editable items
- Shows size, quantity, note, and subscription flag per item
- Quantity adjust, remove item
- Apply coupon code
- Show subtotal, delivery fee placeholder, total
- "Continue Shopping" + "Proceed to Checkout"

#### Checkout (`/checkout`) — retail only
- Single-page layout with collapsible sections (cleaner than multi-step)
- **Step 1: Contact** — guest (email + phone) or login
- **Step 2: Delivery or Pickup**
  - Toggle between Delivery / Pickup
  - **Delivery:** address fields + zone selector (dropdown of admin-configured zones) → auto-calculates delivery fee
  - **Pickup:** show mill address + map
  - Delivery/pickup date picker (calendar, blocks out closed days + enforces min lead time)
  - Time slot picker (admin-configured slots)
- **Step 3: Payment**
  - PayHere (cards, eZ Cash, mCash, etc.)
  - Bank Transfer (show bank details + receipt upload after order is placed)
  - Cash on Delivery (with minimum/maximum amount checks if configured)
- **Step 4: Review** — final order summary + place order button
- Confirms any subscription opt-ins on the order
- Order confirmation page with order number + status
- Send confirmation email + WhatsApp message (Phase 6)

#### Customer Account (`/account`)
- Dashboard overview: recent order, loyalty points balance, active subscriptions, wishlist count
- **Order history** — list with filter by status, search by order number, click to detail
- **Order detail** — full breakdown, status timeline, upload bank receipt if pending, reorder button, contact support
- **Subscriptions** — list of active reorder reminders; pause / resume / change frequency / cancel / "reorder now"
- **Bulk requests** — list of the customer's bulk quote requests with status and the quote they received (read-only)
- **Saved addresses** — CRUD
- **Wishlist** — list view with "Add to cart" / "Remove"
- **Loyalty points** — balance, earning history, redeem at checkout
- **Reviews** — list of reviews submitted, edit/delete
- **Profile** — name, phone, email, password change
- **Logout**

#### Subscription System (Simple Reorder Reminders — NO auto-charge)
- A product may be marked **subscription-enabled** in admin.
- On a retail product page, the customer can opt in to "Remind me to reorder" and choose a frequency: **Weekly / Every 2 weeks / Monthly** (frequencies configurable in settings).
- A subscription is created **when the customer completes an order** with the opt-in (so subscriptions always map to a real first purchase). `next_reminder_date = delivery_date + interval`.
- A daily **Vercel Cron** finds due subscriptions and sends a **reminder** (email + WhatsApp) containing a **one-tap reorder link** that pre-fills the cart with the same product/size/quantity. It then advances `next_reminder_date` by the interval.
- **No automatic payment is ever taken.** The customer always checks out manually.
- Customers manage subscriptions in their account (pause, resume, change frequency, cancel, reorder now).
- Optional, off by default: a small loyalty bonus for keeping an active subscription (configurable).

#### Loyalty Points System
- Earn X points per Rs. spent (configurable; default 1 point per Rs. 100)
- Points credited only after an order is **delivered** (not on placement)
- Redeem at checkout: X points = Rs. Y discount (configurable rate)
- Maximum redemption per order (configurable, e.g., up to 20% of order value)
- Bonus points for first order, birthday month, reviews submitted (configurable)
- Points expire after 12 months (configurable)
- Visible in account dashboard

#### Static Pages
- About Us (the mill, the people, the process)
- Contact (form + map embed + WhatsApp click-to-chat)
- FAQ (accordion-style)
- Terms & Conditions
- Privacy Policy
- Delivery Information

#### Other
- Newsletter signup (footer + popup with delay)
- Cookie consent banner
- WhatsApp floating button (click to open WhatsApp chat with shop)
- 404 and error pages branded

---

### 4.2 Admin Features

All admin routes live under `/admin` and require an authenticated user with `role = 'admin'` (enforced via RLS + middleware).

#### Admin Dashboard (`/admin`)
- KPI cards: today's revenue, today's orders, pending orders, low stock count
- Revenue chart (last 30 days, switchable to 7d / 90d / 12 months)
- Top-selling products (last 30 days)
- Recent orders list (last 10) with quick status update
- Pending bulk requests count
- Pending bank transfer approvals count
- Active subscriptions count

#### Brand Management (`/admin/brands`)
- CRUD for brands (e.g., Royal Coco)
- Each: name, slug, logo/image, description, display order, is_active
- A product is optionally assigned to one brand

#### Category Management (`/admin/categories`)
- CRUD with hero image, description, slug, display order, is_active
- Launch categories: **Bottles, Packets, Bulk**
- A category may be flagged `is_bulk` to indicate its products default to the quote flow (admin can still override per product)

#### Product Management (`/admin/products`)
- Table view: thumbnail, name, brand, category, base price, purchase type (Retail / Bulk Quote), stock status, featured toggle, actions
- Filter by brand, category, purchase type, search, sort
- **Add/Edit product page** with sections:
  - Basic info: name, slug (auto-generated, editable), **brand** (dropdown), **category** (dropdown), short description, description (rich text)
  - Key facts (optional label/value pairs, e.g., "Extraction: Cold-pressed", "Shelf life: 12 months", "Origin: Padukka")
  - **Images** (multi-upload, drag-to-reorder, set primary)
  - **Sizes** — variable table of volume + price (e.g., 200ml → Rs.450, 500ml → Rs.950, 1L → Rs.1,750). For bulk products, sizes are optional; a base per-unit price (e.g., per litre) can be used instead.
  - **Purchase type** — Retail (cart + checkout) or **Bulk Quote** (request a quote — no cart; payment follows the quote the admin sends: offline by default, or optional pay-online)
  - **Subscription** — allow subscription toggle (retail only)
  - **Note field** — allow customer note toggle + max chars
  - Stock: track stock or not, current stock, low stock threshold
  - SEO: meta title, meta description
  - Status: published / draft, featured, bestseller
- Delete with confirmation (soft delete if order references exist)

#### Order Management (`/admin/orders`) — retail orders
- Table with filters: status, date range, payment method, customer
- Search by order number, customer name/phone
- Status badge with color coding
- Order detail page:
  - Customer info, contact buttons (call, WhatsApp, email)
  - Delivery/pickup details with map link
  - Itemized order with size, quantity, note expanded; subscription flag shown
  - Payment info, receipt image if bank transfer
  - Status timeline with manual update controls
  - Internal notes (admin-only)
  - **Print invoice** button (clean printable layout)
  - **Print packing slip** button (simplified fulfilment sheet: products, sizes, quantities, delivery info, notes highlighted)
  - Refund / cancel actions with reason
- Bulk status update from list view

#### Bulk Request Management (`/admin/bulk-requests`)
- List of all bulk/loose oil quote requests with status (new / in-progress / quoted / accepted / rejected / completed)
- Detail view: customer info, product of interest, requested quantity, delivery/pickup, notes
- **Quote section**: set unit price / total / discount + a customer-facing message, then choose a **payment mode**:
  - **Offline (default):** the message states the shop will arrange payment & delivery directly (phone / bank / cash). No online payment.
  - **Pay online (optional, only shown when PayHere is configured):** generates a secure quote link (`/quote/[token]`) where the customer reviews the quote and pays via PayHere; a successful payment creates a real tracked order linked to this request.
  - "Send Quote" triggers email + WhatsApp (Phase 6), including the pay-online link only when that mode was chosen.
- Internal notes
- **Convert to Order** (after acceptance): creates a tracked order with a custom line item; payment recorded manually by admin
- Status update controls

#### Customer Management (`/admin/customers`)
- Table with search, filter by registration date, sort by total spent
- Customer detail page:
  - Profile info, phone, email, addresses
  - Lifetime value, total orders, average order value
  - Loyalty points balance, active subscriptions
  - Full order + bulk-request history
  - Manual notes
  - Block/unblock account
  - Manual customer creation (for walk-ins admin wants to track)
  - Edit/delete

#### Bank Transfer Approvals (`/admin/payments/pending`)
- List of orders awaiting bank transfer verification
- View uploaded receipt image
- Approve / reject with reason → triggers customer notification

#### Coupon Management (`/admin/coupons`)
- CRUD coupons
- Code, type (% off / flat off / free delivery), value, min order amount, max discount cap
- Usage limit (total + per customer)
- Valid from/until dates
- Active toggle
- Applicable to specific products/categories/brands or all
- Usage history

#### Banner / Slider Management (`/admin/banners`)
- CRUD for homepage hero slides and promo banners
- Image, headline, sub-headline, CTA text, CTA link, position, active dates

#### Delivery Zones (`/admin/delivery-zones`)
- CRUD zones with name, delivery fee, estimated delivery time, active toggle
- Set minimum order amount per zone (optional)
- Same-day delivery surcharge per zone (optional)

#### Time Slots & Calendar (`/admin/schedule`)
- Define daily delivery/pickup time slots
- Per-slot capacity limit (max orders per slot)
- Mark holidays / closed days
- Set minimum lead time globally (e.g., 24 hours), override per category if needed

#### Subscription Oversight (`/admin/subscriptions`)
- List of all subscriptions: customer, product, size, quantity, frequency, next reminder date, status
- Filter by status (active / paused / cancelled) and frequency
- View detail; admin can pause/cancel or trigger a reminder manually
- Stats: active subscriptions, reminders sent, reorders attributed

#### Review Moderation (`/admin/reviews`)
- List of all reviews, filter by approved/pending/hidden
- Approve, hide, delete
- Reply to reviews (publicly visible)

#### Loyalty Settings (`/admin/loyalty`)
- Configure earning rate, redemption rate, expiry, bonuses
- View loyalty stats (issued, redeemed, expired, outstanding)
- Manual adjustment tool

#### Settings (`/admin/settings`)
- Shop info: name, logo (upload), tagline, address, phone, email, WhatsApp number, social links, business hours
- Tax configuration (rate, inclusive/exclusive)
- Subscription frequencies (which intervals are offered)
- Payment keys: PayHere merchant ID + secret, bank account details, COD limits
- Notification settings: enable email, enable WhatsApp, customize templates
- SEO: site-wide meta tags, OG image
- Maintenance mode toggle

#### Activity Logs (`/admin/logs`)
- Audit trail: admin user, action, target, timestamp
- Filterable

---

## 5. Product Options — Detail

Coconut oil is a **simple product to buy** — there is no deep customization like a custom cake. The product detail page must stay clean and fast while still feeling premium.

### Customer-Selectable Options (per product)

1. **Size / Volume** — required. Radio cards from the product's size table (e.g., 200ml / 500ml / 1L), each showing volume + price. The displayed price updates live with the selection. For products with a single size, this can be implicit.
2. **Quantity** — number stepper (min 1, max configurable, default 10).
3. **Note** — optional short text (only if enabled on the product; max chars configurable, e.g., 200). Used for special instructions.

That's it for retail. Everything else (how to use, benefits, extraction method, shelf life, origin) lives in the **description** and **key facts** of the product, not as selectable options.

### Subscription (retail products only, if enabled)
- A "Remind me to reorder" option with a frequency picker (Weekly / Every 2 weeks / Monthly).
- Choosing it tags the cart item as a subscription opt-in; the subscription is created when the order completes (see §4.1 Subscription System). Requires the customer to be logged in (prompt login if guest).

### Bulk (Loose) Products — Quote Request, not Cart
- A product whose **purchase type = Bulk Quote** does **not** show "Add to Cart." Instead it shows the indicative price (e.g., per litre), a quantity input, an optional note, and a **"Request a Quote"** button.
- This opens / routes to the bulk request form (§4.1), creating a `bulk_requests` row. There is no cart for bulk. Payment is then handled per the quote the admin sends — offline by default, or online via a quote link (see §8).

### UX Requirements
- Size selection updates the displayed price **live** with a clear breakdown (size price × quantity = line total).
- Selections preserved across page refresh (local state until added to cart).
- Validation blocks "Add to Cart" until a size is chosen.
- Mobile: a sticky bottom bar shows current price + the primary action button.
- Visual feedback for every selection (radio cards with checkmarks, smooth transitions).

### Storage
When added to cart, the item stores a structured object: `{ product_id, brand, category, size: {label, volume_ml, price}, quantity, note, is_subscription, subscription_interval }`. When the order is placed this becomes the order line item — fully queryable in admin.

---

## 6. Database Schema Guidance

Claude Code should finalize the schema, but it must cover:

### Core Tables
- `users` (extends Supabase `auth.users`: name, phone, role, loyalty_points, created_at, blocked)
- `addresses` (user_id, label, recipient, phone, line1, line2, city, postal_code, is_default)
- `brands` (id, slug, name, description, image_url, display_order, is_active)
- `categories` (id, slug, name, description, image_url, display_order, is_active, is_bulk)
- `products` (id, slug, brand_id (nullable), category_id, name, short_description, description, key_facts (jsonb), base_price, purchase_type ['retail','bulk_quote'], allows_subscription, allows_note, note_max_chars, is_published, is_featured, is_bestseller, stock_tracked, stock_quantity, low_stock_threshold, meta_title, meta_description, deleted_at, created_at, updated_at)
- `product_images` (id, product_id, url, alt_text, display_order, is_primary)
- `product_sizes` (id, product_id, label, volume_ml, price, display_order)
- `coupons` (id, code, type, value, min_order_amount, max_discount, usage_limit_total, usage_limit_per_user, valid_from, valid_until, applies_to (jsonb: all / categories / brands / products), is_active)
- `coupon_usage` (coupon_id, order_id, user_id, used_at)
- `delivery_zones` (id, name, fee, estimated_time, min_order_amount, same_day_surcharge, is_active)
- `time_slots` (id, label, start_time, end_time, capacity, is_active)
- `holidays` (id, date, label)
- `orders` (id, order_number, user_id (nullable for guest), guest_email, guest_phone, status, fulfillment_type ['delivery','pickup'], delivery_zone_id, address_snapshot (jsonb), delivery_date, time_slot_id, payment_method, payment_status, subtotal, delivery_fee, discount_amount, tax_amount, loyalty_points_used, loyalty_discount, total, coupon_id, source ['storefront','bulk_conversion'], notes, internal_notes, created_at, updated_at)
- `order_items` (id, order_id, product_id, product_snapshot (jsonb), options (jsonb: size, quantity, note, subscription flag), quantity, unit_price, line_total)
- `order_status_history` (id, order_id, status, note, changed_by, changed_at)
- `bank_transfer_receipts` (id, order_id, image_url, uploaded_at, status, reviewed_by, reviewed_at, reject_reason)
- `payments` (id, order_id, gateway, gateway_transaction_id, amount, status, raw_response (jsonb), created_at)
- `bulk_requests` (id, product_id (nullable), user_id (nullable), name, email, phone, fulfillment_type, address_snapshot (jsonb), quantity, unit, preferred_date, notes, status ['new','in_progress','quoted','accepted','rejected','completed'], quoted_unit_price, quoted_total, quote_message, payment_mode ['offline','online'], quote_token (nullable, for the pay-online link), quote_expires_at (nullable), internal_notes, converted_order_id, created_at, updated_at)
- `bulk_request_attachments` (id, bulk_request_id, url) — optional reference files
- `subscriptions` (id, user_id, product_id, size_id, quantity, interval ['weekly','biweekly','monthly'], next_reminder_date, status ['active','paused','cancelled'], last_reminder_at, created_from_order_id, created_at, updated_at)
- `reviews` (id, product_id, user_id, order_item_id, rating, title, body, status ['pending','approved','hidden'], admin_reply, created_at)
- `review_images` (id, review_id, url)
- `wishlist` (user_id, product_id, added_at) — composite PK
- `loyalty_transactions` (id, user_id, order_id (nullable), type ['earn','redeem','bonus','expire','adjust'], points, balance_after, note, created_at, expires_at)
- `banners` (id, image_url, headline, subheadline, cta_text, cta_link, position, display_order, valid_from, valid_until, is_active)
- `newsletter_subscribers` (id, email, subscribed_at, is_active)
- `notification_logs` (id, event, channel, recipient, status, error, payload (jsonb), idempotency_key, sent_at)
- `activity_logs` (id, user_id, action, target_table, target_id, metadata (jsonb), created_at)
- `settings` (key, value (jsonb)) — single-row config style for shop info, tax, subscription intervals, etc.

### Key Requirements
- All money columns use `numeric(12,2)` — never floats
- `volume_ml` stored as integer (or numeric for fractional litres)
- All timestamps `timestamptz` with `default now()`
- UUID primary keys (`gen_random_uuid()`)
- Indexes on frequently queried columns (slug, status, user_id, order_number, brand_id, category_id, next_reminder_date)
- Foreign keys with appropriate `on delete` actions
- Snapshot pattern for orders: store product + address data as JSONB at order time

### Row Level Security (RLS)
- Customers can only read/write their own data (addresses, orders, wishlist, reviews, subscriptions, their own bulk requests)
- Public can read published products, brands, categories, banners, approved reviews
- Only admin role can write to product/brand/category/order/customer/coupon/bulk_request/etc. tables
- Guest checkout works (orders with `user_id IS NULL` accessible only via signed order token in URL)
- Guest bulk requests allowed (no login required to request a quote)

---

## 7. Authentication & Authorization

- **Supabase Auth** with Email/Password + Google OAuth
- **No phone OTP**
- Customer registration captures: name, email, phone, password
- Email verification before checkout (optional — soft-prompt if it adds friction)
- **Admin role assignment** — manual (seeded admin user). No public signup leads to admin role.
- Middleware (`middleware.ts`) protects `/admin/*` routes
- Auth state synced via Supabase SSR helpers (`@supabase/ssr`)
- Session cookies, secure, httpOnly
- Password reset flow via email

---

## 8. Payments — PayHere Integration (Retail only)

PayHere is Sri Lanka's leading payment gateway. Reference: https://www.payhere.lk/developers/

### Online Payment Flow
1. Customer selects "Pay Online" at checkout
2. Order created in DB with `payment_status = 'pending'`
3. Customer redirected to PayHere checkout with order metadata
4. On success/failure, PayHere POSTs to our webhook (`/api/payments/payhere/webhook`)
5. Webhook verifies signature using merchant secret, updates order's payment_status
6. Customer redirected back to `/order-success/[orderNumber]`

### Implementation Notes
- Use PayHere's "Checkout" API (hosted page)
- Verify webhook signature properly (MD5 hash of fields per PayHere docs)
- Handle PayHere statuses: 2 (success), 0 (pending), -1 (cancelled), -2 (failed), -3 (chargedback)
- Store full raw webhook payload in `payments.raw_response`
- Sandbox mode in development (env `PAYHERE_MODE=sandbox`)

### Bank Transfer Flow
1. Customer selects "Bank Transfer"
2. Order created with `payment_status = 'pending_transfer'`
3. Order success page shows bank details + upload form
4. Customer uploads receipt → Supabase Storage, row in `bank_transfer_receipts`
5. Admin reviews in `/admin/payments/pending`
6. Approve → `payment_status = 'paid'`, order advances + notifications fire
7. Reject → `payment_status = 'rejected'`, customer notified with reason, can re-upload

### COD Flow
1. Customer selects "Cash on Delivery"
2. Order created with `payment_status = 'cod'`, `order_status = 'pending_confirmation'`
3. Admin manually confirms
4. On confirmation → `order_status = 'confirmed'`; cash collected on delivery
5. Marked paid when admin marks order `delivered`

### Bulk Orders — Offline by Default, Optional Online Payment
Bulk/loose oil never goes through the storefront cart. When the admin sends a quote they pick one of two payment modes:

- **Offline (default):** the shop arranges payment & delivery directly (phone / bank / cash). If the admin converts the request into a tracked order, payment status is recorded manually.
- **Pay online (optional):** the quote includes a secure link to a public quote-acceptance page at `/quote/[token]` (token = HMAC, with an expiry). The customer reviews the quote and pays via PayHere; on success, a real `orders` row is created and linked to the bulk request (`converted_order_id`), and it appears in the customer's order history. This mode is only offered when PayHere is configured (`isPayHereEnabled`); when PayHere is not set up, only offline is available. The `/quote/[token]` page is built in Phase 6.

---

## 9. Notifications — Email + WhatsApp

### Triggers
1. **Order placed** — confirmation with order number, items, total, delivery date
2. **Payment received / approved** (PayHere webhook or bank transfer approval)
3. **Order confirmed by admin** (especially COD)
4. **Order in preparation**
5. **Out for delivery** OR **Ready for pickup**
6. **Delivered / completed**
7. **Order cancelled** (with reason)
8. **Bank transfer rejected** (with reason + re-upload link)
9. **Review request** (2 days after delivery)
10. **Bulk request received** (auto-ack to customer + alert to admin)
11. **Bulk quote sent** (to customer with price + message; includes a pay-online link only when the admin chose the online payment mode)
12. **Subscription reminder** (reorder reminder with one-tap reorder link)
13. **Welcome email** (on signup)
14. **Password reset** (handled by Supabase)
15. **Abandoned cart reminder** (optional, later)

### Email (Resend)
- React Email components for templates, branded to the green/gold/cream identity
- Templates in `emails/` directory
- Wrap sends in `lib/notifications/email.ts`

### WhatsApp Cloud API
- Reference: https://developers.facebook.com/docs/whatsapp/cloud-api
- Pre-register message templates with Meta (approval ~24h)
- Wrap sends in `lib/notifications/whatsapp.ts`
- E.164 phone format (`+94XXXXXXXXX`)

### Notification Orchestrator
A single `lib/notifications/index.ts` exports `notify(event, payload)` that fans out to email + WhatsApp based on settings. Fire-and-forget with logging + idempotency; never blocks the user flow.

---

## 10. Build Phases

The project is built in **6 phases** (`PHASE_1.md` … `PHASE_6.md`). Run them sequentially. Each ends with a checklist — verify all items before starting the next.

1. **Phase 1: Foundation** — Setup, auth, full DB schema + RLS, brand design system (green/gold/cream), base layout, navigation, footer, placeholder homepage, static pages, seeded admin
2. **Phase 2: Product System** — Brands, categories, products, sizes, public catalog, search, product detail (size/quantity/note + subscription display), wishlist UI, bulk "Request a Quote" customer form (read-only — no cart yet)
3. **Phase 3: Cart, Checkout, Subscriptions & Orders** — Cart state, checkout (delivery/pickup, zones, dates, slots), PayHere + bank transfer + COD, order creation, subscription creation from orders, order success, guest tracking
4. **Phase 4: Customer Account** — Order history & tracking, addresses, wishlist (DB-backed), loyalty points, reviews, subscription management, bulk-request history
5. **Phase 5: Admin Panel** — Dashboard, brands, categories, products+sizes, orders, customers, bulk requests (+ quote + convert), bank approvals, coupons, banners, zones, slots, subscriptions oversight, reviews, loyalty, settings, logs
6. **Phase 6: Notifications, Polish & Launch** — Email + WhatsApp for all triggers, subscription reminder cron, bulk quote notifications, the optional bulk quote online-payment page (`/quote/[token]`), review-request cron, SEO, sitemap, OG images, animation pass, accessibility audit, performance pass, deployment to Vercel

---

## 11. Environment Variables

Set up `.env.local` (placeholders fine in dev):

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_BRAND_NAME=Uggalla Oil Mills
NEXT_PUBLIC_CURRENCY=LKR

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Admin seed
ADMIN_SEED_EMAIL=
ADMIN_SEED_PASSWORD=

# Payments (retail only)
PAYHERE_MERCHANT_ID=
PAYHERE_MERCHANT_SECRET=
PAYHERE_MODE=sandbox  # or 'live'
PAYHERE_NOTIFY_URL=
PAYHERE_RETURN_URL=
PAYHERE_CANCEL_URL=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=orders@uggallaoilmills.lk

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=

# Cron
CRON_SECRET=

# Optional
NEXT_PUBLIC_GA_ID=
```

Provide a `.env.example` committed to the repo with all keys blank.

---

## 12. Project Structure (suggested)

```
/
├── app/
│   ├── (storefront)/
│   │   ├── page.tsx                # Homepage
│   │   ├── shop/                   # catalog + [slug] PDP + category pages
│   │   ├── bulk-request/           # bulk quote form
│   │   ├── cart/
│   │   ├── checkout/
│   │   ├── account/                # incl. subscriptions, bulk-requests
│   │   ├── orders/track/           # guest order tracking
│   │   ├── about/ contact/ faq/ ...
│   │   └── order-success/[orderNumber]/
│   ├── (auth)/
│   │   ├── login/ register/ forgot-password/ reset-password/
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Dashboard
│   │   ├── brands/ categories/ products/
│   │   ├── orders/ customers/ bulk-requests/
│   │   ├── subscriptions/ coupons/ banners/
│   │   ├── delivery-zones/ schedule/ reviews/ loyalty/ settings/ logs/
│   ├── api/
│   │   ├── payments/payhere/webhook/
│   │   ├── whatsapp/webhook/
│   │   └── cron/ (subscription-reminders, review-requests)
│   ├── layout.tsx
│   └── globals.css
├── components/ (ui/ storefront/ admin/ shared/)
├── lib/ (supabase/ notifications/ payments/ brand.ts utils.ts validations/)
├── hooks/
├── stores/                         # zustand (cart, wishlist)
├── types/
├── emails/                         # react-email templates
├── supabase/ (migrations/ seed.sql seed-products.sql)
├── middleware.ts
└── public/                         # includes logo asset
```

---

## 13. Quality Standards

Every page and component must satisfy:

- ✅ **Loading state** (skeleton or spinner, brand-styled)
- ✅ **Error state** (user-friendly, with retry)
- ✅ **Empty state** (with helpful CTA)
- ✅ **Responsive** at 375px, 768px, 1024px, 1440px
- ✅ **Keyboard navigable** (tab order, focus rings)
- ✅ **ARIA labels** on all interactive elements
- ✅ **No console errors or warnings** in production build
- ✅ **TypeScript strict** — no `any`, no `@ts-ignore`
- ✅ **Forms** validated with Zod, friendly inline error messages
- ✅ **Images** use `next/image` with proper width/height/sizes
- ✅ **Animations** smooth at 60fps, respect `prefers-reduced-motion`

---

## 14. Out of Scope (for v1)

Do not build these in v1:

- ❌ Multi-branch / multi-location support
- ❌ Multi-currency
- ❌ Multi-language (i18n)
- ❌ Phone/SMS OTP login
- ❌ Separate staff/driver roles & dashboards
- ❌ Native mobile apps
- ❌ **Auto-charging recurring payments** (subscriptions are reminder-only — no auto-charge)
- ❌ Auto-converting every bulk request into an order (admin always reviews and quotes first)
- ❌ Affiliate / referral system
- ❌ Live chat (only WhatsApp click-to-chat)
- ❌ Real-time GPS order tracking
- ❌ Courier dispatch integrations (PickMe / Uber)
- ❌ POS / in-store sales mode
- ❌ Other product types beyond coconut oil

---

## 15. Definition of Done — v1 Launch

The project is "done" when:

1. All 6 phases complete with their checklists ✅
2. Admin can add, edit, delete: brands, products (with sizes), categories, coupons, banners, zones, slots, customers
3. Customer can: browse, search, buy a retail product (bottle/packet) via all 3 payment methods, set a reorder reminder (subscription), track an order, write reviews, redeem loyalty points
4. Bulk/loose oil quote flow works end-to-end: request → admin quote (offline by default, or optional pay-online link via `/quote/[token]` when PayHere is configured) → customer notified → order created/converted and tracked
5. Email + WhatsApp notifications fire on all defined triggers, including subscription reminders
6. Deployed to Vercel with custom domain ready
7. Supabase RLS policies tested — non-admins cannot access admin data
8. Lighthouse: Performance 85+, Accessibility 95+, Best Practices 95+, SEO 95+ on key pages
9. Mobile experience indistinguishable in quality from desktop
10. Brand feels pure, natural, and premium — green/gold/cream, faithful to the Uggalla logo

---

**END OF MASTER SPEC**
