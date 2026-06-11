-- ============================================================
-- Migration 005: Remember a delivery zone per saved address
--
-- The delivery zone sets the delivery fee. Storing it on the address lets
-- checkout auto-select the right zone when a customer reuses a saved address,
-- instead of making them pick it again every time.
-- on delete set null: if a zone is removed, addresses keep working (no zone).
-- ============================================================

alter table public.addresses
  add column if not exists delivery_zone_id uuid
    references public.delivery_zones(id) on delete set null;
