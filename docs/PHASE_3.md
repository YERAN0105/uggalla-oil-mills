# Phase 3: Cart, Checkout, Subscriptions & Orders

> **Read `MASTER_SPEC.md` first.** Phases 1 and 2 must be complete.

---

## Goal of Phase 3

Customers can fully purchase **retail** products (bottles & packets) — from adding to cart, through checkout, paying via PayHere or bank transfer or COD, and receiving a confirmed order. They can also opt into a **reorder-reminder subscription**. By the end of this phase:
- Cart works end-to-end (drawer + full page) with options preserved
- Checkout works for both guest and logged-in users
- Both delivery and pickup flows function
- All three payment methods work: PayHere (sandbox), Bank Transfer (with receipt upload), COD
- Orders are created in the database with a proper status flow
- **Subscriptions are created from orders** (reminder schedule set; reminders themselves fire in Phase 6)
- Customers see an order confirmation page

> **Reminders:** Bulk/loose oil does **not** go through cart or checkout — it uses the quote flow from Phase 2. **Notifications (email/WhatsApp) are NOT in this phase** — just create the records; Phase 6 wires notifications. **Subscriptions never auto-charge** — they only schedule reminders.

---

## Tasks

### 1. Cart State (Zustand)

Create `stores/cart.ts`:
- Items array with: product reference, snapshot (name, brand, image, base price), options (`{ size: {label, volume_ml, price}, quantity, note }`), `unit_price` (calculated), `is_subscription`, `subscription_interval`, `line_total`
- Methods: `addItem`, `removeItem`, `updateQuantity`, `updateItem`, `clearCart`, `getSubtotal`
- Persist in `localStorage` (zustand persist middleware)
- Hydrate carefully to avoid SSR mismatch (render cart contents only after hydration)
- Applied coupon state: `appliedCoupon` (id, code, discount calculation)
- Cart count derived selector for header badge
- Only retail products can enter the cart (guard against bulk products)

### 2. Wire "Add to Cart" on PDP

- Validate options (Zod): size required, quantity within bounds, note within max chars
- Calculate `unit_price` **server-side** via a Server Action (recompute size price — never trust client price). Return the validated price.
- If subscription opted in, require login (prompt to log in/continue as guest without subscription)
- Add to cart store
- Success toast with "View Cart" CTA + briefly open the cart drawer
- Animate the cart icon (subtle pulse/bounce)

### 3. Cart Drawer

- Slide-in from right (Framer Motion)
- Lists items: thumbnail, name + brand, options summary (size, quantity, note), subscription badge if applicable, line total, remove (X)
- Quantity controls
- Subtotal at bottom
- "View Full Cart" + "Checkout" buttons
- Empty state: branded illustration + "Start Shopping" CTA
- Closes on backdrop click or ESC

### 4. Full Cart Page (`/cart`)

- Two columns desktop:
  - **Left:** detailed item list — thumbnail, name + brand, size, quantity controls, note (with edit link → reopens PDP with selections pre-filled), subscription toggle/badge, remove
  - **Right:** summary card — subtotal; coupon input + Apply (server validates → shows discount with remove X); delivery fee row ("Calculated at checkout"); total; "Proceed to Checkout" (primary)
- Mobile: single column, summary card sticks to bottom
- Empty state: large branded illustration, "Browse our oils" CTA
- Show low-stock warning if any item's stock is below threshold

### 5. Checkout (`/checkout`)

Single-page checkout with collapsible sections (clean, premium feel):

#### Section 1: Contact
- Logged in: shows name + email + phone (editable inline)
- Guest: form with name, email, phone (+94 validation), optional "Create an account" checkbox (creates account on order placement)
- Login link for existing users

#### Section 2: Fulfillment Type
- Radio cards: **Delivery** / **Pickup**; selection reveals relevant fields

#### Section 3a: Delivery (if selected)
- Logged in with saved addresses → list with radio + "Add new address"
- Otherwise: address form (label, recipient, phone, line 1, line 2, city, postal code)
- "Save this address" checkbox (logged-in only)
- **Delivery zone dropdown** (from `delivery_zones`) → displays fee automatically
- Delivery date picker (react-day-picker, branded): disables dates before min lead time (default 24h), holidays, past dates; highlights today. All date and lead-time logic uses the **Asia/Colombo** timezone (use the date helper from Phase 1) so "today" and cut-off times are correct for Sri Lanka.
- Time slot picker (from `time_slots`): shows remaining capacity, disabled if full
- Optional note for driver

#### Section 3b: Pickup (if selected)
- Show **mill/shop address card** (Padukka) with embedded map (static OpenStreetMap image or Google Maps embed)
- Pickup date picker (same logic)
- Pickup time slot picker
- No delivery fee

#### Section 4: Payment Method
- Radio cards:
  - **Pay Online (PayHere)** — primary, recommended badge
  - **Bank Transfer** — "Upload receipt after order"
  - **Cash on Delivery** — only if delivery selected; grayed out if order total exceeds configured COD limit
- Each card: brief description + relevant icons

#### Section 5: Order Summary (sticky right sidebar on desktop, bottom drawer on mobile)
- Itemized list (compact), with subscription items flagged
- Subtotal
- Delivery fee (live, updates with zone)
- Discount (if coupon applied)
- Loyalty points redeem field (logged-in with points) — input accepting points to redeem with live discount respecting max redemption %
- Tax (if configured)
- **Total** (large)
- "Place Order" button (large, primary, disabled until all required sections valid)
- Reassurance text: secure payment, freshness guarantee, pure & natural

#### Validation
- All Zod-validated, inline error messages
- Cannot proceed unless: contact valid, fulfillment valid, payment selected, valid date/slot, lead time satisfied
- If cart is empty: redirect to `/cart`

### 6. Order Placement Logic (Server Action)

Build a robust Server Action `createOrder(payload)`:

1. **Validate** payload server-side via Zod
2. **Re-fetch** product/size data and recalculate all prices (never trust client prices)
3. **Validate coupon** (eligibility, usage limits, dates, min order, applies_to)
4. **Validate slot capacity** — atomic check + decrement
5. **Calculate**: subtotal, delivery_fee (zone or 0 for pickup), discount (coupon + loyalty), tax, total
6. **Generate** unique order number (e.g., `UOM-{YYYYMMDD}-{6 random chars}`)
7. **Create** order row + order_items rows (with product snapshot + options JSONB)
8. **Set status**:
   - PayHere: `payment_status = 'pending'`, `order_status = 'awaiting_payment'`
   - Bank Transfer: `payment_status = 'pending_transfer'`, `order_status = 'awaiting_payment'`
   - COD: `payment_status = 'cod'`, `order_status = 'pending_confirmation'`
9. **Save address snapshot** as JSONB
10. **Record coupon usage** if applied
11. **Reserve loyalty points** redeemed (log a `redeem` transaction; reverse on cancellation)
12. **Create subscription records** for any subscription opt-in items (see §7)
13. **Decrement product stock** if `stock_tracked`
14. **Return** order number + redirect URL based on payment method
15. **Clear cart** (client-side after navigation)

Run DB mutations inside a single transaction or with proper rollback logic.

### 7. Subscription Creation (Reminder-Only)

For each cart item flagged `is_subscription` on a successfully placed order:
- Insert a `subscriptions` row: `user_id`, `product_id`, `size_id`, `quantity`, `interval`, `status='active'`, `created_from_order_id`, and `next_reminder_date = delivery_date + interval` (weekly/biweekly/monthly).
- **No payment instrument is stored; nothing is auto-charged.** The subscription only drives reminders (the cron is built in Phase 6) and one-tap reorder.
- If the customer is a guest (no account), a subscription cannot be created — show a gentle note at checkout that subscribing requires an account.
- A confirmation line on the order success page: "We'll remind you to reorder every [interval]."

### 8. PayHere Integration

Reference https://www.payhere.lk/developers/

- `lib/payments/payhere.ts`:
  - `generateCheckoutParams(order)` — returns `merchant_id`, `return_url`, `cancel_url`, `notify_url`, `order_id`, `items`, `currency`, `amount`, `first_name`, `last_name`, `email`, `phone`, `address`, `city`, `country`, plus the required `hash` (MD5 per PayHere spec)
  - `verifyNotification(payload)` — MD5 verification of webhook signature
- Checkout-redirect page `/checkout/pay/[orderNumber]` that auto-submits a form to PayHere's hosted checkout
- Webhook `app/api/payments/payhere/webhook/route.ts`:
  - Verify signature
  - Map statuses (2 = paid, 0 = pending, -1 = cancelled, -2 = failed, -3 = chargedback)
  - Update `payment_status` + `order_status`
  - Insert `payments` row with raw response JSONB
  - On success → progress order to `confirmed`
  - Always return 200
- Return/cancel URLs land on `/order-success/[orderNumber]` or `/checkout/failed/[orderNumber]`
- Use **sandbox** mode in dev (`PAYHERE_MODE=sandbox`)

### 9. Bank Transfer Flow

- After placement with bank transfer → redirect to `/order-success/[orderNumber]`
- Order success page shows: "Order confirmed (pending payment verification)"; bank account details (from settings: bank name, account name, account number, branch); **receipt upload zone** (drag-drop, jpg/png/pdf, max 5MB) → file to Supabase Storage, row in `bank_transfer_receipts`, payment stays `pending_transfer` with a "receipt uploaded, awaiting review" flag
- If they don't upload now, they can later from `/account/orders/[orderNumber]`

### 10. COD Flow

- After placement with COD → redirect to `/order-success/[orderNumber]`
- "Order placed — pending confirmation"; explain admin will confirm by phone soon
- No further customer action needed

### 11. Order Success Page (`/order-success/[orderNumber]`)

- Subtle success animation (brand-styled checkmark / droplet)
- Order number prominent
- Order summary (compact), delivery/pickup details, payment method + status
- Subscription confirmation line if applicable
- Next steps section (varies by payment method)
- Buttons: "View Order" (logged-in → `/account/orders/[number]`) / "Continue Shopping"
- Guest checkout: "track order" link with a secure token (no login required)

Use a signed URL pattern for guest order access: token = HMAC of order_number, validated server-side.

### 12. Guest Order Tracking (`/orders/track`)

- Public page: look up order with order number + email/phone
- Shows order detail with status timeline (read-only)

### 13. Error Handling

- Stock depleted mid-checkout → friendly error, return to cart
- Slot full mid-checkout → friendly error, choose another slot
- Coupon expired → toast + auto-remove
- PayHere webhook failures → log to `payments.raw_response`, flag for manual review
- Network errors → retryable UI

### 14. Quality

- All forms accessible (label associations, error announcements)
- Mobile checkout silky smooth (no jumps when sections expand)
- Loading states on every async action
- Disable Place Order while submitting (spinner)
- Consistent toast notifications

---

## Phase 3 Completion Checklist

- [ ] Cart store persists across reloads (retail only; bulk products blocked)
- [ ] Add to cart from PDP works with size/quantity/note preserved
- [ ] Cart drawer + full cart page both polished
- [ ] Coupon application works (apply, validate, remove)
- [ ] Checkout works for guest and logged-in users
- [ ] Delivery zone fees calculate correctly
- [ ] Date picker blocks out lead time + holidays
- [ ] Time slot capacity enforcement works (try > capacity orders)
- [ ] PayHere sandbox payment completes end-to-end and updates order to paid
- [ ] PayHere webhook handles success, failure, and cancel
- [ ] Bank transfer flow: order created, receipt uploads to storage
- [ ] COD flow: order created with pending_confirmation status
- [ ] **Subscription record created from a subscription opt-in order; reminder date set; no auto-charge**
- [ ] Order success page renders correctly for all three payment methods
- [ ] Guest order tracking works via order number + email lookup
- [ ] Stock decrements on placement; coupon usage records
- [ ] Server-side price recalculation prevents client tampering
- [ ] All mobile flows work without issues
- [ ] No TypeScript errors, no console errors
- [ ] Lighthouse on checkout: Performance 80+, Accessibility 95+

Ready for **Phase 4: Customer Account**.
