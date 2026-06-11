-- ============================================================
-- Migration 007: Phase 4 — Customer Account
--
-- Small additions the account experience needs on top of the Phase 1 schema:
--   1. users.deleted_at — soft-delete marker for account deletion (we never hard
--      delete a customer that has orders/reviews referencing them).
--   2. reviews: one review per purchased order item (per user, enforced by the
--      order_item belonging to a single order/user). A partial unique index keeps
--      product-level reviews (order_item_id null, e.g. admin/import) unconstrained.
--   3. reviews: allow a customer to DELETE their own review (Phase 1 only granted
--      select/insert/update-pending to owners; the account Reviews page needs delete).
-- Idempotent — safe to re-run.
-- ============================================================

-- 1. Soft-delete marker for accounts.
alter table public.users
  add column if not exists deleted_at timestamptz;

-- 2. One review per order item.
create unique index if not exists reviews_order_item_unique
  on public.reviews(order_item_id)
  where order_item_id is not null;

-- 3. Customers may delete their own reviews (any status).
drop policy if exists "Users can delete own reviews" on public.reviews;
create policy "Users can delete own reviews"
  on public.reviews for delete using (user_id = auth.uid());
