# WhatsApp Setup — Simple, Step-by-Step Guide

This guide turns on WhatsApp messages (order updates, quotes, reminders, etc.). It's written so
anyone can follow it. **Nothing here changes the app's code** — the WhatsApp feature is already
built. It just stays "asleep" until you add the keys and create the message templates.

> 💤 **Right now WhatsApp is OFF.** Every WhatsApp send is skipped (and logged as
> `whatsapp skipped: not configured`). Email still works. When you finish this guide, WhatsApp turns
> on by itself — no code changes.

> ⏰ **Start early!** Meta has to **approve** your message templates, which can take up to ~24 hours.
> Create the templates (Step 4) first, then do the rest while you wait.

---

## Step 1 — Create your Meta WhatsApp account

1. Go to **[developers.facebook.com](https://developers.facebook.com/docs/whatsapp/cloud-api)** and
   sign in (create a Meta/Facebook account if you don't have one).
2. Create a **Meta Business Account**, then a **WhatsApp Business App**.
3. Add a phone number. For testing, Meta gives you a free **test number** — that's fine to start.
4. On the app's **API Setup** page, copy these 3 values (you'll paste them in Step 3):
   - **Phone number ID**
   - **Access token** (use a **permanent** token for production)
   - **WhatsApp Business Account ID**
5. Make up your own secret word for the webhook — anything hard to guess (e.g. `uggalla-wh-9921`).
   This is your **verify token**.

---

## Step 2 — (Production) Point the webhook at your site

This lets Meta tell your site when a message was delivered. (Skip while testing locally.)

1. In the Meta app → **WhatsApp → Configuration → Webhook**, set the callback URL to:
   ```
   https://YOUR-DOMAIN/api/whatsapp/webhook
   ```
2. Set the **Verify token** to the same secret word from Step 1.
3. Subscribe to the **messages** field.

(Your app already answers this webhook — it confirms the secret word and logs delivery results.)

---

## Step 3 — Add the keys to your site

Add these to your `.env.local` (local) **and** to Vercel → Settings → Environment Variables
(production), using the values from Step 1:

```
WHATSAPP_PHONE_NUMBER_ID=...        # Phone number ID
WHATSAPP_ACCESS_TOKEN=...           # Access token
WHATSAPP_BUSINESS_ACCOUNT_ID=...    # WhatsApp Business Account ID
WHATSAPP_VERIFY_TOKEN=...           # your secret word from Step 1
```

Restart the app after adding them.

---

## Step 4 — Create the message templates in Meta (the important part)

WhatsApp does **not** let businesses send free-typed messages — every message must use a
**template** that Meta has approved first. You create these in **Meta → WhatsApp Manager → Message
Templates → Create template**.

For each template below:
1. **Name** — type the exact name from the list (e.g. `order_confirmation`). Names must match exactly.
2. **Category** — pick **Utility** for order/payment updates; pick **Marketing** for `welcome`,
   `subscription_reminder`, and `review_request`.
3. **Language** — **English**.
4. **Body** — copy the example text below. The `{{1}}`, `{{2}}`… are the fill-in blanks; they must
   be in the **same order** shown.
5. When Meta asks for **sample values**, just type any example (e.g. `Nuwandi`, `UOM-20260618-AB12`).
6. Submit and wait for approval (✅ usually within a day).

> The blanks (`{{1}}`, `{{2}}`…) are filled in automatically by the app. You just need the template
> wording and the **right number of blanks in the right order**.

### The templates (copy the Body text)

> 🥥 Replace "Uggalla Oil Mills" with your shop name if different. You can reword freely — just keep
> the same number of `{{ }}` blanks in the same order.

**order_confirmation** — blanks: name, order#, total, date
> Hi {{1}}, thanks for your order {{2}} at Uggalla Oil Mills. Total: {{3}}. Expected date: {{4}}. We'll keep you updated.

**payment_received** — blanks: name, order#
> Hi {{1}}, we've received your payment for order {{2}}. Thank you! — Uggalla Oil Mills

**order_confirmed** — blanks: name, order#
> Hi {{1}}, your order {{2}} is confirmed and we're getting it ready. — Uggalla Oil Mills

**order_preparation** — blanks: name, order#
> Hi {{1}}, we're now preparing your order {{2}}. — Uggalla Oil Mills

**out_for_delivery** — blanks: name, order#, window
> Hi {{1}}, your order {{2}} is out for delivery. Expected: {{3}}. — Uggalla Oil Mills

**ready_for_pickup** — blanks: name, order#, window
> Hi {{1}}, your order {{2}} is ready for pickup. Collect: {{3}}. — Uggalla Oil Mills

**order_delivered** — blanks: name, order#
> Hi {{1}}, your order {{2}} has been delivered. We hope you enjoy it! — Uggalla Oil Mills

**order_cancelled** — blanks: name, order#, reason
> Hi {{1}}, your order {{2}} has been cancelled. Reason: {{3}}. Contact us with any questions. — Uggalla Oil Mills

**order_refunded** — blanks: name, order#
> Hi {{1}}, your order {{2}} has been refunded. The amount returns via your original payment method. — Uggalla Oil Mills

**bank_receipt_rejected** — blanks: name, order#, reason
> Hi {{1}}, we couldn't verify the bank receipt for order {{2}}. Reason: {{3}}. Please re-upload it from your order page. — Uggalla Oil Mills

**review_request** — blanks: name, order#
> Hi {{1}}, how was your order {{2}}? We'd love a quick review — it means a lot to our small mill. — Uggalla Oil Mills

**bulk_request_received** — blanks: name
> Hi {{1}}, we've received your bulk quote request. We'll review it and send you a quote shortly. — Uggalla Oil Mills

**bulk_quote_sent** — blanks: name, product, quantity, total, message, payment_link
> Hi {{1}}, here's your quote for {{2}} ({{3}}): {{4}}. Note: {{5}} Payment: {{6}} — Uggalla Oil Mills

**subscription_reminder** — blanks: name, product, reorder_link
> Hi {{1}}, running low on {{2}}? Reorder in one tap: {{3}} — Uggalla Oil Mills

**welcome** — blanks: name
> Hi {{1}}, welcome to Uggalla Oil Mills! Pure coconut oil, naturally pressed in Padukka.

### Two things the app handles for you (so messages never get rejected)
- For **bulk_quote_sent**:
  - `{{5}} message` is the note you (admin) type when sending a quote. The app **flattens it to one
    line** (WhatsApp forbids line breaks in a blank) and sends `"No additional notes."` if you left
    it empty. So `Note: {{5}}` always reads fine.
  - `{{6}} payment_link` is the pay-online link for online quotes, or the sentence
    `"Our team will arrange payment & delivery."` for offline quotes (it's never empty).
- Every blank is guaranteed **non-empty and single-line** by the app (WhatsApp rejects empty or
  multi-line blanks). Windows fall back to "shortly", dates to "soon", reasons to a polite default.

---

## Step 5 — Turn it on and test

1. In the admin panel: **Settings → Notifications → turn ON "WhatsApp notifications"**.
   (You can also turn individual notifications on/off there.)
2. Make sure your WhatsApp keys (Step 3) are set, and your templates (Step 4) are **approved**.
3. Send yourself a test: place a test order, or send a test quote, to a real WhatsApp number.
4. For production, **verify your business** in Meta and move your number out of test mode (test mode
   can only message a few pre-approved numbers).

That's it — once keys are set, templates are approved, and the toggle is on, every order update,
quote, reminder, and review request goes out on WhatsApp **automatically, alongside email**.

---

## Good to know

- **Phone format:** the app auto-converts Sri Lankan numbers to the form WhatsApp needs
  (`94XXXXXXXXX`). Numbers that aren't valid SL mobiles are simply skipped (no error).
- **Email is separate:** WhatsApp and email both send. If WhatsApp is off or a template is missing,
  email still goes out normally.
- **Where the template list lives in code:** `lib/notifications/whatsapp.ts` (`WHATSAPP_TEMPLATES`).
  The same list is shown for reference in **Admin → Settings → Notifications**. If you ever change a
  template's blanks, keep these in sync.
- **Custom message in WhatsApp:** unlike email (which shows your full, formatted quote note), the
  WhatsApp quote shows your note as a **single line** via `{{5}}`. That's a WhatsApp limitation, not
  a bug.
