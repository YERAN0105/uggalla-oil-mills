# WhatsApp Setup — Beginner's Guide

This guide turns on WhatsApp messages (order updates, quotes, reminders, etc.). It's written for
someone who has **never set up WhatsApp Business before**. Take it one step at a time.

> **Good news:** the website is already fully built for WhatsApp. You don't write any code. The
> feature just stays **asleep** until you (1) add two keys and (2) create the message templates that
> Meta (Facebook) approves. The moment both are ready and you flip the toggle, WhatsApp messages start
> going out **automatically, alongside email**.

> 💤 **Right now WhatsApp is OFF.** Every WhatsApp send is skipped (and quietly logged as
> `whatsapp skipped: not configured`). Email still works perfectly. Nothing is broken.

> ⏰ **Start early!** Meta has to **approve** your message templates, and that can take up to ~24
> hours. So create the templates (Step 5) **first**, then do the rest while you wait.

---

## 1. What this is (in plain words)

WhatsApp (owned by Meta/Facebook) lets businesses send messages to customers through the
**WhatsApp Cloud API**. Your website uses it to send things like *"Your order is out for delivery."*

Two important rules WhatsApp has — know these up front so nothing surprises you:

1. **You can't send free-typed messages.** Every business message must use a **template** — a fixed
   message with fill-in blanks — that **Meta approves first**. (This stops spam.) That's why Step 5
   exists. The blanks (like the customer's name) are filled in by the website automatically.
2. **There's a "test mode" and a "live mode."**
   - **Test mode** (free, instant): you get a free Meta **test number**, but it can only message a few
     phone numbers you add by hand. Perfect for trying it out.
   - **Live mode**: after Meta verifies your business, you can message any customer.

   👉 Start in **test mode**, prove it works, then go live.

---

## 2. The values you'll collect (and which ones really matter)

From Meta you'll see a few values. Here's the honest truth about which the website actually needs:

| Value | Needed to SEND messages? | What it's for |
|---|---|---|
| **Phone number ID** | ✅ **Yes (required)** | Which WhatsApp number sends the messages |
| **Access token** | ✅ **Yes (required)** | The password that lets the site send |
| **Verify token** | ⬜ Optional | Only for delivery-receipt confirmations (Step 6) — a secret word *you make up* |
| **WhatsApp Business Account ID** | ⬜ Not used by the app | Meta shows it to you; you can ignore it for this site |

So to **turn WhatsApp on, you really only need the first two.** The rest is optional polish.

⚠️ The **Access token is like a password** — never put it on a public page or in the code. It goes
only in the private `.env.local` settings file (Step 4).

---

## 3. Step-by-step: create your Meta WhatsApp app and get the two keys

1. Go to **https://developers.facebook.com/docs/whatsapp/cloud-api** and sign in (make a free
   Meta/Facebook account if you don't have one).
2. Create a **Meta Business Account**, then create a **WhatsApp Business App**.
3. Add a phone number. To start, use the free **test number** Meta gives you — that's fine.
4. Open the app's **"API Setup"** (sometimes called "Getting Started") page. Copy these two values:
   - **Phone number ID**
   - **Access token** *(for real use later, switch to a **permanent** token — see Step 7)*
5. While you're there, in test mode add **your own phone number** to the list of allowed recipients
   so you can send yourself test messages.

> If a menu name is slightly different than written here, don't worry — you're just looking for a
> **Phone number ID** and an **Access token**. Meta's help: https://developers.facebook.com.

---

## 4. Step-by-step: put the two keys into the website

The keys go into a private file called **`.env.local`** in the project folder (and, for production,
into Vercel → Settings → Environment Variables).

1. Open the project and find **`.env.local`** (if it doesn't exist, copy `.env.example` and rename the
   copy to `.env.local`).
2. Fill in the two required lines with **your** values:
   ```
   WHATSAPP_PHONE_NUMBER_ID=...     # the Phone number ID you copied
   WHATSAPP_ACCESS_TOKEN=...        # the Access token you copied
   ```
3. **Save the file.**
4. **Restart the website** (stop `npm run dev`, then start it again).
   ⚠️ Important — the website only reads these keys **when it starts up**. Skip the restart and
   nothing changes.

That's enough for the website to be *able* to send. But messages still won't go until your
**templates are approved** (next step) and the **toggle is on** (Step 7).

---

## 5. Step-by-step: create the message templates (the important part)

Remember: WhatsApp only sends **approved templates**. You create them in
**Meta → WhatsApp Manager → Message Templates → Create template**.

For **each** template in the list below:

1. **Name** — type the **exact** name shown (e.g. `order_confirmation`). Names must match exactly, or
   the website can't find them.
2. **Category** — choose **Utility** for order/payment updates; choose **Marketing** for `welcome`,
   `subscription_reminder`, and `review_request`.
3. **Language** — **English**.
4. **Body** — paste the example text below. The `{{1}}`, `{{2}}`… are the **fill-in blanks**; keep
   them **in the same order** shown.
5. If Meta asks for **sample values**, just type any example (e.g. `Nuwandi`, `UOM-20260618-AB12`).
6. Submit, and wait for the green ✅ **Approved** (usually within a day).

> You only supply the wording and the **right number of blanks in the right order**. The website fills
> the blanks in automatically (name, order number, etc.).

### The templates (copy the Body text)

> 🥥 Replace "Uggalla Oil Mills" with your shop name if different. You may reword freely — just keep
> the **same number of `{{ }}` blanks in the same order**.

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

### Two things the website handles for you (so messages never get rejected)

- For **bulk_quote_sent**:
  - `{{5}} message` is the note you (admin) type when sending a quote. The website **flattens it to
    one line** (WhatsApp forbids line breaks in a blank) and sends `"No additional notes."` if you
    left it empty. So `Note: {{5}}` always reads fine.
  - `{{6}} payment_link` is the pay-online link for online quotes, or the sentence
    `"Our team will arrange payment & delivery."` for offline quotes (it's never empty).
- Every blank is guaranteed **non-empty and single-line** by the website (WhatsApp rejects empty or
  multi-line blanks). Delivery windows fall back to "shortly", dates to "soon", reasons to a polite
  default.

---

## 6. (Optional) Delivery confirmations — the webhook

This step is **optional**. It only adds **delivery receipts** (so the site can log "this WhatsApp was
delivered/failed"). **You do NOT need this to send messages.**

> 💡 Unlike PayHere, **sending WhatsApp messages does not need a public address or ngrok.** Your site
> sends *out* to Meta. The webhook is only for Meta to send delivery *status* back, which is just
> nice-to-have logging. Skip it while testing locally if you like.

If you do want it:

1. Make up a secret word (e.g. `uggalla-wh-9921`) and add it to `.env.local`:
   ```
   WHATSAPP_VERIFY_TOKEN=uggalla-wh-9921
   ```
   Restart the site.
2. In the Meta app → **WhatsApp → Configuration → Webhook**, set the **Callback URL** to:
   ```
   https://YOUR-REAL-DOMAIN/api/whatsapp/webhook
   ```
   *(Use your deployed site's address — not `localhost`, which Meta can't reach.)*
3. Set the **Verify token** to the **same** secret word.
4. Subscribe to the **messages** field.

The site already answers this webhook: it checks the secret word and logs delivery results.

---

## 7. Turn it on and test

1. Make sure your two keys (Step 4) are set and the site was **restarted**.
2. Make sure your templates (Step 5) show **Approved** in Meta.
3. In the admin panel: **Settings → Notifications → turn ON "WhatsApp notifications."**
   *(You can also switch individual messages on/off there.)*
4. Send yourself a test: place a test order (or send a test quote) using **your own** WhatsApp number
   — the one you added to the allowed list in Step 3.
5. You should receive the WhatsApp message. 🎉 If you don't, see Section 9.

---

## 8. Going LIVE (message any customer) — when you're ready

In test mode you can only message numbers you added by hand. To message real customers:

1. In Meta, complete **Business Verification** (Meta asks for business details/documents — this can
   take some time).
2. Switch your Access token to a **permanent** token (the quick "temporary" token from Step 3 expires
   after a while). Update `WHATSAPP_ACCESS_TOKEN` in production (Vercel) with the permanent one and
   restart/redeploy.
3. Move your WhatsApp number out of **test mode** (add a real number / production number in Meta).
4. Make sure all templates are **Approved**.
5. Send one real test to a real customer number to confirm, and you're live. ✅

---

## 9. Common problems & quick fixes

| What you see | Likely cause | Fix |
|---|---|---|
| No WhatsApp messages at all | Keys missing, or site not restarted | Add both keys to `.env.local`, then **restart** the site |
| Logs say `whatsapp skipped: not configured` | The two keys aren't set | Set `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN`, restart |
| One type of message never arrives | That template isn't **Approved**, or its name doesn't match | Check the template name is exactly right and shows Approved in Meta |
| Works for your number but not others | You're still in Meta **test mode** | Verify your business and move out of test mode (Step 8) |
| Stopped working after a while | The **temporary** access token expired | Switch to a **permanent** token (Step 8) |
| Template rejected by Meta | Wrong category, or empty/multi-line sample | Use Utility/Marketing as listed; keep the blanks as shown |
| Changed `.env.local` but nothing happened | Env is only read at startup | **Restart** the site after every change |

---

## 10. Good to know (reference)

- **Phone format:** the site auto-converts Sri Lankan numbers to the form WhatsApp needs
  (`94XXXXXXXXX`). Numbers that aren't valid SL mobiles are simply skipped (no error).
- **Email is separate:** WhatsApp and email both send. If WhatsApp is off or a template is missing,
  **email still goes out normally** — customers are never left uninformed.
- **Where the template list lives in code:** `lib/notifications/whatsapp.ts` (`WHATSAPP_TEMPLATES`).
  The same list is shown for reference in **Admin → Settings → Notifications**. If you ever change a
  template's blanks, keep these in sync.
- **The custom quote note:** unlike email (which shows your full, formatted note), the WhatsApp quote
  shows your note as a **single line** via `{{5}}`. That's a WhatsApp limitation, not a bug.
- **Only two keys are required.** `WHATSAPP_VERIFY_TOKEN` is only for the optional delivery webhook,
  and `WHATSAPP_BUSINESS_ACCOUNT_ID` is not used by the site at all.
