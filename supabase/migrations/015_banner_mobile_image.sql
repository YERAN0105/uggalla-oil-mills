-- ─── 015: optional per-banner mobile (portrait) hero image ───────────────────
-- The homepage hero shows a wide image that crops badly on narrow phone screens.
-- This adds an OPTIONAL second image, intended to be a tall/portrait crop of the
-- same photo, shown only on small screens. When NULL the hero falls back to the
-- existing wide `image_url` on every screen — so this change is fully backward
-- compatible and existing banners are untouched.
alter table public.banners
  add column if not exists mobile_image_url text;
