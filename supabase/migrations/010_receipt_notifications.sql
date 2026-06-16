-- ============================================================
-- Phase 6 (Part A) — Bank-receipt accept/reject notifications
--   • pending_receipt_notifications — debounce buffer for receipt decisions
--   • order_receipt_notice          — "last outcome the customer was told"
-- Additive only: CREATE TABLE + RLS enable. No DROP, no destructive ALTER.
-- Idempotent — safe to re-run.
--
-- A SEPARATE track from the order-status buffer (009) on purpose: receipt
-- accept/reject is a two-way toggle, not the one-way status ladder, so it can't
-- share the status forward-only rules or the same one-row-per-order buffer
-- (mixing them would let a receipt event overwrite a pending status email).
--
-- The pg_cron schedule that drives the dispatch route is created POST-DEPLOY —
-- see docs/POST_DEPLOY_STEPS.md.
-- ============================================================

-- ─── pending_receipt_notifications (debounce buffer) ─────────────────────────
-- One row per order (UNIQUE order_id). Admin accept/reject/undo UPSERTs here with
-- dispatch_after = now() + cool-off; a rapid follow-up overwrites the row — that
-- overwrite IS the debounce, so quick approve→undo→reject churn collapses to the
-- single final action and the customer never sees the intermediate emails.
--   outcome: 'approved' | 'rejected' | 'reverted' ('reverted' = undo → drop, no send)
create table if not exists public.pending_receipt_notifications (
  order_id       uuid primary key references public.orders(id) on delete cascade,
  outcome        text not null check (outcome in ('approved', 'rejected', 'reverted')),
  dispatch_after timestamptz not null,
  attempts       integer not null default 0,
  last_error     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists pending_receipt_notifications_due_idx
  on public.pending_receipt_notifications(dispatch_after);

create trigger set_updated_at before update on public.pending_receipt_notifications
  for each row execute function public.set_updated_at();

-- ─── order_receipt_notice (last outcome the customer was notified about) ──────
-- Drives both dedupe and the correction/apology rule:
--   • same as last  → send nothing
--   • first ever    → clean email (no apology)
--   • differs       → correction email WITH apology
create table if not exists public.order_receipt_notice (
  order_id    uuid primary key references public.orders(id) on delete cascade,
  last_outcome text not null check (last_outcome in ('approved', 'rejected')),
  notified_at timestamptz not null default now()
);

-- ─── RLS: service-role only, no public policies ──────────────────────────────
alter table public.pending_receipt_notifications enable row level security;
alter table public.order_receipt_notice          enable row level security;
