# Pending Post-Deploy Steps

> Things that **cannot** be done from local dev and must be completed **after the
> Vercel deployment is live**. A future session re-reading the project should treat
> this file as the to-do list for "what's left after deploy."

---

## 1. Debounced order-status notifications — schedule the `pg_cron` dispatcher

**Context.** The debounced notification system (migration `009_notification_debounce.sql`,
the buffer table, the ledger, and the dispatch route at
`app/api/cron/dispatch-notifications`) is **already built and works locally**. The
only deferred piece is the **scheduler**, because Supabase's `pg_cron` runs inside
Supabase's cloud and calls our dispatch route over HTTP via `pg_net` — and Supabase
**cannot reach `http://localhost:3000`**. So the schedule can only point at the
deployed production URL.

### Checklist

- [ ] **Run migration 009** in the Supabase SQL editor (if not already applied):
      `supabase/migrations/009_notification_debounce.sql`. It is additive (two
      tables + RLS) and idempotent.
- [ ] **Set `CRON_SECRET`** to the same strong random value in **both** places:
  - Vercel → Project → Settings → Environment Variables → `CRON_SECRET`
  - Supabase → this value is embedded in the cron SQL below (or, better, stored in
    Supabase Vault and read with `vault.decrypted_secrets`).
- [ ] **Enable the extensions** in the Supabase dashboard
      (Database → Extensions): enable **`pg_cron`** and **`pg_net`**.
      *(Deliberately NOT in migration 009 — they're only needed for this cron.)*
- [ ] **Create the schedule** by running the SQL below, with
      `<PRODUCTION_DISPATCH_URL>` and `<CRON_SECRET>` filled in.
- [ ] **Place a real test order**, change its status, wait ~3–4 minutes, and confirm
      the customer notification email fires (and that rapid re-taps within the
      cool-off collapse to a single email).
- [ ] Confirm `RESEND_API_KEY` + `RESEND_FROM_EMAIL` are set in Vercel (otherwise
      email is gated off and `notify()` reports `skipped`).

### Scheduling SQL (run once, post-deploy)

```sql
-- <PRODUCTION_DISPATCH_URL> e.g. https://uggallaoilmills.lk/api/cron/dispatch-notifications
-- <CRON_SECRET>             must match the CRON_SECRET set in Vercel.

select cron.schedule(
  'dispatch-order-notifications',   -- job name (unique)
  '* * * * *',                      -- every minute
  $$
  -- Free-tier conscious: only make the HTTP call when at least one row is due.
  -- Idle minutes do nothing.
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

To inspect or remove the job later:

```sql
select * from cron.job;                                  -- list jobs
select cron.unschedule('dispatch-order-notifications');  -- remove this job
```

### Verifying / testing the dispatcher BY HAND (works locally too, no cron)

The route is just a secured POST endpoint, so you can drive the full logic —
debounce, forward-only, idempotency, retry, safe-delete — without the cron:

```bash
# PowerShell (local dev)
curl -X POST http://localhost:3000/api/cron/dispatch-notifications `
  -H "Authorization: Bearer $env:CRON_SECRET"

# bash
curl -X POST http://localhost:3000/api/cron/dispatch-notifications \
  -H "Authorization: Bearer $CRON_SECRET"
```

The response reports `{ processed, sent, skipped, failed }`. Suggested manual checks:

- **Debounce:** change a status, then change it again within 3 min → only one row in
  `pending_order_notifications`; one email after the cool-off.
- **Forward-only:** advance to `confirmed` (dispatch), then move back / re-enter →
  no further email.
- **Idempotency:** run the curl twice → the second run sends nothing (ledger guards).
- **Retry + cap:** with a bad `RESEND_API_KEY`, the row's `attempts` increments each
  tick and the row survives until `attempts = 5`, then it's parked.
- **Safe delete:** re-enqueue a row mid-window → the old `dispatch_after` no longer
  matches, so the conditional delete won't wipe the freshly scheduled row.

---

## 2. (Other future post-deploy items can be appended here.)
