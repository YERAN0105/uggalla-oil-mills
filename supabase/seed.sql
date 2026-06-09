-- ============================================================
-- Uggalla Oil Mills — Seed Data
-- Run AFTER migrations. Safe to run multiple times (upsert).
-- ============================================================

-- ─── Brand: Royal Coco ───────────────────────────────────────────────────────
insert into public.brands (id, slug, name, description, display_order, is_active)
values (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'royal-coco',
  'Royal Coco',
  'Royal Coco is Uggalla Oil Mills'' flagship coconut oil brand — pure, naturally pressed, and bottled fresh at the source in Padukka, Sri Lanka.',
  1,
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

-- ─── Categories ──────────────────────────────────────────────────────────────
insert into public.categories (id, slug, name, description, display_order, is_active, is_bulk)
values
  (
    'b1b2c3d4-0001-0001-0001-000000000001',
    'bottles',
    'Bottles',
    'Bottled coconut oil in measured volumes — from small household bottles to family-size packs. Perfect for everyday cooking, skincare, and wellness.',
    1, true, false
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000002',
    'packets',
    'Packets',
    'Convenient sachet and pouch packs of fresh coconut oil. Ideal for gifting, travel, or stocking up in bulk.',
    2, true, false
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000003',
    'bulk',
    'Bulk / Loose Oil',
    'Large-volume loose coconut oil for restaurants, bakeries, cosmetic manufacturers, and industrial buyers. Request a quote for pricing.',
    3, true, true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  is_bulk = excluded.is_bulk;

-- ─── Delivery Zones ──────────────────────────────────────────────────────────
insert into public.delivery_zones (id, name, fee, estimated_time, min_order_amount, is_active)
values
  (
    'c1b2c3d4-0001-0001-0001-000000000001',
    'Padukka & Nearby (within 10 km)',
    300.00,
    '1–2 hours',
    500.00,
    true
  ),
  (
    'c1b2c3d4-0001-0001-0001-000000000002',
    'Greater Colombo (Colombo, Nugegoda, Maharagama)',
    500.00,
    'Same day / next day',
    1000.00,
    true
  ),
  (
    'c1b2c3d4-0001-0001-0001-000000000003',
    'Island-wide (all other areas)',
    900.00,
    '2–3 business days',
    2000.00,
    true
  )
on conflict (id) do update set
  name = excluded.name,
  fee = excluded.fee,
  estimated_time = excluded.estimated_time,
  min_order_amount = excluded.min_order_amount,
  is_active = excluded.is_active;

-- ─── Time Slots ──────────────────────────────────────────────────────────────
insert into public.time_slots (id, label, start_time, end_time, capacity, is_active)
values
  ('d1b2c3d4-0001-0001-0001-000000000001', '9:00 AM – 12:00 PM', '09:00', '12:00', 20, true),
  ('d1b2c3d4-0001-0001-0001-000000000002', '1:00 PM – 4:00 PM',  '13:00', '16:00', 20, true),
  ('d1b2c3d4-0001-0001-0001-000000000003', '5:00 PM – 7:00 PM',  '17:00', '19:00', 15, true)
on conflict (id) do update set
  label = excluded.label,
  start_time = excluded.start_time,
  end_time = excluded.end_time,
  capacity = excluded.capacity,
  is_active = excluded.is_active;

-- ─── Settings ────────────────────────────────────────────────────────────────
insert into public.settings (key, value)
values
  (
    'shop_info',
    '{
      "name": "Uggalla Oil Mills",
      "tagline": "Pure Coconut Oil, Naturally Pressed in Padukka",
      "address": "Padukka, Sri Lanka",
      "phone": "+94 77 XXX XXXX",
      "email": "hello@uggallaoilmills.lk",
      "whatsapp": "+94 77 XXX XXXX",
      "business_hours": "Mon–Sat 8:00 AM – 6:00 PM"
    }'
  ),
  (
    'tax',
    '{
      "rate": 0,
      "inclusive": false,
      "label": "Tax"
    }'
  ),
  (
    'loyalty',
    '{
      "earn_rate": 1,
      "earn_per_amount": 100,
      "redeem_rate": 50,
      "redeem_per_points": 100,
      "max_redeem_percent": 20,
      "expiry_months": 12,
      "first_order_bonus": 50,
      "review_bonus": 10
    }'
  ),
  (
    'subscription_frequencies',
    '[
      {"key": "weekly",    "label": "Every week",    "days": 7},
      {"key": "biweekly",  "label": "Every 2 weeks", "days": 14},
      {"key": "monthly",   "label": "Every month",   "days": 30}
    ]'
  ),
  (
    'cod_limits',
    '{
      "min_order_amount": 500,
      "max_order_amount": null,
      "enabled": true
    }'
  ),
  (
    'notifications',
    '{
      "email_enabled": true,
      "whatsapp_enabled": true
    }'
  )
on conflict (key) do update set value = excluded.value;
