-- ============================================================
-- Phase 5 — Admin panel additions
--   • Storage buckets for banners + site assets (logo / OG image)
--   • Public read + admin-managed write policies for those buckets
-- Idempotent — safe to re-run.
-- ============================================================

-- Admin-only free-text notes on a customer profile.
alter table public.users add column if not exists admin_notes text;

insert into storage.buckets (id, name, public)
values
  ('banner-images', 'banner-images', true),
  ('site-assets',   'site-assets',   true)
on conflict (id) do nothing;

-- ─── banner-images: public read, admin write ────────────────────────────────
do $$ begin
  create policy "Public can read banner images"
    on storage.objects for select using (bucket_id = 'banner-images');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins manage banner images"
    on storage.objects for all using (bucket_id = 'banner-images' and public.is_admin());
exception when duplicate_object then null; end $$;

-- ─── site-assets: public read, admin write ──────────────────────────────────
do $$ begin
  create policy "Public can read site assets"
    on storage.objects for select using (bucket_id = 'site-assets');
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Admins manage site assets"
    on storage.objects for all using (bucket_id = 'site-assets' and public.is_admin());
exception when duplicate_object then null; end $$;
