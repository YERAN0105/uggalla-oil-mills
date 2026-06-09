-- ============================================================
-- Uggalla Oil Mills — Initial Schema (Phase 1)
-- All money columns: numeric(12,2)
-- All PKs: UUID gen_random_uuid()
-- All timestamps: timestamptz default now()
-- ============================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Enums ───────────────────────────────────────────────────────────────────
create type user_role as enum ('customer', 'admin');
create type purchase_type as enum ('retail', 'bulk_quote');
create type order_status as enum (
  'pending_confirmation', 'confirmed', 'preparing',
  'out_for_delivery', 'ready_for_pickup', 'delivered', 'cancelled', 'refunded'
);
create type payment_status as enum (
  'pending', 'pending_transfer', 'cod', 'paid', 'rejected', 'refunded'
);
create type fulfillment_type as enum ('delivery', 'pickup');
create type subscription_interval as enum ('weekly', 'biweekly', 'monthly');
create type subscription_status as enum ('active', 'paused', 'cancelled');
create type bulk_request_status as enum (
  'new', 'in_progress', 'quoted', 'accepted', 'rejected', 'completed'
);
create type payment_mode as enum ('offline', 'online');
create type review_status as enum ('pending', 'approved', 'hidden');
create type loyalty_tx_type as enum ('earn', 'redeem', 'bonus', 'expire', 'adjust');
create type notification_channel as enum ('email', 'whatsapp');
create type notification_status as enum ('sent', 'failed', 'skipped');

-- ─── users (extends auth.users) ──────────────────────────────────────────────
create table if not exists public.users (
  id              uuid primary key references auth.users(id) on delete cascade,
  name            text,
  phone           text,
  role            user_role not null default 'customer',
  loyalty_points  integer not null default 0,
  blocked         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists users_role_idx on public.users(role);

-- ─── addresses ───────────────────────────────────────────────────────────────
create table if not exists public.addresses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  label         text,
  recipient     text not null,
  phone         text,
  line1         text not null,
  line2         text,
  city          text not null,
  postal_code   text,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists addresses_user_idx on public.addresses(user_id);

-- ─── brands ──────────────────────────────────────────────────────────────────
create table if not exists public.brands (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  image_url     text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists brands_slug_idx on public.brands(slug);
create index if not exists brands_active_idx on public.brands(is_active);

-- ─── categories ──────────────────────────────────────────────────────────────
create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text,
  image_url     text,
  display_order integer not null default 0,
  is_active     boolean not null default true,
  is_bulk       boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists categories_slug_idx on public.categories(slug);
create index if not exists categories_active_idx on public.categories(is_active);

-- ─── products ────────────────────────────────────────────────────────────────
create table if not exists public.products (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  brand_id             uuid references public.brands(id) on delete set null,
  category_id          uuid not null references public.categories(id),
  name                 text not null,
  short_description    text,
  description          text,
  key_facts            jsonb,
  base_price           numeric(12,2) not null default 0,
  purchase_type        purchase_type not null default 'retail',
  allows_subscription  boolean not null default false,
  allows_note          boolean not null default false,
  note_max_chars       integer not null default 200,
  is_published         boolean not null default false,
  is_featured          boolean not null default false,
  is_bestseller        boolean not null default false,
  stock_tracked        boolean not null default false,
  stock_quantity       integer not null default 0,
  low_stock_threshold  integer not null default 5,
  meta_title           text,
  meta_description     text,
  deleted_at           timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists products_slug_idx on public.products(slug);
create index if not exists products_brand_idx on public.products(brand_id);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_published_idx on public.products(is_published) where deleted_at is null;
create index if not exists products_featured_idx on public.products(is_featured) where is_published = true and deleted_at is null;

-- ─── product_images ──────────────────────────────────────────────────────────
create table if not exists public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  url           text not null,
  alt_text      text,
  display_order integer not null default 0,
  is_primary    boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists product_images_product_idx on public.product_images(product_id);

-- ─── product_sizes ───────────────────────────────────────────────────────────
create table if not exists public.product_sizes (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  label         text not null,
  volume_ml     integer,
  price         numeric(12,2) not null,
  display_order integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists product_sizes_product_idx on public.product_sizes(product_id);

-- ─── delivery_zones ──────────────────────────────────────────────────────────
create table if not exists public.delivery_zones (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  fee                 numeric(12,2) not null default 0,
  estimated_time      text,
  min_order_amount    numeric(12,2),
  same_day_surcharge  numeric(12,2),
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── time_slots ──────────────────────────────────────────────────────────────
create table if not exists public.time_slots (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  start_time  time not null,
  end_time    time not null,
  capacity    integer not null default 50,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── holidays ────────────────────────────────────────────────────────────────
create table if not exists public.holidays (
  id    uuid primary key default gen_random_uuid(),
  date  date not null unique,
  label text
);

-- ─── coupons ─────────────────────────────────────────────────────────────────
create table if not exists public.coupons (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null unique,
  type                  text not null check (type in ('percent_off','flat_off','free_delivery')),
  value                 numeric(12,2) not null,
  min_order_amount      numeric(12,2),
  max_discount          numeric(12,2),
  usage_limit_total     integer,
  usage_limit_per_user  integer,
  valid_from            timestamptz,
  valid_until           timestamptz,
  applies_to            jsonb not null default '{"type":"all"}',
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists coupons_code_idx on public.coupons(code);
create index if not exists coupons_active_idx on public.coupons(is_active);

-- ─── orders ──────────────────────────────────────────────────────────────────
create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique default 'ORD-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  user_id             uuid references public.users(id) on delete set null,
  guest_email         text,
  guest_phone         text,
  status              order_status not null default 'pending_confirmation',
  fulfillment_type    fulfillment_type not null default 'delivery',
  delivery_zone_id    uuid references public.delivery_zones(id) on delete set null,
  address_snapshot    jsonb,
  delivery_date       date,
  time_slot_id        uuid references public.time_slots(id) on delete set null,
  payment_method      text not null default 'cod',
  payment_status      payment_status not null default 'pending',
  subtotal            numeric(12,2) not null default 0,
  delivery_fee        numeric(12,2) not null default 0,
  discount_amount     numeric(12,2) not null default 0,
  tax_amount          numeric(12,2) not null default 0,
  loyalty_points_used integer not null default 0,
  loyalty_discount    numeric(12,2) not null default 0,
  total               numeric(12,2) not null default 0,
  coupon_id           uuid references public.coupons(id) on delete set null,
  source              text not null default 'storefront' check (source in ('storefront','bulk_conversion')),
  notes               text,
  internal_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_number_idx on public.orders(order_number);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);

-- ─── order_items ─────────────────────────────────────────────────────────────
create table if not exists public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders(id) on delete cascade,
  product_id        uuid references public.products(id) on delete set null,
  product_snapshot  jsonb not null,
  options           jsonb not null default '{}',
  quantity          integer not null default 1,
  unit_price        numeric(12,2) not null,
  line_total        numeric(12,2) not null,
  created_at        timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

-- ─── order_status_history ────────────────────────────────────────────────────
create table if not exists public.order_status_history (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  status      order_status not null,
  note        text,
  changed_by  uuid references public.users(id) on delete set null,
  changed_at  timestamptz not null default now()
);

create index if not exists order_status_history_order_idx on public.order_status_history(order_id);

-- ─── bank_transfer_receipts ──────────────────────────────────────────────────
create table if not exists public.bank_transfer_receipts (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  image_url     text not null,
  uploaded_at   timestamptz not null default now(),
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by   uuid references public.users(id) on delete set null,
  reviewed_at   timestamptz,
  reject_reason text
);

create index if not exists btr_order_idx on public.bank_transfer_receipts(order_id);

-- ─── payments ────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders(id) on delete cascade,
  gateway                text not null,
  gateway_transaction_id text,
  amount                 numeric(12,2) not null,
  status                 text not null,
  raw_response           jsonb,
  created_at             timestamptz not null default now()
);

create index if not exists payments_order_idx on public.payments(order_id);

-- ─── coupon_usage ────────────────────────────────────────────────────────────
create table if not exists public.coupon_usage (
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id  uuid not null references public.orders(id) on delete cascade,
  user_id   uuid references public.users(id) on delete set null,
  used_at   timestamptz not null default now(),
  primary key (coupon_id, order_id)
);

-- ─── bulk_requests ───────────────────────────────────────────────────────────
create table if not exists public.bulk_requests (
  id                 uuid primary key default gen_random_uuid(),
  product_id         uuid references public.products(id) on delete set null,
  user_id            uuid references public.users(id) on delete set null,
  name               text not null,
  email              text not null,
  phone              text not null,
  fulfillment_type   fulfillment_type not null default 'delivery',
  address_snapshot   jsonb,
  quantity           numeric(12,2) not null,
  unit               text not null default 'litres',
  preferred_date     date,
  notes              text,
  status             bulk_request_status not null default 'new',
  quoted_unit_price  numeric(12,2),
  quoted_total       numeric(12,2),
  quote_message      text,
  payment_mode       payment_mode not null default 'offline',
  quote_token        text unique,
  quote_expires_at   timestamptz,
  internal_notes     text,
  converted_order_id uuid references public.orders(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists bulk_requests_user_idx on public.bulk_requests(user_id);
create index if not exists bulk_requests_status_idx on public.bulk_requests(status);
create index if not exists bulk_requests_created_idx on public.bulk_requests(created_at desc);

-- ─── bulk_request_attachments ────────────────────────────────────────────────
create table if not exists public.bulk_request_attachments (
  id               uuid primary key default gen_random_uuid(),
  bulk_request_id  uuid not null references public.bulk_requests(id) on delete cascade,
  url              text not null,
  created_at       timestamptz not null default now()
);

-- ─── subscriptions ───────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references public.users(id) on delete cascade,
  product_id           uuid not null references public.products(id) on delete cascade,
  size_id              uuid references public.product_sizes(id) on delete set null,
  quantity             integer not null default 1,
  interval             subscription_interval not null default 'monthly',
  next_reminder_date   date not null,
  status               subscription_status not null default 'active',
  last_reminder_at     timestamptz,
  created_from_order_id uuid references public.orders(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists subscriptions_user_idx on public.subscriptions(user_id);
create index if not exists subscriptions_next_reminder_idx on public.subscriptions(next_reminder_date) where status = 'active';

-- ─── reviews ─────────────────────────────────────────────────────────────────
create table if not exists public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,
  user_id       uuid not null references public.users(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete set null,
  rating        integer not null check (rating between 1 and 5),
  title         text,
  body          text,
  status        review_status not null default 'pending',
  admin_reply   text,
  created_at    timestamptz not null default now()
);

create index if not exists reviews_product_idx on public.reviews(product_id);
create index if not exists reviews_user_idx on public.reviews(user_id);
create index if not exists reviews_status_idx on public.reviews(status);

-- ─── review_images ───────────────────────────────────────────────────────────
create table if not exists public.review_images (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid not null references public.reviews(id) on delete cascade,
  url        text not null,
  created_at timestamptz not null default now()
);

-- ─── wishlist ────────────────────────────────────────────────────────────────
create table if not exists public.wishlist (
  user_id    uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists wishlist_user_idx on public.wishlist(user_id);

-- ─── loyalty_transactions ────────────────────────────────────────────────────
create table if not exists public.loyalty_transactions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  type          loyalty_tx_type not null,
  points        integer not null,
  balance_after integer not null,
  note          text,
  expires_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists loyalty_tx_user_idx on public.loyalty_transactions(user_id);
create index if not exists loyalty_tx_order_idx on public.loyalty_transactions(order_id);
create index if not exists loyalty_tx_expires_idx on public.loyalty_transactions(expires_at) where expires_at is not null;

-- ─── banners ─────────────────────────────────────────────────────────────────
create table if not exists public.banners (
  id            uuid primary key default gen_random_uuid(),
  image_url     text,
  headline      text,
  subheadline   text,
  cta_text      text,
  cta_link      text,
  position      text not null default 'hero',
  display_order integer not null default 0,
  valid_from    timestamptz,
  valid_until   timestamptz,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists banners_active_idx on public.banners(is_active, position);

-- ─── newsletter_subscribers ──────────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  subscribed_at timestamptz not null default now(),
  is_active     boolean not null default true
);

-- ─── notification_logs ───────────────────────────────────────────────────────
create table if not exists public.notification_logs (
  id               uuid primary key default gen_random_uuid(),
  event            text not null,
  channel          notification_channel not null,
  recipient        text not null,
  status           notification_status not null default 'sent',
  error            text,
  payload          jsonb,
  idempotency_key  text unique,
  sent_at          timestamptz not null default now()
);

create index if not exists notification_logs_event_idx on public.notification_logs(event, sent_at desc);

-- ─── activity_logs ───────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references public.users(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists activity_logs_user_idx on public.activity_logs(user_id);
create index if not exists activity_logs_created_idx on public.activity_logs(created_at desc);

-- ─── settings ────────────────────────────────────────────────────────────────
create table if not exists public.settings (
  key   text primary key,
  value jsonb not null
);

-- ─── updated_at trigger function ─────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Apply to all tables with updated_at
create trigger set_updated_at before update on public.users
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.brands
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.bulk_requests
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

-- ─── Auto-create user profile on auth.users insert ───────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
