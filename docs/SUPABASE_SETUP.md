# Supabase Setup — Beginner's Guide

This guide gets your website's **database** working. It's written for someone who has **never used
Supabase before**. Take it one step at a time.

> **Supabase is the only service the website truly needs.** PayHere, WhatsApp, and email are all
> optional extras. If Supabase is set up correctly, the site runs. So this is the most important
> setup guide — do this one first.

---

## 1. What Supabase is (in plain words)

Supabase is a free service that gives your website three things in one, all living safely in the
cloud:

1. **A database** — where everything is stored (products, orders, customers, settings…).
2. **Logins (Auth)** — sign up / log in for customers and for you (the admin).
3. **File storage** — where uploaded pictures live (product photos, banners, receipts…).

You don't install a database on your computer. You create a Supabase **project** online, and your
website talks to it over the internet using a few secret keys.

Think of it like renting a fully-built, secure warehouse instead of building your own. You just need
the **keys** to the warehouse, and you need to **set up the shelves** (run a few setup files). That's
what this guide does.

---

## 2. Step-by-step: create your Supabase project

1. Go to **https://supabase.com** and **sign up** (free).
2. Click **New project**.
3. Pick a **region close to Sri Lanka** (e.g. **Singapore**) so the site is fast for your customers.
4. Choose a **strong database password** and **save it somewhere safe** — you'll rarely need it, but
   you can't easily recover it later.
5. Click create and wait a minute or two while Supabase builds your project.

---

## 3. Step-by-step: get your 3 keys

1. In your Supabase project, open **Settings → API**.
2. Copy these three values. Here's what each one is, in plain words:

   | Supabase calls it | Put it in `.env.local` as | What it is |
   |---|---|---|
   | **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` | Your warehouse's address |
   | **anon public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A safe "visitor" key (OK for the browser) |
   | **service_role** key | `SUPABASE_SERVICE_ROLE_KEY` | The **master key** — full power |

⚠️ The **service_role key is the master key** — it can do anything and bypasses all security. **Never**
put it in public code, never show it in the browser, never share it. It goes only in the private
`.env.local` file (next step) and is used only by the server.

---

## 4. Step-by-step: put the keys into the website

1. In the project folder, find the file **`.env.local`** (if it doesn't exist, copy `.env.example`
   and rename the copy to `.env.local`).
2. Fill in the Supabase lines, plus the basic app lines:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ....
   SUPABASE_SERVICE_ROLE_KEY=eyJ....

   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_BRAND_NAME=Uggalla Oil Mills
   NEXT_PUBLIC_CURRENCY=LKR
   ```
3. **Save the file.**
4. **Restart the website** (stop `npm run dev`, then start it again).
   ⚠️ The website only reads these keys **when it starts up**, so the restart matters.

---

## 5. Step-by-step: build the database (run the "migrations")

A **migration** is just a setup file (a recipe) that tells the database what tables and rules to
create. Your project has a set of them in the folder **`supabase/migrations/`**. You run them
**in order**, one by one.

> 🧱 Think of each migration as one instruction in building your warehouse shelves. They must be done
> **in order** (you can't put boxes on shelves that don't exist yet). They're written to be **safe to
> re-run**, so if you're unsure whether one ran, running it again won't hurt.

**How to run one:**

1. In Supabase, open **SQL Editor** (left menu) → **New query**.
2. Open the migration file from `supabase/migrations/` in your editor, **copy all of its text**, and
   **paste it** into the Supabase SQL box.
3. Click **Run**.
4. Repeat for the **next** file.

**Run them in this exact order — 001 first, 013 last:**

```
001_initial_schema.sql          ← all the tables
002_rls_policies.sql            ← security rules on every table
003_storage_buckets.sql         ← folders for uploaded images
004_min_price_trigger.sql       ← keeps a product's "from" price = its cheapest size
005_address_delivery_zone.sql
006_email_has_account.sql
007_phase4_account.sql
008_phase5_admin.sql            ← admin notes + banner/site image folders
009_notification_debounce.sql   ← order-notification system (part 1)
010_receipt_notifications.sql   ← order-notification system (part 2)
011_receipt_id_anchor.sql       ← order-notification system (part 3)
012_bulk_request_items.sql      ← lets a bulk request hold MULTIPLE products
013_orders_quote_note.sql       ← shows the quote note on quote-converted orders
```

> ✅ When you finish 013, all the shelves are built. (If you add new features later, there may be
> higher-numbered files — always run any new ones, in order, after the ones already applied.)

---

## 6. Step-by-step: add the sample data (the "seed")

Now put some starting data on the shelves — brands, categories, delivery zones, settings, and a few
sample products. These are called **seed** files. Run them the same way (SQL Editor → paste → Run),
and **in this order**:

1. **`supabase/seed.sql`** — brands, categories, delivery zones, time slots, shop settings, bank
   details.
2. **`supabase/seed-products.sql`** — 9 sample products.

> ⚠️ Run **`seed.sql` first**, then **`seed-products.sql`**. The products rely on the brands and
> categories that `seed.sql` creates, so the order matters. Both are safe to re-run.

---

## 7. Step-by-step: create YOUR admin login

This makes the account you'll use to log into the admin panel.

1. In **`.env.local`**, set the admin email and password you want:
   ```
   ADMIN_SEED_EMAIL=you@example.com
   ADMIN_SEED_PASSWORD=choose-a-strong-password
   ```
2. In a terminal, run:
   ```
   npm run seed-admin
   ```
3. This creates the login **and** marks it as an admin. Now you can sign in at **/login** and open
   **/admin**.

---

## 8. Login (Auth) settings

1. **Email confirmation (for testing):** While building/testing, you can turn **off** "Confirm email"
   so new signups work without checking an inbox. In Supabase: **Authentication → Providers → Email**.
   ⚠️ **Turn it back ON before you launch** for real customers.
2. **Site URL (for production):** In **Authentication → URL Configuration**, set the **Site URL** and
   redirect URLs to your **real website address** once deployed (so login links point to the right
   place).
3. **Google login (optional):** If you want a "Continue with Google" button:
   - Set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true` and add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in
     `.env.local`.
   - In Google's console, add `<your site>/auth/callback` as an allowed redirect URL.
   - Email/password login **always works** even without Google, so this is purely optional.

---

## 9. File storage (good to know)

Migrations `003` and `008` automatically create the image "folders" (buckets):
`product-images`, `brand-images`, `category-images`, `payment-receipts`, `bulk-attachments`,
`review-images`, `banner-images`, `site-assets`.

You don't create these by hand — running those migrations does it. Admin image uploads happen straight
from the browser, and the security rules only let signed-in admins upload.

---

## 10. After you deploy: the notifications timer

One piece can only be set up **after** your site is live on the internet (because Supabase's servers
can't reach your computer's `localhost`): the **minute-by-minute notification dispatcher**.

When you deploy, follow **[`POST_DEPLOY_STEPS.md`](POST_DEPLOY_STEPS.md)**: it walks you through
turning on the `pg_cron` and `pg_net` extensions, setting `CRON_SECRET`, and pasting one scheduling
command. Until then, order-status emails can still be sent by hand (also covered in that file). This
doesn't affect the rest of the site.

---

## 11. Backups

The Supabase free tier includes **automatic daily backups**. Before you launch for real, check your
plan's backup retention, and consider **point-in-time recovery** (on paid tiers) so you can rewind to
any moment if something goes wrong.

---

## 12. Quick checklist

- [ ] Created the Supabase project (region near Sri Lanka, password saved)
- [ ] Copied the 3 keys into `.env.local` and **restarted** the site
- [ ] Ran migrations **001 → 013** in order in the SQL Editor
- [ ] Ran `seed.sql`, then `seed-products.sql`
- [ ] Ran `npm run seed-admin` and logged in at `/admin`
- [ ] (Before launch) turned email confirmation back ON and set the production Site URL

---

## 13. Common problems & quick fixes

| What you see | Likely cause | Fix |
|---|---|---|
| Site won't start / "Missing environment variables" | Supabase keys not in `.env.local` | Add all 3 keys, then **restart** |
| Changed `.env.local` but nothing changed | Env is only read at startup | **Restart** the site |
| A migration errors about a missing table/column | You ran them out of order | Run them strictly **001 → 013** in order |
| `seed-products.sql` fails with a foreign-key error | You ran it before `seed.sql` | Run `seed.sql` first, then `seed-products.sql` |
| Can't log into `/admin` | Admin user not created, or not an admin | Run `npm run seed-admin` with the env email/password set |
| Signup says "confirm your email" during testing | Email confirmation is on | Turn off "Confirm email" in Auth → Providers (re-enable before launch) |

---

## 14. Good to know (technical reference)

- **Security on every table (RLS):** every table has a security guard (Row Level Security). Customers
  can only touch their own data; admin/server actions use the **service_role** master key and are
  authorized in the website's code instead. A helper function `public.is_admin()` is used throughout —
  don't bypass it.
- **Don't hand-edit a retail product's "from" price:** migration `004` keeps `products.base_price`
  equal to the cheapest size automatically. (Bulk products, which have no sizes, are the exception.)
- **The 3 required keys** are the only must-haves. Everything else in `.env.local` (PayHere, Resend,
  WhatsApp, Google, analytics) is optional and can be added later.
