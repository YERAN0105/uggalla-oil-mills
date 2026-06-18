# Admin Guide — Uggalla Oil Mills

This is a simple guide for running the shop. You don't need to be technical.

**To start:** go to **/login**, sign in with your admin account, then open **/admin**.

**Handy tip:** press **Ctrl-K** (Windows) or **⌘K** (Mac) anywhere in the admin to quickly jump to
any order, product, or customer.

---

## The dashboard (`/admin`)

This is your home screen. It shows, at a glance:
- Today's money and number of orders
- Orders that are waiting for you
- Products that are low on stock
- Bulk quote requests waiting
- Bank transfers waiting to be checked

The little number badges in the side menu tell you what needs attention.

---

## Brands & categories

- **Brands** (`/admin/brands`) — *Royal Coco* is for bottles/packets; *Uggalla Oil Mills* is for
  bulk. You can add a name, logo, and description, and drag them to reorder.
- **Categories** (`/admin/categories`) — Bottles, Packets, Bulk. Each can have a picture and a
  description.

---

## Products (`/admin/products`)

**To add a normal product (a bottle or packet):**
1. Click **Add product**.
2. Type the **name**, pick the **brand** and **category**, and write a short and a full description.
3. Add **sizes** with prices (e.g. 200 ml → Rs. 450, 500 ml → Rs. 950). The shop shows the cheapest
   size as the "from" price. ⚠️ You **must add at least one size** before you can publish.
4. Upload **photos** (drag to reorder — the first one is the main photo).
5. Turn on **Track stock** if you want to count stock, **Subscription** if customers can set reorder
   reminders, then turn on **Published** when it's ready to show.

**To add a bulk product:** set **Purchase type = Bulk Quote**. Bulk products have **no sizes** — you
just type a rough per-litre price. Customers will **request a quote** instead of buying directly.

---

## Orders (`/admin/orders`)

Click any order to open it. You'll see the customer, the delivery/pickup details, the items, and the
payment.

- **Move the order along** using the status timeline:
  **Placed → Confirmed → Preparing → Out for delivery / Ready for pickup → Delivered.**
  Each time you change it, the customer is told automatically by email (and WhatsApp, once that's
  set up). The message goes out a **few minutes later on purpose** — that way, if you tap the wrong
  button, you have time to fix it before the customer is bothered.
- **Customer note:** if the customer wrote a note, you'll see it in the **Fulfillment** box, labeled
  *Customer note*.
- **Internal notes:** your own private notes (the customer never sees these). For an order made from
  a bulk request, you'll also see a **"From the bulk request"** box with the quote message and any
  notes that came from the request.
- **Cancel or refund** an order with a reason. Stock and loyalty points are put back automatically.
- **Print** an invoice or a packing slip from the order page.
- **Bank transfer orders:** the customer uploads their receipt. Check it under
  **Payments → Pending** (`/admin/payments/pending`) and **Approve** or **Reject** with a reason.
  Approving confirms the order; rejecting asks the customer to upload a new receipt.

---

## Bulk quote requests (`/admin/bulk-requests`)

This is for the "request a price" flow (loose / wholesale oil). Here's the full journey:

### 1. A request comes in
When a customer asks for a quote, it shows up here as **New**. You and the customer both get an
email. Open it to see the **list of products and how much of each**, the delivery/pickup details,
and the **customer's note**.

A customer can ask for **more than one product in a single request** — for example, coconut oil
*and* sesame oil together. You'll see **every product listed**, each with its own quantity.

### 2. Send a quote
Fill in the **total price**, write a **message** to the customer, and pick how they'll pay:
- **Offline (the normal choice):** you arrange payment and delivery yourself (phone / bank / cash).
- **Pay online:** only appears if online card payment (PayHere) is set up. The customer gets a
  secure link to pay by card, which makes an order automatically.

Click **Send quote** → the customer gets it by email (and WhatsApp once set up).

💡 **Easy way to write your message — "Copy products":** at the top, in the request box, click the
**Copy products** button. It copies the whole list (each product and its quantity) for you. Now
click inside your **message** and paste it (Ctrl-V) — every product lands on its **own line**, so you
can just type a price next to each one. Example after pasting:

```
Coconut Oil — 200 litres
Sesame Oil — 50 cans
```

ℹ️ **About the "unit price" box:** if the request has **only one product**, you'll also see an
optional **unit price** box (like *Rs. 600 per litre*). If the request has **more than one product**,
that box is **hidden on purpose** — one "per unit" price can't be correct for different products. Just
fill in the **total**, and if you want, write the price for each product inside your message.

**Changed your mind on the price?** Just send another quote — the new one **replaces** the old one
(and if it was a pay-online quote, the old payment link stops working). You can re-quote as many
times as you need — **until** you turn it into an order (after that, the quote is locked).

### 3. Turn it into an order ("Convert to order")
Once the customer agrees, click **Convert to order**. First **choose how they'll pay**:
- **Cash on Delivery** (for delivery) or **Pay at Store** (for pickup), or
- **Bank transfer**.

This creates a **normal order** (it starts as *Pending confirmation*), and you then manage it exactly
like any other order on the Orders page.

What happens to the notes and statuses:
- The **customer's note**, your **quote message**, and your **internal note** are **copied onto the
  order** (shown in the order's **"From the bulk request"** box).
- ⚠️ **After converting, add or change notes on the *order*, not here.** On this bulk request page the
  note becomes **read-only** (a small hint points you to the order).
- The request now shows **Accepted**. It changes to **Completed** **by itself** once you mark the
  order **Delivered**.

---

## Subscriptions (`/admin/subscriptions`)

These are **just reorder reminders — no money is ever taken automatically.** A customer who opted in
gets a reminder when it's due, with a one-tap link that fills their cart. Here you can pause, cancel,
or send a reminder by hand.

---

## Other day-to-day areas

- **Customers** (`/admin/customers`) — see their orders, total spent, add private notes,
  block/unblock them, or add a walk-in customer.
- **Coupons** (`/admin/coupons`) — discounts: % off, fixed amount off, or free delivery, with
  limits and dates.
- **Banners** (`/admin/banners`) — the big sliding pictures on the homepage.
- **Delivery zones** (`/admin/delivery-zones`) and **Schedule** (`/admin/schedule`) — delivery
  fees, time slots, how many orders per slot, and closed/holiday days.
- **Reviews** (`/admin/reviews`) — approve, hide, or reply to customer reviews.
- **Loyalty** (`/admin/loyalty`) — points earning/spending rules and manual adjustments.
- **Activity logs** (`/admin/logs`) — a history of everything admins have done.

---

## Settings (`/admin/settings`)

- **Shop info** — name, logo, contact details, opening hours.
- **Tax** — the tax rate, and whether prices already include tax.
- **Subscriptions** — which reminder frequencies you offer.
- **Payment** — your bank details and Cash-on-Delivery limits. (Online card keys for PayHere are set
  up separately by your developer; this tab only shows whether it's switched on.)
- **Notifications** — turn email and WhatsApp on or off, and switch individual messages on/off.
  The WhatsApp message templates are listed here for reference.
- **SEO** — your site title, description, and the picture shown when the site is shared on social
  media.
- **Maintenance mode** — turn this on to show visitors a friendly "back soon" page while you work.
  You (as admin) still see the normal site.

---

## Notifications — quick facts

- **Email** works as soon as the email service (Resend) is set up — it's used for order updates,
  quotes, welcome messages, reorder reminders, and review requests.
- **WhatsApp** is fully built but **off until you set it up.** When you're ready, follow the simple
  guide in **`docs/WHATSAPP_SETUP.md`** — it walks you through it step by step.
- Order-status messages go out a **few minutes after** the change (so quick fixes don't spam the
  customer). The very first "order placed" message is instant.
