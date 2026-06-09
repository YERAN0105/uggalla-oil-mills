-- ============================================================
-- Supabase Storage Buckets
-- Run via Supabase Dashboard > Storage, or via the CLI.
-- ============================================================

-- Create buckets (run these via supabase CLI or dashboard SQL editor)
insert into storage.buckets (id, name, public)
values
  ('product-images',    'product-images',    true),
  ('brand-images',      'brand-images',      true),
  ('category-images',   'category-images',   true),
  ('payment-receipts',  'payment-receipts',  false),
  ('bulk-attachments',  'bulk-attachments',  false),
  ('review-images',     'review-images',     true)
on conflict (id) do nothing;

-- ─── Storage Policies ────────────────────────────────────────────────────────

-- product-images: public read, admin write
create policy "Public can read product images"
  on storage.objects for select using (bucket_id = 'product-images');

create policy "Admins can upload product images"
  on storage.objects for insert with check (
    bucket_id = 'product-images' and public.is_admin()
  );

create policy "Admins can update product images"
  on storage.objects for update using (
    bucket_id = 'product-images' and public.is_admin()
  );

create policy "Admins can delete product images"
  on storage.objects for delete using (
    bucket_id = 'product-images' and public.is_admin()
  );

-- brand-images: public read, admin write
create policy "Public can read brand images"
  on storage.objects for select using (bucket_id = 'brand-images');

create policy "Admins manage brand images"
  on storage.objects for all using (bucket_id = 'brand-images' and public.is_admin());

-- category-images: public read, admin write
create policy "Public can read category images"
  on storage.objects for select using (bucket_id = 'category-images');

create policy "Admins manage category images"
  on storage.objects for all using (bucket_id = 'category-images' and public.is_admin());

-- payment-receipts: owner + admin only
create policy "Users can upload own payment receipts"
  on storage.objects for insert with check (
    bucket_id = 'payment-receipts' and auth.uid() is not null
  );

create policy "Users can read own receipts"
  on storage.objects for select using (
    bucket_id = 'payment-receipts' and (
      auth.uid()::text = (storage.foldername(name))[1]
      or public.is_admin()
    )
  );

create policy "Admins manage all payment receipts"
  on storage.objects for all using (
    bucket_id = 'payment-receipts' and public.is_admin()
  );

-- bulk-attachments: owner + admin
create policy "Users can upload bulk attachments"
  on storage.objects for insert with check (
    bucket_id = 'bulk-attachments' and auth.uid() is not null
  );

create policy "Admins manage bulk attachments"
  on storage.objects for all using (
    bucket_id = 'bulk-attachments' and public.is_admin()
  );

-- review-images: public read, owner write, admin manage
create policy "Public can read review images"
  on storage.objects for select using (bucket_id = 'review-images');

create policy "Users can upload review images"
  on storage.objects for insert with check (
    bucket_id = 'review-images' and auth.uid() is not null
  );

create policy "Admins manage review images"
  on storage.objects for all using (
    bucket_id = 'review-images' and public.is_admin()
  );
