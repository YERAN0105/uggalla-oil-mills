# PayHere Setup — Beginner's Guide

This guide is written for someone who has **never used PayHere before**. Take it one step at a
time. You don't need to be technical.

> **Good news:** the website is already fully built for PayHere. You don't have to write any code.
> You only have to (1) get two secret keys from PayHere and (2) paste them into one settings file.
> The moment those keys are in place, the **"Pay Online"** option appears at checkout and the bulk
> quote **"pay online"** link starts working. Until then, the site quietly hides online payment and
> uses Cash on Delivery / Bank Transfer only — nothing breaks.

---

## 1. What PayHere is (in plain words)

PayHere is a Sri Lankan company that **collects card and wallet payments for you**.

How a payment works, simply:

1. Your customer clicks **Pay Online** on your website.
2. Your website sends them to **PayHere's own secure page** to type their card details.
   *(You never touch the card details — that's PayHere's job. Much safer for you.)*
3. The customer pays.
4. PayHere's computer quietly **calls your website back** to say *"this order is paid."*
5. Your website marks the order **Paid** and **Confirmed**, and emails the customer.

There are **two worlds** in PayHere:

| World | What it is | Money | Use it for |
|---|---|---|---|
| **Sandbox** | A pretend/test version | Fake | Testing — always start here |
| **Live** | The real version | Real | Only when you're ready to sell |

👉 **Always set everything up in Sandbox first, test it, and only then switch to Live.**

---

## 2. The two secret keys you need

PayHere will give you **two values**. Think of them like a username and a password for your shop:

- **Merchant ID** — a short number that says *"this payment is for Uggalla Oil Mills."*
- **Merchant Secret** — a long secret code used to prove a payment is genuine.

⚠️ The **Merchant Secret is like a password** — never put it on a public page, never share it, never
put it in the website's code. It only goes in one private settings file (next step). The admin panel
**Settings → Payment** tab will only ever say "PayHere is on/off" — it never shows the keys.

---

## 3. Step-by-step: get your SANDBOX keys (for testing)

1. Open **https://sandbox.payhere.lk** in your browser and **create a free sandbox account**.
   *(This is the test world. It's separate from the real PayHere account.)*
2. Log in to the sandbox dashboard.
3. Find your **Merchant ID** — usually shown on the dashboard home or under a "Settings" / "Account"
   area. Copy it.
4. Find your **Merchant Secret**. It's often under a section like **"Domains & Credentials"**. You
   may need to **add your website's web address (domain) first**, and then PayHere shows a Merchant
   Secret for that domain. Copy it.

> If a menu is named slightly differently than above, don't worry — you're just looking for two
> things: a **Merchant ID** and a **Merchant Secret**. PayHere's official help is at
> https://support.payhere.lk and https://www.payhere.lk/developers/.

Keep these two values somewhere safe for the next step.

---

## 4. Step-by-step: put the keys into the website

The keys go into a private file called **`.env.local`** in the project folder. This file is not
public and is never shared.

1. Open the project folder and find the file **`.env.local`**.
   *(If it doesn't exist yet, make a copy of `.env.example` and rename the copy to `.env.local`.)*
2. Find the PayHere lines and fill them in like this (use **your** values):

   ```
   PAYHERE_MERCHANT_ID=1221234            # the Merchant ID you copied
   PAYHERE_MERCHANT_SECRET=xxxxxxxxxxxx   # the Merchant Secret you copied
   PAYHERE_MODE=sandbox                   # keep "sandbox" while testing
   ```

3. **Save the file.**
4. **Restart the website** (stop `npm run dev`, then start it again).
   ⚠️ This step is important — the website only reads these keys **when it starts up**. If you skip
   the restart, nothing will change.

After restarting, go to checkout — you should now see a **Pay Online** choice. 🎉

---

## 5. The tricky part for local testing: let PayHere reach your computer

This is the **#1 thing beginners miss**, so read it carefully. 🙏

Remember step 1: after the customer pays, **PayHere's computer has to call your website back** to say
"paid." That call goes to this address on your site:

```
/api/payments/payhere/webhook
```

The problem: while you're testing on your own computer, your site lives at
**`http://localhost:3000`**, which only **your** computer can see. PayHere's computer on the internet
**cannot reach `localhost`**. So the payment will go through, but your order may stay stuck on
**"pending"** because the "paid" message never arrives.

You have two ways to fix this:

### Option A (easiest for testing): use a free tunnel called **ngrok**

ngrok gives your `localhost` a **temporary public web address** that PayHere *can* reach.

1. Go to **https://ngrok.com**, make a free account, and install ngrok (follow their short setup —
   it includes pasting one "authtoken" command).
2. With your website running (`npm run dev`), open a new terminal and run:
   ```
   ngrok http 3000
   ```
3. ngrok will show a public address like `https://abcd-1234.ngrok-free.app`. **Copy it.**
4. In **`.env.local`**, set your app's public address to that ngrok address so the payment
   return/confirm links use it:
   ```
   NEXT_PUBLIC_APP_URL=https://abcd-1234.ngrok-free.app
   ```
5. In the **PayHere sandbox dashboard**, add that same ngrok address as an **allowed domain**
   (the "Domains & Credentials" area from step 3).
6. **Save `.env.local` and restart `npm run dev` again.**

Now PayHere can reach your computer, and paid orders will flip to **Paid/Confirmed** automatically.

> Note: the free ngrok address **changes every time you restart ngrok**. If you restart it, redo
> steps 3–6 with the new address.

### Option B: test on the deployed website instead

If your site is already deployed (e.g. on Vercel) with a real public address, you can just test there
— a real public site doesn't need ngrok. Make sure `NEXT_PUBLIC_APP_URL` is your real domain and that
domain is added in PayHere.

---

## 6. Step-by-step: do a test payment

1. Make sure `PAYHERE_MODE=sandbox` and you've restarted the site.
2. On the website, add a normal product (bottle/packet) to the cart and go to checkout.
3. Choose **Pay Online** and continue — you'll land on PayHere's secure sandbox page.
4. Pay using one of **PayHere's sandbox test cards** (fake cards that only work in sandbox). PayHere
   publishes the current list here: **https://support.payhere.lk/api-&-mobile-sdk/sandbox**. A
   commonly documented one is:
   - Card number: **4916217501611292** (Visa)
   - Expiry: any **future** date (e.g. 12/29)
   - CVV: any 3 digits (e.g. 123)
   - If asked for an OTP/PIN, try **123456**

   *(If a card is rejected, just grab a fresh number from the PayHere sandbox page above — they update
   the list from time to time.)*
5. Complete the payment. You should be returned to the **order success** page.
6. Check the order in the **admin panel** → it should now show **Paid** and **Confirmed**, and the
   customer should get a confirmation email (if Resend email is set up).

If the order is stuck on **pending** after a successful payment, the "paid" message didn't reach your
site — re-check **Section 5** (ngrok address, allowed domain, restart).

---

## 7. Going LIVE (real money) — only when you're ready

Do this **after** sandbox testing works end-to-end.

1. Create a **real** (live) PayHere merchant account at **https://www.payhere.lk** and complete the
   **business verification** they ask for. This can take a little time and needs business documents.
2. From the **live** dashboard, get your **live Merchant ID** and **live Merchant Secret**
   (these are different from the sandbox ones).
3. Add your **real website domain** to the live account's allowed domains.
4. In your production environment (e.g. Vercel → Settings → Environment Variables), set:
   ```
   PAYHERE_MERCHANT_ID=<your LIVE merchant id>
   PAYHERE_MERCHANT_SECRET=<your LIVE merchant secret>
   PAYHERE_MODE=live
   NEXT_PUBLIC_APP_URL=https://your-real-domain.lk
   ```
5. Re-deploy / restart so the new settings load.
6. Do **one small real payment** yourself, confirm it shows as **Paid**, then **refund it** from the
   PayHere dashboard. Now you're live. ✅

---

## 8. The website's settings (reference)

You normally only need the first three. The rest have sensible automatic defaults built from
`NEXT_PUBLIC_APP_URL`, so leave them blank unless you have a special reason.

```
PAYHERE_MERCHANT_ID=          # required
PAYHERE_MERCHANT_SECRET=      # required (keep secret!)
PAYHERE_MODE=sandbox          # "sandbox" for testing, "live" for real money

# Optional — only set these if you want to override the automatic URLs:
PAYHERE_NOTIFY_URL=           # defaults to  <your site>/api/payments/payhere/webhook
PAYHERE_RETURN_URL=           # defaults to  <your site>/order-success/<order number>
PAYHERE_CANCEL_URL=           # defaults to  <your site>/checkout/failed/<order number>
```

- **Currency** is fixed to **LKR (Sri Lankan Rupees)**.
- The **webhook** address is `/api/payments/payhere/webhook` — that's the page PayHere calls to
  confirm payment.

---

## 9. Common problems & quick fixes

| What you see | Likely cause | Fix |
|---|---|---|
| No "Pay Online" at checkout | Keys missing, or site not restarted | Add both keys to `.env.local`, then **restart** `npm run dev` |
| Order stays **pending** after paying | PayHere couldn't reach your webhook | On localhost, use **ngrok** (Section 5) and add the ngrok domain in PayHere |
| "Unauthorized payment request" on PayHere | Your domain isn't allowed, or wrong keys/mode | Add your domain in PayHere; check the keys match the mode (sandbox keys ↔ `sandbox`) |
| Paid in sandbox but money never real | That's correct — sandbox is fake money | Switch to `live` keys + `PAYHERE_MODE=live` only when ready |
| Changed `.env.local` but nothing happened | Env is only read at startup | **Restart** the website after every `.env.local` change |

---

## 10. How the flow works (technical reference)

- **Retail checkout:** the order is created with `payment_status = pending`, the customer is sent to
  PayHere's hosted page (`/checkout/pay/[orderNumber]`), and PayHere POSTs the result to the webhook.
- **Webhook** (`/api/payments/payhere/webhook`): verifies the MD5 signature, stores the raw payload
  in the `payments` table, and on success marks the order `paid` + `confirmed` and enqueues the
  (debounced) confirmation email. It always returns HTTP 200; invalid signatures are logged, never
  written.
- **Bulk quote pay-online:** when the admin picks "Pay online", a secure `/quote/[token]` link is
  generated. The customer reviews the quote and pays; on success a tracked order is created and linked
  to the request.
- **Signatures:** both the checkout hash and the webhook `md5sig` follow the PayHere spec and are
  implemented in `lib/payments/payhere.ts`. The merchant secret lives only in the server environment.
