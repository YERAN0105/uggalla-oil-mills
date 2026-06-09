# Phase 5: Admin Panel

> **Read `MASTER_SPEC.md` first.** Phases 1–4 must be complete.

---

## Goal of Phase 5

Build the complete admin dashboard for managing the entire shop. By the end of this phase, the admin has full control over: brands, products (with sizes), categories, orders, customers, bulk quote requests, coupons, banners, delivery zones, time slots, subscriptions, reviews, loyalty settings, shop settings, and activity logs.

The admin panel should feel like a **professional SaaS dashboard** — clean, dense where helpful, with great UX for repetitive tasks. Less ornamental than the storefront: refined and utilitarian — neutral tones, clear typography, sharp data tables — but still consistent with the green/gold brand.

---

## Tasks

### 1. Admin Shell (`/admin`)

- **Sidebar** (collapsible on mobile), nav items with icons:
  - Dashboard
  - Orders (count badge for new/pending)
  - Bulk Requests (badge)
  - Products
  - Brands
  - Categories
  - Customers
  - Subscriptions
  - Payments Pending (badge for bank transfers awaiting review)
  - Coupons
  - Banners
  - Delivery Zones
  - Schedule (time slots + holidays)
  - Reviews (badge for pending)
  - Loyalty
  - Settings
  - Activity Logs
  - Bottom: admin profile + logout
- **Top bar**: page title, global search (products / orders / customers / bulk requests), notifications icon, admin avatar
- Middleware enforces `role='admin'`; non-admins redirected to homepage with a toast

### 2. Admin Dashboard (`/admin`)

- KPI cards (top row): Today's Revenue (Rs. formatted, % vs yesterday), Today's Orders (+ comparison), Pending Orders, Low Stock
- **Revenue Chart** (Recharts area): last 30 days default, toggle 7d / 90d / 12mo
- **Top Selling Products** (last 30d, table or bar chart, top 10)
- **Orders by Status** donut chart
- **Recent Orders** table (last 10) with quick status-update dropdown per row
- **Pending Items** strip: bulk requests count, bank transfer approvals count, pending reviews count, active subscriptions — each clickable

### 3. Brands (`/admin/brands`)

- Table/grid: logo, name, slug, product count, active toggle, actions
- Create/edit modal: name, slug (auto from name), description, image/logo upload, display order, is_active
- Drag to reorder
- (Royal Coco exists from seed; admin can add more brands)

### 4. Categories (`/admin/categories`)

- Table + create/edit modal: name, slug, description, image (single upload), display order, is_active, **is_bulk** flag
- Drag to reorder
- (Bottles, Packets, Bulk exist from seed)

### 5. Products (`/admin/products`)

**List view:**
- Data table: checkbox (bulk), thumbnail, name, brand, category, base price, **purchase type (Retail / Bulk Quote)**, stock indicator, published toggle, featured badge, actions menu (Edit, Duplicate, Delete)
- Filters: brand, category, purchase type, published, featured, low stock, search by name
- Sort by name, price, created, updated
- Pagination with per-page selector
- Bulk actions: delete, set published, set featured

**Create / Edit page (`/admin/products/new`, `/admin/products/[id]/edit`):**

Multi-section form (tabbed or stacked):

1. **Basic Info** — name (required), slug (auto, editable), **brand** (dropdown), **category** (dropdown, required), short description, description (rich text — TipTap or similar)
2. **Key Facts** — repeatable label/value rows (e.g., "Extraction: Cold-pressed", "Shelf life: 12 months", "Origin: Padukka") stored as JSONB
3. **Images** — drag-drop multi-upload (react-dropzone) → Supabase Storage; reorder via `dnd-kit`; set primary; delete; alt text per image
4. **Sizes** — base price (required) + repeatable size rows: label, **volume (ml)**, price (absolute price for that size). Add/remove rows. (For bulk products, sizes are optional; the base price can act as a per-unit indicative price.)
5. **Purchase Type** — Retail (cart + checkout) or **Bulk Quote** (request-a-quote, no cart; payment follows the quote: offline by default, or optional pay-online)
6. **Options & Subscription** — toggle: Allow customer note (+ max chars); toggle: **Allow subscription** (retail only)
7. **Stock** — toggle: Track stock; if tracked: current stock, low stock threshold
8. **Display & Status** — Published, Featured, Bestseller toggles
9. **SEO** — meta title (counter ~60), meta description (~155)

- Sticky "Save" / "Save & Publish" / "Discard" footer
- Validation errors highlighted per section
- Unsaved changes warning on navigation
- **Delete:** confirmation modal; if order references exist, soft-delete (`is_published=false` + `deleted_at`); otherwise hard delete

### 6. Orders (`/admin/orders`) — retail orders

**List view:**
- Table: order number, customer name + phone (click-to-call/WhatsApp icons), date, items count, total, payment method, payment status, order status, actions
- Status badges with semantic colors
- Filters: status (multi), payment method, payment status, date range, fulfillment type, search (order number, name, phone, email)
- Sort by date, total
- Quick inline status update
- Bulk actions: status update, mark paid, export CSV
- Pagination (50/page default)

**Order Detail (`/admin/orders/[orderNumber]`):**

Left column (~70%):
- **Header**: order number, status badge, payment status badge, created date
- **Status Timeline** (vertical) with timestamps; admin advances to next status via buttons (or any status via dropdown). Each change writes a row in `order_status_history` with the admin's user_id.
- **Items** — for each: image, name, brand, quantity, options expanded (size, note highlighted, subscription flag), unit price + line total
- **Pricing**: subtotal, delivery fee, discount + coupon code, loyalty redeemed, tax, total
- **Internal Notes** (admin-only): textarea + add note; list with admin name + timestamp

Right column (~30%, sticky):
- **Customer**: name, phone (call / WhatsApp templated with order info), email (mailto), "View Customer Profile"
- **Fulfillment**: Delivery / Pickup, address (map link), zone + fee, date + time slot
- **Payment**: method, status; if bank transfer → receipt image (enlarge), Approve / Reject (if pending review); if PayHere → gateway transaction ID + raw response JSON (collapsible)
- **Action Buttons**: Print Invoice, Print Packing Slip (simplified fulfilment sheet: customer phone, products + sizes + quantities bold, notes highlighted, delivery time), Send Status Update via WhatsApp (stub/disable until Phase 6), Refund (if paid online), Cancel Order (with reason)

### 7. Bulk Requests (`/admin/bulk-requests`)

This replaces a normal "orders" path for loose/bulk oil. The admin sets a price, then chooses the payment mode per quote: **offline by default** (shop arranges payment & delivery), or an **optional pay-online link** when PayHere is configured.

**List view:**
- Table: customer name + phone (click-to-call/WhatsApp), product of interest, quantity + unit, fulfillment, status badge (new / in-progress / quoted / accepted / rejected / completed), submitted date, actions
- Filters: status, date range; search by name/phone

**Detail page:**
- Customer info + contact buttons
- Product of interest, requested quantity + unit, preferred date, fulfillment + address
- Notes + any reference attachments (gallery)
- Internal notes
- **Quote section**:
  - Set unit price and/or total, optional discount
  - Customer-facing message (rich text)
  - **Payment mode toggle:**
    - **Offline (default):** message should state the shop will arrange payment & delivery directly. No link generated.
    - **Pay online (only enabled when `isPayHereEnabled` from `lib/integrations.ts` is true):** generate a secure quote token, save `quote_token` + `quote_expires_at` (default 7 days) and `payment_mode='online'` on the `bulk_requests` row. This is the link the customer uses at `/quote/[token]` (the public page itself is built in Phase 6). When PayHere is not configured, hide/disable this option so only offline is available.
  - "Send Quote" → saves `quoted_unit_price`, `quoted_total`, `quote_message`, `payment_mode`, sets status `quoted`, and triggers email + WhatsApp (Phase 6 — stub now; for now also expose the quote/link so it's copyable)
- **Convert to Order** (after acceptance): creates a tracked order with a custom bulk line item; for offline quotes the admin records payment status manually; for paid online quotes the order is created automatically on payment (Phase 6); links `converted_order_id`
- Status update controls (mark in-progress / accepted / rejected / completed)

### 8. Customers (`/admin/customers`)

**List view:**
- Table: name, phone, email, registration date, total orders, lifetime value, last order date, status (active / blocked), actions
- Filters: registration date range, has orders, blocked status; search; sort by lifetime value / last order / registration

**Customer Detail (`/admin/customers/[id]`):**
- Profile (name, email, phone, registration date)
- KPIs: total orders, total spent, AOV, loyalty balance, active subscriptions
- Tabs: Orders, Bulk Requests, Subscriptions, Addresses (read-only), Reviews, Loyalty Transactions, Notes (admin-only)
- Actions: Edit profile, Block/Unblock, Adjust Loyalty Points (with reason), Send WhatsApp Message (templated)

**Manual Customer Creation:** "Add Customer" → modal (name, email, phone, optional address, send-invite toggle). With invite: temporary password emailed.

### 9. Subscriptions Oversight (`/admin/subscriptions`)

- List: customer, product, size, quantity, frequency, next reminder date, status (active / paused / cancelled), created date
- Filters: status, frequency; search by customer
- Detail: view subscription; admin can pause/cancel, change next reminder date, or trigger a reminder manually
- Stats: total active, reminders sent, reorders attributed (best-effort)

### 10. Payments Pending (`/admin/payments/pending`)

- List of orders with `payment_status = 'pending_transfer'` AND a receipt uploaded
- Each: order number, customer, amount, uploaded date, receipt thumbnail
- View full receipt; Approve / Reject:
  - Approve → `payment_status='paid'`, advance order to `confirmed`, log activity
  - Reject → reason modal, receipt `status='rejected'`, payment stays `pending_transfer`, customer can re-upload

### 11. Coupons (`/admin/coupons`)

**List:** code, type, value, usage count / limit, validity dates, active toggle, actions

**Create/Edit:** code (uppercase alphanumeric), type (% off / flat off / free delivery), value, min order amount, max discount cap (for %), usage limit total, usage limit per customer, valid from/until, applies to (all / specific categories / specific brands / specific products), active toggle

Usage history per coupon.

### 12. Banners / Sliders (`/admin/banners`)

- Manage homepage hero slides + promo banners
- List with thumbnails, headline, position, active dates
- Create/edit: image, headline, sub-headline, CTA text, CTA link, position (hero / promo strip), display order, valid from/until, is_active
- Drag to reorder

### 13. Delivery Zones (`/admin/delivery-zones`)

- Table: name, fee, est time, min order, same-day surcharge, active, actions
- Create/edit modal with all fields; reorder

### 14. Schedule (`/admin/schedule`)

Tabs:
- **Time Slots**: list + create/edit (label, start time, end time, capacity, active)
- **Holidays**: calendar view + add holiday (date + label). Disabled for customer checkout.
- **Lead Times**: global minimum lead time (hours) + per-category overrides

### 15. Reviews Moderation (`/admin/reviews`)

- Tabs: All / Pending / Approved / Hidden
- Table: product, customer, rating, title, body preview, submitted date, status, actions
- Click to view full review (with images)
- Approve / Hide / Delete; admin reply (optional, shows on public PDP)

### 16. Loyalty Settings (`/admin/loyalty`)

- Settings form: earning rate, redemption rate, max redemption % per order, bonuses (welcome / birthday / per approved review), expiry (months)
- Stats: total points issued, redeemed, expired, outstanding
- Manual adjustment tool (goodwill / refunds)

### 17. Settings (`/admin/settings`)

Tabs:
- **Shop Info**: name, tagline, logo upload, address (Padukka), phone, WhatsApp number, email, business hours, social links
- **Tax**: rate, inclusive/exclusive
- **Subscriptions**: which frequencies are offered (Weekly / Every 2 weeks / Monthly), optional subscription loyalty bonus
- **Payment**: PayHere merchant ID + secret + mode (sandbox/live); bank account details (name, account name, account number, branch, swift); COD enable + min/max order amount
- **Notifications** (UI shell only this phase — wired in Phase 6): email enable toggle, WhatsApp enable toggle, per-event template placeholders
- **SEO**: site title, default meta description, OG default image
- **Maintenance Mode**: toggle (customer side shows branded "back soon"; admin still works)

### 18. Activity Logs (`/admin/logs`)

- Table: timestamp, admin user, action, target (link if applicable), metadata preview
- Filters: admin user, action type, date range; sort desc; pagination
- All admin write operations create activity log entries

### 19. Hooking Loyalty Earn Logic

When admin sets an order to `delivered`:
- Trigger the loyalty earn function from Phase 4 (calculate points, insert transaction, update balance)
- Toast: "Customer earned X loyalty points"
- If admin cancels an already-delivered order: reverse the earned points

### 20. Print Layouts

- `/admin/orders/[orderNumber]/print/invoice` — clean A4 invoice with logo, business info, customer, items, totals, footer
- `/admin/orders/[orderNumber]/print/packing-slip` — simplified fulfilment sheet: large fonts, products + sizes + quantities emphasized, notes in a box, delivery info
- Use `@media print` CSS to hide UI chrome

### 21. Global Admin Search

- Top-bar search (cmd+K friendly): products, orders (order number / customer name / phone), customers, bulk requests
- Modal with quick-jump results; keyboard navigation

### 22. Quality

- All admin actions write activity logs
- Destructive actions confirm first
- Inline validation everywhere
- Optimistic updates where safe (status changes), rollback on error
- Pagination + search + filter URL state preserved
- Mobile-responsive admin (down to tablet 768px minimum)

---

## Phase 5 Completion Checklist

- [ ] Admin login redirects to /admin dashboard
- [ ] Non-admins cannot access /admin/* (middleware + RLS)
- [ ] Dashboard KPIs and charts render with real data
- [ ] **Brands CRUD with reorder**
- [ ] Categories CRUD with reorder (incl. is_bulk flag)
- [ ] Products CRUD complete with multi-image upload + reorder + sizes (volume) + purchase type + subscription/note toggles
- [ ] Orders list with all filters + bulk actions
- [ ] Order detail with full info, options expanded, status timeline editable
- [ ] Invoice + packing slip print pages work
- [ ] Bank transfer approval flow works (approve/reject with reason)
- [ ] **Bulk requests: review, set quote with payment mode (offline default; pay-online link only when PayHere is enabled), send (stub), convert to order**
- [ ] Customers CRUD + detail view; manual customer creation works
- [ ] **Subscriptions oversight works (view, pause, cancel, manual reminder)**
- [ ] Coupons CRUD with usage tracking (applies to brands/categories/products/all)
- [ ] Banners CRUD with reorder
- [ ] Delivery zones CRUD
- [ ] Time slots + holidays + lead times manageable
- [ ] Reviews moderation works (approve, hide, delete, reply)
- [ ] Loyalty settings save and apply to earn/redeem; manual adjustment works
- [ ] Settings tabs save correctly (incl. subscription frequencies)
- [ ] Activity logs populate on every admin action
- [ ] Loyalty points earn correctly when order marked delivered
- [ ] Global admin search works
- [ ] Mobile/tablet admin layout works
- [ ] No TypeScript errors, no console errors

Ready for **Phase 6: Notifications, Polish & Launch**.
