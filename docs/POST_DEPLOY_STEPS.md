# After You Deploy — Beginner's Guide

This is your **to-do list for after the website is live on the internet** (e.g. on Vercel). A few
things simply can't be done from your own computer, because outside services (Supabase, PayHere,
WhatsApp) can't reach `http://localhost:3000` — they need a real public web address.

> Work through this top to bottom. Most of it is "set a value and save." Only **Section 4** has a
> piece of database SQL to paste, and I'll walk you through it.

---

## ✅ The quick checklist

- [ ] **1.** Put all your settings (env vars) into your host (Vercel), with your **real domain**
- [ ] **2.** Point Supabase **logins** at your real domain, and turn **email confirmation back ON**
- [ ] **3.** Make **email** send to real customers (verify your domain in Resend) — *optional but
      recommended*
- [ ] **4.** Switch on the **notifications timer** (the `pg_cron` dispatcher) — *the one SQL step*
- [ ] **5.** Confirm the **two daily helpers** (reorder reminders + review requests) are running
- [ ] **6.** Turn on **PayHere** for real card payments — *optional* (see `PAYHERE_SETUP.md`)
- [ ] **7.** Turn on **WhatsApp** for real customers — *optional* (see `WHATSAPP_SETUP.md`)
- [ ] **8.** Do one **real test order** from start to finish

> 🗄️ **First time on a brand-new database?** If your live site uses a **new/separate** Supabase
> project (not the one you tested with), set the database up first — run migrations `001 → 013` and
> the seed files. Full steps: **`SUPABASE_SETUP.md`**.

---

## 1. Put your settings into the host (Vercel)

On your computer the settings live in `.env.local`. On the live site they live in your host's
settings instead — for Vercel: **Project → Settings → Environment Variables**.

Add the same values you used locally, **but with your real domain**, especially:

```
NEXT_PUBLIC_SUPABASE_URL=...           # required
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      # required
SUPABASE_SERVICE_ROLE_KEY=...          # required (secret)
NEXT_PUBLIC_APP_URL=https://your-real-domain.lk   # ← your real address, not localhost
NEXT_PUBLIC_BRAND_NAME=Uggalla Oil Mills
NEXT_PUBLIC_CURRENCY=LKR
CRON_SECRET=make-up-a-long-random-secret           # needed for Sections 4 & 5
```

Add the optional ones (Resend, PayHere, WhatsApp) when you do those sections.

> ⚠️ After adding or changing any value here, **re-deploy** the site so it picks them up (same idea as
> restarting `npm run dev` locally).

---

## 2. Point logins at your real domain

So that sign-up / reset links go to the right place:

1. In Supabase → **Authentication → URL Configuration**, set the **Site URL** to your real domain, and
   add it to the allowed **redirect URLs**.
2. In Supabase → **Authentication → Providers → Email**, **turn email confirmation back ON**.
   *(You may have turned it off for testing — real customers should confirm their email.)*

---

## 3. Make email reach real customers (recommended)

If you used Resend in **test/sandbox** mode, it only sends to **your own** email address. To email
real customers:

1. In Resend, **verify your domain** (they show you the DNS records to add).
2. Set, in your host's settings:
   ```
   RESEND_API_KEY=...                         # your live key
   RESEND_FROM_EMAIL=orders@your-real-domain.lk   # an address on your verified domain
   ```
3. Re-deploy. Now order emails, quotes, and reminders go to real inboxes.

*(If you skip this, the site still works — it just won't send email until Resend is set up.)*

---

## 4. Switch on the notifications timer (the dispatcher)

**What this is, simply:** when you change an order's status, the customer message isn't sent
instantly — it waits a few minutes (so a wrong tap can be fixed) and then a tiny background job sends
it. That background job needs a **timer** to run every minute. On the live site, Supabase runs that
timer for you — but you have to switch it on **once**.

### Do this once, after deploy:

1. **Database setup file is applied.** Make sure migration `009_notification_debounce.sql` has been
   run (it's part of the `001 → 013` set in `SUPABASE_SETUP.md`).
2. **Set `CRON_SECRET`** (a long random secret) in **two** places so they match:
   - Your host (Vercel → Environment Variables) — you did this in Section 1.
   - Inside the SQL below (you'll paste it in).
3. **Turn on two database add-ons.** In Supabase → **Database → Extensions**, enable **`pg_cron`** and
   **`pg_net`**.
4. **Create the timer.** In Supabase → **SQL Editor**, paste the SQL below — first replacing
   `<PRODUCTION_DISPATCH_URL>` with your real webhook address and `<CRON_SECRET>` with your secret —
   then click **Run**.

```sql
-- <PRODUCTION_DISPATCH_URL> e.g. https://your-real-domain.lk/api/cron/dispatch-notifications
-- <CRON_SECRET>             must match the CRON_SECRET set in your host (Vercel).

select cron.schedule(
  'dispatch-order-notifications',   -- job name (unique)
  '* * * * *',                      -- every minute
  $$
  -- Only makes the call when at least one message is actually waiting,
  -- so idle minutes cost nothing.
  select
    case when exists (
      select 1 from public.pending_order_notifications
      where dispatch_after <= now() and attempts < 5
    )
    then net.http_post(
      url     := '<PRODUCTION_DISPATCH_URL>',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <CRON_SECRET>'
      ),
      body    := '{}'::jsonb
    )
    end;
  $$
);
```

To check or remove the timer later:

```sql
select * from cron.job;                                   -- list timers
select cron.unschedule('dispatch-order-notifications');   -- remove this one
```

### Want to test the dispatcher by hand (works locally too)?

The dispatcher is just a secured web address you can call yourself. Change an order's status, wait
~3 minutes, then run (replace the secret with your `CRON_SECRET`):

```bash
# Windows PowerShell
curl.exe -X POST https://your-real-domain.lk/api/cron/dispatch-notifications -H "Authorization: Bearer YOUR_CRON_SECRET"

# (Local testing: use http://localhost:3000/... instead)
```

It replies `{ processed, sent, skipped, failed }`. If you see `sent: 1`, the email went out. (If
`sent: 0`, the 3-minute wait may not be up yet — try again shortly.)

---

## 5. The two daily helpers (reminders + reviews)

The site also sends, once a day:
- **Reorder reminders** (for customers who set up a reorder reminder), and
- **Review requests** (2 days after an order is delivered).

On Vercel these run **automatically** — the daily schedule is already built into the project
(`vercel.json`). You just need **`CRON_SECRET` set in Vercel** (Section 1), and Vercel takes care of
running them on time. Nothing else to do.

---

## 6. Turn on PayHere (real card payments) — optional

Online card payments are off until you add PayHere keys. The **easiest time is now, after deploy**,
because PayHere needs your real public address to confirm payments. Full beginner steps:
**`PAYHERE_SETUP.md`** (Section 7, "Going LIVE").

In short: add your **live** `PAYHERE_MERCHANT_ID` + `PAYHERE_MERCHANT_SECRET`, set
`PAYHERE_MODE=live`, add your domain in the PayHere dashboard, re-deploy, then do one small real
payment and refund it.

*(Until you do this, customers pay by Cash on Delivery / Bank Transfer — nothing breaks.)*

---

## 7. Turn on WhatsApp (real customers) — optional

WhatsApp messages are off until you add the keys and get your templates approved, and move your
number out of Meta's "test mode." Full beginner steps: **`WHATSAPP_SETUP.md`** (Section 8, "Going
LIVE").

*(Until you do this, WhatsApp sends are skipped and email still goes out normally.)*

---

## 8. Do one real test order

Finally, act like a customer on the live site:

1. Place a small order (Cash on Delivery is easiest).
2. Check you (and the customer email) received the **"order placed"** email.
3. In the admin, move the order to **Confirmed**, wait ~3 minutes, and confirm the status email
   arrives (proving Section 4 works).
4. If PayHere/WhatsApp are on, test those too.

When that works end-to-end, you're fully live. 🎉

---

## Notes for the future

- New features may add higher-numbered database files (e.g. `014_…`). When you pull an update, run any
  new migration files in order in the Supabase SQL Editor (see `SUPABASE_SETUP.md`).
- Add more post-deploy items to this file as the project grows.
