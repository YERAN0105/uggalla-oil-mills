# Phase 4: Customer Account

> **Read `MASTER_SPEC.md` first.** Phases 1–3 must be complete.

---

## Goal of Phase 4

Build the complete logged-in customer experience: order history, status tracking, addresses, wishlist (persisted), loyalty points, reviews, **subscription management**, and **bulk-request history**. By the end of this phase:
- Customers have a full self-service account
- Wishlist persists to DB and survives logout
- Loyalty points earn on delivery and redeem at checkout (we already redeem; here we earn + display)
- Customers can submit reviews on delivered products
- Customers can manage their reorder-reminder subscriptions
- Customers can see their bulk quote requests and the quotes received
- Customers can manage addresses and profile

---

> ⚠️ **Carry-over from Phase 3 — guest order claiming (read before building Orders).**
> Guest orders are stored with `user_id = null` and a `guest_email`/`guest_phone`. When a
> logged-in customer wants a past guest order in their history, **do NOT auto-merge guest
> orders into the account by matching email alone** — a stranger can place a guest order using
> anyone's email, so a blind email merge would surface that stranger's order (and their delivery
> address) in the account holder's history. Instead, require **proof of the order**: let the user
> claim an order by entering its **order number** (+ matching email/phone), which only the actual
> orderer has. Optionally only attach when the account email is verified. (Placing the order itself
> is not a risk: guests earn no loyalty points and the order isn't attached to any account.)
> Also relevant to Phase 4 address editing: a saved address's `delivery_zone_id` (migration 005)
> is set at checkout and edited here — checkout shows it read-only.

---

## Tasks

### 1. Account Layout (`/account`)

- Sidebar navigation (sticky desktop, top nav/scroll on mobile):
  - Dashboard / Overview
  - Orders
  - Subscriptions
  - Bulk Requests
  - Addresses
  - Wishlist
  - Loyalty Points
  - Reviews
  - Profile
  - Logout
- Active route highlighted with brand-accent indicator
- Mobile: hamburger or top tab strip
- Brand-styled layout — generous spacing, display-font headings, the droplet flourish

### 2. Account Dashboard (`/account`)

- Welcome banner: "Hello, {firstName}" with a subtle flourish
- KPI cards (clickable):
  - Total Orders (→ /account/orders)
  - Loyalty Points balance (→ /account/loyalty)
  - Active Subscriptions (→ /account/subscriptions)
  - Wishlist count (→ /account/wishlist)
- "Recent Order" card with status badge + quick view
- "Continue Shopping" CTA

### 3. Orders List (`/account/orders`)

- Filterable list: by status (all, awaiting payment, confirmed, in preparation, out for delivery / ready for pickup, delivered, cancelled), date range, search by order number
- Each row: order number, date, items count + thumbnails, total, status badge, "View Details"
- Pagination
- Empty state if no orders

### 4. Order Detail (`/account/orders/[orderNumber]`)

- **Status Timeline** (horizontal stepper or vertical timeline): Placed → Confirmed → In Preparation → Out for Delivery (or Ready for Pickup) → Delivered. Cancelled shown as a separate state. Each step has a timestamp when reached.
- **Order Items** — full breakdown with options expanded (brand, size, quantity, note, subscription flag), unit price + line total
- **Delivery / Pickup Info** — address, date, time slot, delivery zone
- **Payment Info** — method, status
- **Pricing breakdown** — subtotal, delivery fee, discounts, loyalty redeemed, tax, total
- **Actions**:
  - **Reorder** — adds the same items to cart with options preserved; warns if any product is no longer available
  - **Cancel Order** — only if status is `awaiting_payment` or `pending_confirmation`; confirmation modal, reason dropdown, then reverses stock + coupon + loyalty
  - **Upload Bank Receipt** — only if bank transfer pending; same uploader as checkout
  - **Download Invoice** — PDF generated on demand using `@react-pdf/renderer`
  - **Contact Support** — WhatsApp click-to-chat with order number pre-filled
- If delivered: **Write a Review** button per item

### 5. Subscriptions (`/account/subscriptions`)

The simple reorder-reminder system (no auto-charge):
- List of subscriptions: product + thumbnail, size, quantity, frequency (Weekly / Every 2 weeks / Monthly), next reminder date, status (active / paused / cancelled)
- Actions per subscription:
  - **Pause / Resume** (paused = no reminders sent)
  - **Change Frequency** (updates `next_reminder_date` accordingly)
  - **Cancel** (confirmation modal)
  - **Reorder Now** (adds the product/size/quantity straight to cart)
- "How subscriptions work" explainer card: we remind you, you reorder in one tap, we never charge you automatically
- Empty state with CTA to browse subscription-eligible products

### 6. Bulk Requests (`/account/bulk-requests`)

- List of the customer's bulk/loose oil quote requests (only shown for logged-in users whose requests were linked to their account)
- Each: product of interest, quantity, status badge (new / in-progress / quoted / accepted / rejected / completed), submitted date
- Detail view (read-only): the request details + the **quote** the admin sent (unit price / total + message) when status is `quoted` or later
- If the admin sent an **offline** quote, payment & delivery are arranged directly with the shop (no pay button here). If the admin sent a **pay-online** quote, show the link/button to the secure quote-payment page while it's valid (and reflect "paid" once completed).
- Empty state with a "Request a bulk quote" CTA

### 7. Addresses (`/account/addresses`)

- List of saved addresses with default badge
- Each card: label, recipient, phone, full address
- Edit / Delete / Set as Default
- "Add New Address" → modal with address form (same fields as checkout)
- Empty state with CTA

### 8. Wishlist (`/account/wishlist`)

- Migrate the Zustand wishlist (from Phase 2) to DB-backed:
  - On login, merge local wishlist into DB (avoid duplicates)
  - All wishlist mutations go through DB now (optimistic UI)
- Grid of wishlisted products; each card: catalog card + "Add to Cart" + "Remove" (X)
- Empty state with branded illustration + "Discover oils" CTA
- Wishlist count in header updates live

### 9. Loyalty Points (`/account/loyalty`)

- **Current Balance** large display (e.g., "1,250 points = Rs. 625")
- Explanation card: earning rate, redemption rate, expiry (from settings)
- **Transactions History**: table — date, type (Earn / Redeem / Bonus / Expire / Adjust), points, balance after, note; filter by type
- "How it works" section (earn on every delivered order, bonuses for first order / reviews / birthday)
- Note: earning happens automatically when an order is marked `delivered` by admin (Phase 5) — earn rule: 1 point per Rs. 100 spent, configurable

### 10. Reviews (`/account/reviews`)

- List of reviews submitted: product name + thumbnail, rating, title, body, status (pending / approved / hidden), submitted date
- Edit (only if pending) / Delete
- Empty state with "Browse your delivered orders" CTA

### 11. Review Submission

From order detail, "Write a Review" on each delivered item opens a modal:
- Star rating (1–5)
- Title (optional, max 80 chars)
- Body (textarea, max 1000 chars)
- Up to 3 image uploads
- Submit → creates review row with `status='pending'`
- Validation: one review per `order_item_id` per user
- Toast: "Thanks! Your review will be visible after moderation."

Public PDP shows only `status='approved'` reviews.

### 12. Profile (`/account/profile`)

- Editable form: name, email (re-verification if changed), phone, password (current + new + confirm)
- "Save Changes" with confirmation
- Account deletion section (strong warning, requires password confirmation, soft-deletes data)

### 13. Stock & Availability Updates

- In wishlist, reorder, and subscription "reorder now", check each product's current `is_published` and stock
- Show "No longer available" badge with disabled CTA where applicable

### 14. Header Updates

- Wishlist count badge updates live
- Cart count already wired in Phase 3
- User icon shows initials avatar when logged in; click opens dropdown (Account, Orders, Subscriptions, Wishlist, Logout)
- Mobile: same items in slide-in menu

### 15. Loyalty Earn Logic (Trigger Stub)

When an order moves to `delivered` (admin sets this in Phase 5):
- earned points = `floor(order.total / earn_rate)` (rate from settings)
- Insert `loyalty_transactions` (`type='earn'`, `expires_at = now + 12 months`)
- Update `users.loyalty_points`
- This logic lives in a Server Action that admin's status update calls in Phase 5; here in Phase 4 we build the function ready to use.
- Also handle: on cancellation after points earned, subtract points (`type='adjust'`); confirm the Phase 3 `redeem` transaction is correct.

### 16. Empty / Loading / Error States

Every account sub-page needs all three, branded.

### 17. Quality Checks
- All routes protected (redirect to login if unauthenticated)
- RLS prevents access to other users' data
- Mobile polished; skeleton loaders match brand
- No console errors

---

## Phase 4 Completion Checklist

- [x] Account dashboard renders with correct KPIs (incl. active subscriptions)
- [x] Orders list filters + paginates correctly
- [x] Order detail page shows full info with status timeline + options expanded
- [x] Reorder works (adds items back with options)
- [x] Cancel order works only for valid statuses + reverses stock/coupons/loyalty
- [x] Invoice download works (print-to-PDF route + `window.print()`, not `@react-pdf/renderer` — see CLAUDE.md)
- [x] **Subscriptions page: pause/resume/change frequency/cancel/reorder-now all work**
- [x] **Bulk requests history shows requests + received quotes (read-only)**
- [x] Addresses CRUD fully functional
- [x] Wishlist persists to DB, syncs across devices; local wishlist merges on login
- [x] Loyalty page shows balance + transaction history
- [x] Review submission works with image upload; one review per purchased+delivered item
- [x] Profile editing works with email re-verification
- [x] Wishlist + cart counts in header live-update
- [x] No TypeScript errors (`npx tsc --noEmit` clean; `next lint` clean; `npm run build` passes)
- [ ] All RLS policies tested — cross-account access blocked *(migration 007 written; needs a manual cross-account runtime pass)*
- [ ] No console errors / mobile experience polished *(needs a browser pass — build is clean)*

> **Status:** Phase 4 is code-complete and passes type-check, lint, and production build. Run **migration `007_phase4_account.sql`** in Supabase before testing. The two unchecked items above are runtime/browser verifications, not missing features.

Ready for **Phase 5: Admin Panel**.
