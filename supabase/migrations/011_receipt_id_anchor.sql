-- ============================================================
-- Phase 6 (Part A) — Anchor receipt notifications to a specific receipt
--
-- Fixes false "apology" emails: previously the correction rule only compared
-- outcome != last_outcome, with no notion of WHICH receipt a decision was about.
-- A fresh approval of a newly re-uploaded receipt looked like a flip-flop on the
-- old one and wrongly apologised. Re-upload inserts a NEW bank_transfer_receipts
-- row (new id) — lib/orders/receipt.ts — so the receipt id is a stable anchor.
--
-- Apology now fires ONLY for an outcome change on the SAME receipt. A decision on
-- a different receipt is always a clean email.
--
-- Additive only: ADD COLUMN (nullable, no FK) — no DROP, no destructive ALTER.
-- Plain uuid (no FK): the column is used for equality only, so a dangling id is
-- harmless and enqueue can never fail on a constraint. Idempotent — safe to re-run.
-- Confined to the receipt track; the order-status track is untouched.
-- ============================================================

-- Which receipt each buffered decision concerns.
alter table public.pending_receipt_notifications
  add column if not exists receipt_id uuid;

-- Which receipt the customer was last notified about (alongside last_outcome).
alter table public.order_receipt_notice
  add column if not exists last_receipt_id uuid;
