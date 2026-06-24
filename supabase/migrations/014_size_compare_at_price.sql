-- ============================================================
-- Migration 014: optional "original price" for sale display
--
-- Adds compare_at_price to product_sizes. The real selling price
-- stays in `price`; compare_at_price is the higher "was" price shown
-- struck through on the storefront, with the discount % computed from
-- the two. It is display-only — cart/checkout always charge `price`.
--
-- A size is "on sale" only when compare_at_price IS NOT NULL AND
-- compare_at_price > price. The CHECK enforces that at the DB level;
-- the admin form validates it first with a friendly message.
-- base_price (migration 004) keeps tracking MIN(price), untouched.
-- ============================================================

ALTER TABLE public.product_sizes
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(12,2);

ALTER TABLE public.product_sizes
  DROP CONSTRAINT IF EXISTS product_sizes_compare_at_price_check;

ALTER TABLE public.product_sizes
  ADD CONSTRAINT product_sizes_compare_at_price_check
  CHECK (compare_at_price IS NULL OR compare_at_price > price);
