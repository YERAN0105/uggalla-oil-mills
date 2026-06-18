-- 013_orders_quote_note.sql
-- Customer-facing "quote note" on orders created from a bulk quote.
--
-- When a bulk request is converted to an order (admin "Convert to order", or the
-- customer accepting an online quote), we snapshot the LATEST quote message the
-- shop sent — the one with the price breakdown, discount, delivery, etc. — onto
-- the order so it can be shown to the customer on the order page, invoices, and
-- in price emails.
--
-- This column is NULL for normal checkout orders, so they are completely
-- unaffected: every surface only shows the box when the note is present.
--
-- Idempotent: safe to re-run.

alter table public.orders
  add column if not exists quote_note text;

comment on column public.orders.quote_note is
  'Snapshot of the quote message shown to the customer, set only for orders converted from a bulk quote. NULL for normal checkout orders.';
