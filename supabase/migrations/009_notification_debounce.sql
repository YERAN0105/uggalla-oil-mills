-- ============================================================
-- Phase 6 (Part A) — Debounced order-status notifications
--   • pending_order_notifications — the debounce buffer (one row per order)
--   • order_notification_ledger   — forward-only "already sent" source of truth
-- Additive only: CREATE TABLE + RLS enable. No DROP, no destructive ALTER.
-- Idempotent — safe to re-run.
--
-- NOTE: This migration is intentionally table-only. The pg_cron schedule and the
-- pg_cron / pg_net extensions are created POST-DEPLOY against the production URL
-- (Supabase cloud cannot reach http://localhost:3000). See docs/POST_DEPLOY_STEPS.md.
-- ============================================================

-- ─── pending_order_notifications (debounce buffer) ───────────────────────────
-- One row per order (UNIQUE order_id). A status change UPSERTs here with
-- dispatch_after = now() + cool-off; a rapid second change overwrites the row —
-- that overwrite IS the debounce. The dispatch route drains due rows.
create table if not exists public.pending_order_notifications (
  order_id       uuid primary key references public.orders(id) on delete cascade,
  target_status  order_status not null,
  dispatch_after timestamptz not null,
  attempts       integer not null default 0,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists pending_order_notifications_due_idx
  on public.pending_order_notifications(dispatch_after);

create trigger set_updated_at before update on public.pending_order_notifications
  for each row execute function public.set_updated_at();

-- ─── order_notification_ledger (forward-only idempotency ledger) ─────────────
-- The source of truth for "this order was already notified about this status on
-- this channel". Checked before every send so retries / re-taps never double-send
-- — this protection holds forever, not just within the cool-off window.
create table if not exists public.order_notification_ledger (
  id        uuid primary key default gen_random_uuid(),
  order_id  uuid not null references public.orders(id) on delete cascade,
  status    order_status not null,
  channel   notification_channel not null,
  sent_at   timestamptz not null default now(),
  unique (order_id, status, channel)
);

create index if not exists order_notification_ledger_order_idx
  on public.order_notification_ledger(order_id);

-- ─── RLS: service-role only, no public policies ──────────────────────────────
-- Both tables are written and read exclusively by the service-role client
-- (lib/supabase/admin.ts) and the dispatch route. Enabling RLS with NO policies
-- means anon/authenticated contexts are fully denied; the service-role key
-- bypasses RLS, which is the only access path we want.
alter table public.pending_order_notifications enable row level security;
alter table public.order_notification_ledger   enable row level security;
