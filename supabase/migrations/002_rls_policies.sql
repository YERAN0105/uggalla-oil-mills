-- ============================================================
-- Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.addresses enable row level security;
alter table public.brands enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_sizes enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.time_slots enable row level security;
alter table public.holidays enable row level security;
alter table public.coupons enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.bank_transfer_receipts enable row level security;
alter table public.payments enable row level security;
alter table public.coupon_usage enable row level security;
alter table public.bulk_requests enable row level security;
alter table public.bulk_request_attachments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.reviews enable row level security;
alter table public.review_images enable row level security;
alter table public.wishlist enable row level security;
alter table public.loyalty_transactions enable row level security;
alter table public.banners enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.notification_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.settings enable row level security;

-- Helper function to check admin role
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── users ───────────────────────────────────────────────────────────────────
create policy "Users can read own profile"
  on public.users for select using (id = auth.uid());

create policy "Users can update own profile"
  on public.users for update using (id = auth.uid())
  with check (id = auth.uid() and role = 'customer'); -- cannot self-promote to admin

create policy "Admins can do anything with users"
  on public.users for all using (public.is_admin());

-- ─── addresses ───────────────────────────────────────────────────────────────
create policy "Users manage own addresses"
  on public.addresses for all using (user_id = auth.uid());

create policy "Admins read all addresses"
  on public.addresses for select using (public.is_admin());

-- ─── brands ──────────────────────────────────────────────────────────────────
create policy "Public can read active brands"
  on public.brands for select using (is_active = true);

create policy "Admins manage brands"
  on public.brands for all using (public.is_admin());

-- ─── categories ──────────────────────────────────────────────────────────────
create policy "Public can read active categories"
  on public.categories for select using (is_active = true);

create policy "Admins manage categories"
  on public.categories for all using (public.is_admin());

-- ─── products ────────────────────────────────────────────────────────────────
create policy "Public can read published products"
  on public.products for select using (is_published = true and deleted_at is null);

create policy "Admins manage products"
  on public.products for all using (public.is_admin());

-- ─── product_images ──────────────────────────────────────────────────────────
create policy "Public can read product images for published products"
  on public.product_images for select using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published = true and p.deleted_at is null)
  );

create policy "Admins manage product images"
  on public.product_images for all using (public.is_admin());

-- ─── product_sizes ───────────────────────────────────────────────────────────
create policy "Public can read sizes for published products"
  on public.product_sizes for select using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published = true and p.deleted_at is null)
  );

create policy "Admins manage product sizes"
  on public.product_sizes for all using (public.is_admin());

-- ─── delivery_zones ──────────────────────────────────────────────────────────
create policy "Public can read active zones"
  on public.delivery_zones for select using (is_active = true);

create policy "Admins manage zones"
  on public.delivery_zones for all using (public.is_admin());

-- ─── time_slots ──────────────────────────────────────────────────────────────
create policy "Public can read active slots"
  on public.time_slots for select using (is_active = true);

create policy "Admins manage slots"
  on public.time_slots for all using (public.is_admin());

-- ─── holidays ────────────────────────────────────────────────────────────────
create policy "Public can read holidays"
  on public.holidays for select using (true);

create policy "Admins manage holidays"
  on public.holidays for all using (public.is_admin());

-- ─── coupons ─────────────────────────────────────────────────────────────────
-- Customers can only check if a coupon code is valid (not browse all coupons)
create policy "Admins manage coupons"
  on public.coupons for all using (public.is_admin());

-- ─── orders ──────────────────────────────────────────────────────────────────
create policy "Users can read own orders"
  on public.orders for select using (user_id = auth.uid());

create policy "Users can insert own orders"
  on public.orders for insert with check (
    user_id = auth.uid() or user_id is null -- allow guest orders
  );

create policy "Users can update own orders (limited)"
  on public.orders for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Admins manage all orders"
  on public.orders for all using (public.is_admin());

-- ─── order_items ─────────────────────────────────────────────────────────────
create policy "Users can read own order items"
  on public.order_items for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Users can insert own order items"
  on public.order_items for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or o.user_id is null))
  );

create policy "Admins manage all order items"
  on public.order_items for all using (public.is_admin());

-- ─── order_status_history ────────────────────────────────────────────────────
create policy "Users can read own order history"
  on public.order_status_history for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Admins manage order history"
  on public.order_status_history for all using (public.is_admin());

-- ─── bank_transfer_receipts ──────────────────────────────────────────────────
create policy "Users can read own receipts"
  on public.bank_transfer_receipts for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Users can insert receipts for own orders"
  on public.bank_transfer_receipts for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Admins manage receipts"
  on public.bank_transfer_receipts for all using (public.is_admin());

-- ─── payments ────────────────────────────────────────────────────────────────
create policy "Users can read own payments"
  on public.payments for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

create policy "Admins manage payments"
  on public.payments for all using (public.is_admin());

-- ─── bulk_requests ───────────────────────────────────────────────────────────
create policy "Anyone can create a bulk request"
  on public.bulk_requests for insert with check (true);

create policy "Users can read own bulk requests"
  on public.bulk_requests for select using (
    user_id = auth.uid() or user_id is null -- allow guest requests to be read by token (handled at app level)
  );

create policy "Admins manage bulk requests"
  on public.bulk_requests for all using (public.is_admin());

-- ─── bulk_request_attachments ────────────────────────────────────────────────
create policy "Users can add attachments to own requests"
  on public.bulk_request_attachments for insert with check (
    exists (select 1 from public.bulk_requests br where br.id = bulk_request_id and (br.user_id = auth.uid() or br.user_id is null))
  );

create policy "Users can read own request attachments"
  on public.bulk_request_attachments for select using (
    exists (select 1 from public.bulk_requests br where br.id = bulk_request_id and br.user_id = auth.uid())
  );

create policy "Admins manage attachments"
  on public.bulk_request_attachments for all using (public.is_admin());

-- ─── subscriptions ───────────────────────────────────────────────────────────
create policy "Users manage own subscriptions"
  on public.subscriptions for all using (user_id = auth.uid());

create policy "Admins manage all subscriptions"
  on public.subscriptions for all using (public.is_admin());

-- ─── reviews ─────────────────────────────────────────────────────────────────
create policy "Public can read approved reviews"
  on public.reviews for select using (status = 'approved');

create policy "Users can read own reviews"
  on public.reviews for select using (user_id = auth.uid());

create policy "Users can insert own reviews"
  on public.reviews for insert with check (user_id = auth.uid());

create policy "Users can update own pending reviews"
  on public.reviews for update using (user_id = auth.uid() and status = 'pending')
  with check (user_id = auth.uid());

create policy "Admins manage reviews"
  on public.reviews for all using (public.is_admin());

-- ─── review_images ───────────────────────────────────────────────────────────
create policy "Public can read images for approved reviews"
  on public.review_images for select using (
    exists (select 1 from public.reviews r where r.id = review_id and r.status = 'approved')
  );

create policy "Users manage own review images"
  on public.review_images for all using (
    exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
  );

create policy "Admins manage review images"
  on public.review_images for all using (public.is_admin());

-- ─── wishlist ────────────────────────────────────────────────────────────────
create policy "Users manage own wishlist"
  on public.wishlist for all using (user_id = auth.uid());

-- ─── loyalty_transactions ────────────────────────────────────────────────────
create policy "Users can read own loyalty transactions"
  on public.loyalty_transactions for select using (user_id = auth.uid());

create policy "Admins manage loyalty"
  on public.loyalty_transactions for all using (public.is_admin());

-- ─── banners ─────────────────────────────────────────────────────────────────
create policy "Public can read active banners"
  on public.banners for select using (
    is_active = true
    and (valid_from is null or valid_from <= now())
    and (valid_until is null or valid_until >= now())
  );

create policy "Admins manage banners"
  on public.banners for all using (public.is_admin());

-- ─── newsletter_subscribers ──────────────────────────────────────────────────
create policy "Anyone can subscribe to newsletter"
  on public.newsletter_subscribers for insert with check (true);

create policy "Admins manage newsletter"
  on public.newsletter_subscribers for all using (public.is_admin());

-- ─── notification_logs ───────────────────────────────────────────────────────
create policy "Admins read notification logs"
  on public.notification_logs for select using (public.is_admin());

-- ─── activity_logs ───────────────────────────────────────────────────────────
create policy "Admins read activity logs"
  on public.activity_logs for select using (public.is_admin());

-- ─── settings ────────────────────────────────────────────────────────────────
create policy "Admins manage settings"
  on public.settings for all using (public.is_admin());

-- Allow public read of certain safe settings keys (e.g., shop_info for display)
create policy "Public can read safe settings"
  on public.settings for select using (key in ('shop_info', 'tax', 'subscription_frequencies'));
