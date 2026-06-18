-- 012_bulk_request_items.sql
-- Multi-product bulk requests.
--
-- A bulk request can now carry MULTIPLE product lines (a restaurant ordering
-- 200 L coconut oil + 50 cans sesame oil in one request). The line items live in
-- a new `items` JSONB array, each entry: { product_id, name, quantity, unit }.
--
-- The legacy scalar columns (product_id, quantity, unit) are KEPT and continue to
-- mirror the FIRST line, so existing reads (admin search, dashboard counts, the
-- product FK) keep working unchanged. New code reads `items`.
--
-- Idempotent: safe to re-run.

alter table public.bulk_requests
  add column if not exists items jsonb not null default '[]'::jsonb;

-- Backfill existing single-product rows into the items array.
--   1) rows with a known product → snapshot its current name.
update public.bulk_requests br
set items = jsonb_build_array(
  jsonb_build_object(
    'product_id', br.product_id,
    'name', p.name,
    'quantity', br.quantity,
    'unit', br.unit
  )
)
from public.products p
where (br.items is null or br.items = '[]'::jsonb)
  and br.product_id is not null
  and br.product_id = p.id;

--   2) rows with no product (loose / unspecified) → name = null.
update public.bulk_requests
set items = jsonb_build_array(
  jsonb_build_object(
    'product_id', null,
    'name', null,
    'quantity', quantity,
    'unit', unit
  )
)
where (items is null or items = '[]'::jsonb);
