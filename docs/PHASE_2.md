# Phase 2: Product System & Public Catalog

> **Read `MASTER_SPEC.md` in the project root first.** Phase 1 must be complete. Build only what's described in this phase.

---

## Goal of Phase 2

Build the full product catalog experience for customers — but **read-only**. No cart, no checkout yet. By the end of this phase:
- Customers can browse a beautiful catalog of coconut-oil products with filters
- Customers can search products with autocomplete
- Customers can view detailed product pages with simple options (size, quantity, optional note) and live price updates
- Retail products show an "Add to Cart" button (non-functional placeholder — wired in Phase 3)
- **Bulk products show a "Request a Quote" button and a working bulk-request form that creates a record** (admin management + notifications come later)
- The subscription option is **displayed** on eligible products (wired into orders in Phase 3)
- Wishlist heart icon exists on cards but non-functional (wired in Phase 4)
- A minimal seeding script gives realistic products to design against

---

## Prerequisites
- Phase 1 complete and verified
- Database schema deployed (incl. `brands`, `categories`, `products`, `product_sizes`, `bulk_requests`)
- Brand design system in place

---

## Tasks

### 1. Seed Realistic Products (Temporary Seeding)

Create `supabase/seed-products.sql` (or a seed script) that inserts a realistic set for Uggalla Oil Mills. Since they sell coconut oil only under the **Royal Coco** brand across **Bottles, Packets, and Bulk**, seed something like:

- **Bottles category** (purchase_type = `retail`):
  - "Royal Coco Pure Coconut Oil — Bottle" with sizes 200ml, 500ml, 750ml, 1L (realistic LKR prices)
  - "Royal Coco Virgin Coconut Oil — Bottle" with sizes 250ml, 500ml, 1L
  - "Royal Coco Coconut Hair Oil — Bottle" with sizes 100ml, 200ml
- **Packets category** (purchase_type = `retail`):
  - "Royal Coco Coconut Oil — Packet" with sizes 100ml, 200ml, 500ml
  - "Royal Coco Coconut Oil — Economy Packet" with sizes 500ml, 1L
- **Bulk category** (purchase_type = `bulk_quote`):
  - "Royal Coco Loose Coconut Oil (Bulk)" — indicative per-litre price; no fixed sizes required
  - "Royal Coco Coconut Oil — 20L Can (Wholesale)" — bulk quote

For each product include: a couple of placeholder images (Unsplash URLs allowed in `next.config.js`), short description, full description (purity, naturally pressed in Padukka, usage), key facts (extraction method, shelf life, origin), and sensible `allows_subscription` / `allows_note` flags. Mark ~3 as featured, ~2 as bestseller. All `is_published = true`. Assign every product to the **Royal Coco** brand.

Document how to run this seed in the README. (Real photos will be uploaded via admin in Phase 5.)

### 2. Public Product Catalog (`/shop`)

A clean, premium catalog page:

- **Filter sidebar** (sticky on desktop, drawer on mobile):
  - Category checkboxes (Bottles / Packets / Bulk)
  - Brand checkboxes (Royal Coco — ready for more brands)
  - Size checkboxes (200ml, 500ml, 1L, …)
  - Price range slider with LKR formatting
  - "Clear all filters" button
- **Sort dropdown**: Newest, Price ↑, Price ↓, Popularity (rating × count), Rating
- **Product grid**:
  - Responsive: 1 col mobile, 2 sm, 3 md, 4 lg
  - Each card: large image with hover transition (subtle zoom or secondary image), product name in display font, brand label, starting price ("from Rs. 950"), star rating + count, wishlist heart toggle (placeholder), "Quick view" on hover (desktop)
  - Featured products get a subtle gold badge
  - Out-of-stock products visually muted with "Out of Stock" tag
  - **Bulk products** clearly show a "Request a Quote" affordance instead of a price-to-cart
- **Quick view modal**: Framer Motion modal — main image, name, brand, base price, quick description, "View Full Details" button (links to PDP)
- Infinite scroll (preferred) or pagination (12 per page)
- Empty state when no products match (branded illustration + "Reset filters" CTA)
- Loading state with brand-styled skeleton cards
- URL state for filters (e.g., `/shop?category=bottles&size=1l&sort=price_asc`) — shareable links

### 3. Search

- **Sticky search input** in header (icon expands to input on desktop; full-screen on mobile)
- Autocomplete dropdown: top 5 matching products as you type (debounced 250ms, server-side query)
- Each suggestion: thumbnail, name, brand/category, starting price
- "View all results" link → `/shop?q=<query>`
- Keyboard navigation (arrows + enter)
- Empty state in dropdown when no matches

### 4. Product Detail Page (`/shop/[slug]`)

The most important customer page. Treat it like a premium natural-product page.

#### Layout (desktop, two columns above the fold):
- **Left:** image gallery — main large image with smooth fade transitions, click-to-zoom lightbox, thumbnail strip below, square or 4:5 aspect
- **Right:** product info & options
  - Breadcrumbs (Home / Shop / Category / Product Name)
  - Brand label (Royal Coco) + product name in display font (large)
  - Star rating + "(X reviews)" link that scrolls to reviews
  - Live price (updates with size selection), large, in brand color
  - Short tagline / lead paragraph
  - **Options** (see §5): size, quantity, optional note
  - **Subscription option** (only if `allows_subscription`): "Remind me to reorder" + frequency picker (display only this phase)
  - **Retail:** "Add to Cart" (large, primary — shows a toast "Cart coming soon" for now) + "Buy Now" (secondary)
  - **Bulk:** "Request a Quote" (primary) → opens / routes to the bulk request form (see §6) — this is FUNCTIONAL this phase
  - Wishlist toggle button
  - Estimated delivery info widget (uses configured min lead time)
  - Trust badges row (100% pure, naturally pressed, secure payment, etc.)

#### Below the fold:
- **Description** (rich text)
- **Key facts & usage** in an elegant accordion (extraction method, shelf life, origin, how to use)
- **Reviews** section: star breakdown bar chart, list of reviews (author, date, rating, body, optional image), "Sort by" dropdown, "Be the first to review" empty state (submission UI itself is Phase 4)
- **You may also like** — 4 related products (same category/brand)

#### Mobile:
- Image gallery first
- Sticky bottom bar with current price + primary action (Add to Cart / Request a Quote) always visible
- Options stack vertically with optional accordion for compact sections

### 5. Product Options (Simple)

Per `MASTER_SPEC.md` §5 — keep it simple. Use React Hook Form + Zod.

1. **Size / Volume** — radio cards from the product's size table; each shows volume + price. Required (implicit if a single size). Selecting updates the live price.
2. **Quantity** — number stepper (min 1, max configurable, default 10).
3. **Note** — optional text input with character counter (only if `allows_note`; max from `note_max_chars`).

Live price = selected size price × quantity, shown clearly (e.g., "Rs. 1,750 × 2 = Rs. 3,500"). Persist selections in local state. Validation prevents Add to Cart until a size is selected. Subtle Framer Motion feedback on each selection.

**No flavors, tiers, shapes, dietary toggles, photo upload, or add-ons** — those do not apply to coconut oil.

### 6. Bulk / Loose Oil Quote Request (FUNCTIONAL)

Bulk products (purchase_type = `bulk_quote`) drive a quote request — **not** the cart and **not** online payment.

- A **"Request a Quote"** button on bulk PDPs and a standalone page at `/bulk-request`.
- The form collects:
  - Name, phone, email
  - Product of interest (pre-filled when arriving from a bulk product page; selectable otherwise)
  - Quantity needed + unit (e.g., litres / cans)
  - Fulfillment: delivery or pickup; if delivery, address fields
  - Preferred date (optional)
  - Notes / special requirements
  - Optional reference image upload (to `bulk-attachments` bucket)
- Zod validation; +94 phone validation; friendly inline errors.
- On submit → create a `bulk_requests` row with `status = 'new'` (and any attachments). Works for both guests and logged-in users (link `user_id` when logged in).
- Show a branded **success screen**: "Thanks! We've received your request and will send you a quote shortly." (Email + WhatsApp acknowledgement is wired in Phase 6 — stub the call now.)
- Admin management of these requests is built in Phase 5.

### 7. Category Pages (`/shop/category/[slug]`)

- Same layout as `/shop` but pre-filtered to the category
- Hero banner at top with category image + name + description
- Same filter sidebar (category preselected/locked)

### 8. Wishlist (UI Only)

- Heart icon on every product card and PDP
- Click → animates filled (Framer Motion), toast "Saved to wishlist"
- Persists in local Zustand store for now (DB wiring in Phase 4)
- Wishlist count in header updates

### 9. Performance
- Server Components for catalog list; filters via URL state
- Stream product cards
- Image optimization: `next/image` with proper `sizes`
- Avoid hydration mismatches
- `<Suspense>` and `loading.tsx` used thoughtfully

### 10. SEO
- Each product page: dynamic metadata (title, description from product fields)
- Open Graph image = primary product image
- Product structured data (JSON-LD) — Product schema with offers (price range from sizes)
- Category pages + `/shop` have proper metadata

---

## Phase 2 Completion Checklist

- [ ] Realistic Royal Coco products seeded across Bottles, Packets, Bulk
- [ ] `/shop` catalog renders beautifully with all filters working (category, brand, size, price)
- [ ] Sort works, URL state persists filters
- [ ] Search autocomplete works smoothly with debouncing
- [ ] Product detail page is clean and premium — gallery, options, key facts, reviews section
- [ ] Size selection updates price live without lag; quantity + note work
- [ ] Retail products show Add to Cart (placeholder); bulk products show Request a Quote
- [ ] **Bulk request form works end-to-end and creates a `bulk_requests` row** (guest + logged-in)
- [ ] Subscription option displays on eligible products (no logic yet)
- [ ] Mobile experience is excellent (test on 375px), sticky bottom bar works
- [ ] Wishlist heart toggles with animation (UI only)
- [ ] Category-specific pages work
- [ ] Quick view modal works
- [ ] Empty states for "no results" and "no reviews" are branded
- [ ] SEO metadata + JSON-LD verified
- [ ] No TypeScript errors, no console errors
- [ ] Lighthouse on PDP: Performance 80+, Accessibility 95+, SEO 95+
- [ ] Brand still feels pure, natural, premium — not generic

Ready for **Phase 3: Cart, Checkout, Subscriptions & Orders**.
