-- ============================================================
-- Uggalla Oil Mills — Product Seed Data (Phase 2)
-- Run after migrations 001, 002, 003.
-- Idempotent: ON CONFLICT DO UPDATE / DO NOTHING.
-- ============================================================

-- ─── Brand: Royal Coco (bottles & packets) ──────────────────────────────────
INSERT INTO public.brands (id, slug, name, description, image_url, display_order, is_active)
VALUES (
  'a1b2c3d4-0001-0001-0001-000000000001',
  'royal-coco',
  'Royal Coco',
  'Royal Coco is the flagship retail brand of Uggalla Oil Mills — handcrafted coconut oil naturally pressed at our mill in Padukka, Sri Lanka. Every bottle and packet carries the purity and warmth of island tradition.',
  'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80',
  1,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  updated_at = now();

-- ─── Brand: Uggalla Oil Mills (bulk / wholesale) ─────────────────────────────
INSERT INTO public.brands (id, slug, name, description, image_url, display_order, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'uggalla-oil-mills',
  'Uggalla Oil Mills',
  'Direct bulk and wholesale supply of pure coconut oil from our mill in Padukka, Sri Lanka. We supply restaurants, hotels, bakeries, food manufacturers, and exporters island-wide.',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
  2,
  true
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  updated_at = now();

-- ─── Categories ──────────────────────────────────────────────────────────────
INSERT INTO public.categories (id, slug, name, description, image_url, display_order, is_active, is_bulk)
VALUES
  (
    'b1b2c3d4-0001-0001-0001-000000000001',
    'bottles',
    'Bottles',
    'Premium coconut oil in glass and PET bottles — perfect for kitchen use, skincare, and gifting. Freshly pressed and triple-filtered.',
    'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=800&q=80',
    1, true, false
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000002',
    'packets',
    'Packets',
    'Convenient resealable packets for everyday cooking. Same pure coconut oil at a pocket-friendly price point.',
    'https://images.unsplash.com/photo-1504387432042-8aca549e4729?w=800&q=80',
    2, true, false
  ),
  (
    'b1b2c3d4-0001-0001-0001-000000000003',
    'bulk',
    'Bulk / Wholesale',
    'Loose coconut oil for restaurants, bakeries, exporters, and large households. Request a quote and we will arrange the best price for your volume.',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    3, true, true
  )
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url = EXCLUDED.image_url,
  is_bulk = EXCLUDED.is_bulk,
  updated_at = now();

-- ─── Products ────────────────────────────────────────────────────────────────

-- 1. Royal Coco Pure Coconut Oil — Bottle
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440001',
  'royal-coco-pure-coconut-oil-bottle',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'b1b2c3d4-0001-0001-0001-000000000001',
  'Royal Coco Pure Coconut Oil',
  'Cold-pressed pure coconut oil, naturally extracted at our Padukka mill. Ideal for cooking, baking, and skincare.',
  '<p>Royal Coco Pure Coconut Oil is extracted from fresh, matured coconuts grown in the coconut-rich heartland of Sri Lanka. Our cold-press process preserves all the natural goodness — rich lauric acid content, natural aroma, and a beautiful pale-gold clarity.</p><p>Perfect for high-heat cooking, baking, deep-frying, and as a natural moisturiser for skin and hair. No additives, no preservatives — just pure, wholesome coconut oil the way nature intended.</p><p>Sourced from trusted Padukka-region coconut estates, pressed at our own mill, and bottled fresh to ensure maximum purity and freshness in every drop.</p>',
  '[
    {"label": "Extraction", "value": "Cold-pressed"},
    {"label": "Type", "value": "Refined Pure Coconut Oil"},
    {"label": "Shelf Life", "value": "24 months (unopened)"},
    {"label": "Origin", "value": "Padukka, Sri Lanka"},
    {"label": "Lauric Acid", "value": "≥ 48%"},
    {"label": "Free Fatty Acids", "value": "< 0.1%"}
  ]',
  320.00,
  'retail',
  true, true, 200,
  true, true, true,
  true, 120, 15,
  'Royal Coco Pure Coconut Oil — Uggalla Oil Mills',
  'Buy premium cold-pressed pure coconut oil from Royal Coco by Uggalla Oil Mills, naturally pressed in Padukka, Sri Lanka. Available in 200ml, 500ml, 750ml and 1L bottles.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Sizes for Pure Coconut Oil — Bottle
INSERT INTO public.product_sizes (id, product_id, label, volume_ml, price, display_order)
VALUES
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '200ml', 200, 320.00, 1),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '500ml', 500, 680.00, 2),
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '750ml', 750, 950.00, 3),
  ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440001', '1L', 1000, 1250.00, 4)
ON CONFLICT (id) DO NOTHING;

-- Images for Pure Coconut Oil — Bottle
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001',
   'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=800&q=80',
   'Royal Coco Pure Coconut Oil bottle', 1, true),
  ('880e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001',
   'https://images.unsplash.com/photo-1571943957988-b22f4c7b4f3c?w=800&q=80',
   'Royal Coco Pure Coconut Oil — golden oil pour', 2, false),
  ('880e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001',
   'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80',
   'Fresh coconuts at Uggalla mill, Padukka', 3, false)
ON CONFLICT (id) DO NOTHING;


-- 2. Royal Coco Virgin Coconut Oil — Bottle
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440002',
  'royal-coco-virgin-coconut-oil-bottle',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'b1b2c3d4-0001-0001-0001-000000000001',
  'Royal Coco Virgin Coconut Oil',
  'Unrefined, extra-virgin coconut oil with a delicate natural coconut aroma. The purest expression of our mill.',
  '<p>Our Virgin Coconut Oil is cold-extracted from fresh coconut milk without any heat treatment, giving it a light, natural coconut fragrance and the highest concentration of antioxidants and medium-chain fatty acids.</p><p>Ideal for raw consumption, low-heat cooking, smoothies, and premium skincare. A favourite among health-conscious households and wellness practitioners.</p><p>Unrefined, unbleached, deodorised only naturally — this is coconut oil in its most authentic form, from coconut to bottle in under 24 hours at our Padukka facility.</p>',
  '[
    {"label": "Extraction", "value": "Cold-pressed, unrefined"},
    {"label": "Type", "value": "Extra-Virgin Coconut Oil"},
    {"label": "Shelf Life", "value": "24 months (unopened)"},
    {"label": "Origin", "value": "Padukka, Sri Lanka"},
    {"label": "Lauric Acid", "value": "≥ 50%"},
    {"label": "Scent", "value": "Light natural coconut"}
  ]',
  480.00,
  'retail',
  true, true, 200,
  true, true, false,
  true, 85, 10,
  'Royal Coco Virgin Coconut Oil — Uggalla Oil Mills',
  'Extra-virgin, unrefined coconut oil cold-pressed from fresh coconuts at Uggalla Oil Mills, Padukka. Available in 250ml, 500ml and 1L bottles.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Sizes for Virgin Coconut Oil — Bottle
INSERT INTO public.product_sizes (id, product_id, label, volume_ml, price, display_order)
VALUES
  ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '250ml', 250, 480.00, 1),
  ('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', '500ml', 500, 890.00, 2),
  ('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440002', '1L', 1000, 1600.00, 3)
ON CONFLICT (id) DO NOTHING;

-- Images for Virgin Coconut Oil
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002',
   'https://images.unsplash.com/photo-1596392927852-2a18c336fb44?w=800&q=80',
   'Royal Coco Virgin Coconut Oil bottle', 1, true),
  ('880e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002',
   'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=800&q=80',
   'Virgin coconut oil — clear glass bottle', 2, false)
ON CONFLICT (id) DO NOTHING;


-- 3. Royal Coco Coconut Hair Oil — Bottle
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440003',
  'royal-coco-coconut-hair-oil-bottle',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'b1b2c3d4-0001-0001-0001-000000000001',
  'Royal Coco Coconut Hair Oil',
  'Traditional coconut oil enriched with curry leaf and hibiscus extracts — the classic Sri Lankan hair treatment.',
  '<p>Deeply nourishing and fragrant, our Coconut Hair Oil blends pure cold-pressed coconut oil with a traditional infusion of curry leaves and hibiscus — a recipe passed down through generations at Uggalla.</p><p>Massaged into the scalp, it promotes thickness, natural shine, and reduces breakage. Perfect for warm oil treatments, overnight conditioning, or everyday use.</p><p>Free from synthetic fragrances, sulfates, and mineral oils. A true farm-to-bottle haircare product.</p>',
  '[
    {"label": "Base Oil", "value": "Cold-pressed coconut oil"},
    {"label": "Enriched With", "value": "Curry leaf, hibiscus"},
    {"label": "Shelf Life", "value": "18 months"},
    {"label": "Use", "value": "Hair & scalp care"},
    {"label": "Origin", "value": "Padukka, Sri Lanka"}
  ]',
  320.00,
  'retail',
  false, true, 200,
  true, false, true,
  true, 65, 10,
  'Royal Coco Coconut Hair Oil — Uggalla Oil Mills',
  'Traditional Sri Lankan coconut hair oil infused with curry leaf and hibiscus. Cold-pressed at Uggalla Oil Mills, Padukka.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Sizes for Hair Oil
INSERT INTO public.product_sizes (id, product_id, label, volume_ml, price, display_order)
VALUES
  ('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440003', '100ml', 100, 320.00, 1),
  ('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440003', '200ml', 200, 550.00, 2)
ON CONFLICT (id) DO NOTHING;

-- Images for Hair Oil
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440003',
   'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80',
   'Royal Coco Coconut Hair Oil bottle', 1, true),
  ('880e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003',
   'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=800&q=80',
   'Fresh coconuts — source for Royal Coco hair oil', 2, false)
ON CONFLICT (id) DO NOTHING;


-- 4. Royal Coco Coconut Oil — Packet
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440004',
  'royal-coco-coconut-oil-packet',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'b1b2c3d4-0001-0001-0001-000000000002',
  'Royal Coco Coconut Oil — Packet',
  'The same pure coconut oil in convenient resealable packets — ideal for everyday cooking at a great value.',
  '<p>Our Packet range brings the quality of Royal Coco into an affordable, convenient format. Each packet is heat-sealed for freshness and easy to store in your pantry or use while travelling.</p><p>The same cold-pressed pure coconut oil as our bottle range — just in a lighter, more economical package. Perfect for households that use coconut oil daily for cooking, frying, and seasoning.</p>',
  '[
    {"label": "Extraction", "value": "Cold-pressed"},
    {"label": "Type", "value": "Refined Pure Coconut Oil"},
    {"label": "Shelf Life", "value": "18 months"},
    {"label": "Origin", "value": "Padukka, Sri Lanka"},
    {"label": "Packaging", "value": "Heat-sealed pouch"}
  ]',
  165.00,
  'retail',
  true, false, 200,
  true, false, false,
  true, 200, 30,
  'Royal Coco Coconut Oil Packet — Uggalla Oil Mills',
  'Affordable everyday coconut oil in convenient resealable packets. Same pure cold-pressed quality from Uggalla Oil Mills.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Sizes for Packet
INSERT INTO public.product_sizes (id, product_id, label, volume_ml, price, display_order)
VALUES
  ('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440004', '100ml', 100, 165.00, 1),
  ('770e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440004', '200ml', 200, 280.00, 2),
  ('770e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440004', '500ml', 500, 620.00, 3)
ON CONFLICT (id) DO NOTHING;

-- Images for Packet
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440004',
   'https://images.unsplash.com/photo-1504387432042-8aca549e4729?w=800&q=80',
   'Royal Coco Coconut Oil packet', 1, true)
ON CONFLICT (id) DO NOTHING;


-- 5. Royal Coco Coconut Oil — Economy Packet
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440005',
  'royal-coco-coconut-oil-economy-packet',
  'a1b2c3d4-0001-0001-0001-000000000001',
  'b1b2c3d4-0001-0001-0001-000000000002',
  'Royal Coco Coconut Oil — Economy Packet',
  'Larger-format packets for families and frequent cooks. Best value per ml — same pure Royal Coco quality.',
  '<p>Our Economy Packet range is designed for households and small food businesses that need larger quantities without the bulk wholesale commitment. Available in 500ml and 1L resealable pouches.</p><p>Every pouch contains the same pure coconut oil extracted fresh at our Padukka mill — at our most competitive per-ml price.</p>',
  '[
    {"label": "Extraction", "value": "Cold-pressed"},
    {"label": "Type", "value": "Refined Pure Coconut Oil"},
    {"label": "Shelf Life", "value": "18 months"},
    {"label": "Origin", "value": "Padukka, Sri Lanka"},
    {"label": "Best For", "value": "Daily cooking, large families"}
  ]',
  580.00,
  'retail',
  true, false, 200,
  true, false, false,
  true, 150, 20,
  'Royal Coco Economy Coconut Oil Packet — Uggalla Oil Mills',
  'Large-format coconut oil packets in 500ml and 1L for families and frequent cooks. Best value from Uggalla Oil Mills.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Sizes for Economy Packet
INSERT INTO public.product_sizes (id, product_id, label, volume_ml, price, display_order)
VALUES
  ('770e8400-e29b-41d4-a716-446655440013', '660e8400-e29b-41d4-a716-446655440005', '500ml', 500, 580.00, 1),
  ('770e8400-e29b-41d4-a716-446655440014', '660e8400-e29b-41d4-a716-446655440005', '1L', 1000, 1050.00, 2)
ON CONFLICT (id) DO NOTHING;

-- Images for Economy Packet
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440005',
   'https://images.unsplash.com/photo-1504387432042-8aca549e4729?w=800&q=80',
   'Royal Coco Economy Coconut Oil packet', 1, true),
  ('880e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440005',
   'https://images.unsplash.com/photo-1570197788417-0e82375c9371?w=800&q=80',
   'Freshly pressed coconut oil at Uggalla mill', 2, false)
ON CONFLICT (id) DO NOTHING;


-- 6. Coconut Oil (Bulk)
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440006',
  'coconut-oil-bulk',
  '550e8400-e29b-41d4-a716-446655440002',
  'b1b2c3d4-0001-0001-0001-000000000003',
  'Coconut Oil (Bulk)',
  'Wholesale coconut oil from Uggalla Oil Mills for restaurants, hotels, bakeries, and exporters. Indicative price Rs. 580 / litre — request a quote for your volume and packaging.',
  '<p>Uggalla Oil Mills supplies bulk coconut oil directly from our Padukka mill to restaurants, hotels, bakeries, food manufacturers, and exporters across Sri Lanka.</p><p>Available from 10 litres upward — dispatched loose, in sealed 20L cans, or in custom food-grade containers. Tell us the volume and packaging you need when you request a quote. The same premium quality as our retail range, at commercial pricing.</p><p>We typically respond within 24 hours with a tailored price based on your volume and delivery location.</p>',
  '[
    {"label": "Minimum Order", "value": "10 litres"},
    {"label": "Extraction", "value": "Cold-pressed"},
    {"label": "Type", "value": "Refined Pure Coconut Oil"},
    {"label": "Indicative Price", "value": "Rs. 580 / litre (volume discounts apply)"},
    {"label": "Packaging", "value": "20L food-grade cans or custom"},
    {"label": "Lead Time", "value": "2–3 business days"}
  ]',
  580.00,
  'bulk_quote',
  false, true, 500,
  true, false, false,
  false, 0, 0,
  'Uggalla Oil Mills Bulk Coconut Oil — Wholesale',
  'Wholesale bulk coconut oil from Uggalla Oil Mills, Padukka. Competitive pricing for restaurants, hotels, bakeries and exporters. Request a quote.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Images for Coconut Oil (Bulk)
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440006',
   'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
   'Bulk coconut oil — food-grade container', 1, true),
  ('880e8400-e29b-41d4-a716-446655440012', '660e8400-e29b-41d4-a716-446655440006',
   'https://images.unsplash.com/photo-1571943957988-b22f4c7b4f3c?w=800&q=80',
   'Pure coconut oil pouring', 2, false)
ON CONFLICT (id) DO NOTHING;


-- 7. Virgin Coconut Oil (Bulk)
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440008',
  'virgin-coconut-oil-bulk',
  '550e8400-e29b-41d4-a716-446655440002',
  'b1b2c3d4-0001-0001-0001-000000000003',
  'Virgin Coconut Oil (Bulk)',
  'Wholesale cold-pressed virgin coconut oil for health brands, cafés, and exporters. Indicative price Rs. 980 / litre — request a quote for your volume and packaging.',
  '<p>Our extra-virgin coconut oil is cold-extracted from fresh coconut milk with no heat treatment, keeping its light natural aroma and high medium-chain fatty acid content.</p><p>Supplied in bulk to wellness brands, premium cafés, cosmetic manufacturers, and exporters. Available from 10 litres upward in sealed cans or custom food-grade containers — tell us your volume and packaging when you request a quote.</p><p>We typically respond within 24 hours with a tailored commercial price.</p>',
  '[
    {"label": "Minimum Order", "value": "10 litres"},
    {"label": "Extraction", "value": "Cold-pressed, unrefined"},
    {"label": "Type", "value": "Extra-Virgin Coconut Oil"},
    {"label": "Indicative Price", "value": "Rs. 980 / litre (volume discounts apply)"},
    {"label": "Packaging", "value": "Sealed cans or custom"},
    {"label": "Lead Time", "value": "2–3 business days"}
  ]',
  980.00,
  'bulk_quote',
  false, true, 500,
  true, true, false,
  false, 0, 0,
  'Virgin Coconut Oil — Bulk & Wholesale | Uggalla Oil Mills',
  'Wholesale cold-pressed virgin coconut oil from Uggalla Oil Mills, Padukka. Premium quality for health brands, cafés and exporters. Request a quote.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Images for Virgin Coconut Oil (Bulk)
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440015', '660e8400-e29b-41d4-a716-446655440008',
   'https://images.unsplash.com/photo-1596392927852-2a18c336fb44?w=800&q=80',
   'Virgin coconut oil — bulk supply', 1, true),
  ('880e8400-e29b-41d4-a716-446655440016', '660e8400-e29b-41d4-a716-446655440008',
   'https://images.unsplash.com/photo-1618354691438-25bc04584c23?w=800&q=80',
   'Cold-pressed virgin coconut oil', 2, false)
ON CONFLICT (id) DO NOTHING;


-- 8. Sesame (Gingelly) Oil (Bulk)
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440009',
  'sesame-gingelly-oil-bulk',
  '550e8400-e29b-41d4-a716-446655440002',
  'b1b2c3d4-0001-0001-0001-000000000003',
  'Sesame (Gingelly) Oil (Bulk)',
  'Wholesale pure sesame (gingelly) oil for kitchens, ayurvedic centres, and food manufacturers. Indicative price Rs. 1,350 / litre — request a quote.',
  '<p>Traditional gingelly (thala thel) oil pressed from quality sesame seeds — a Sri Lankan kitchen and ayurvedic staple with a rich, nutty aroma.</p><p>Supplied in bulk to restaurants, ayurvedic practitioners, spice exporters, and food manufacturers. Available from 5 litres upward in sealed cans or custom food-grade containers; tell us your volume and packaging when you request a quote.</p><p>We typically respond within 24 hours with a tailored commercial price.</p>',
  '[
    {"label": "Minimum Order", "value": "5 litres"},
    {"label": "Extraction", "value": "Cold-pressed"},
    {"label": "Type", "value": "Pure Sesame (Gingelly) Oil"},
    {"label": "Indicative Price", "value": "Rs. 1,350 / litre (volume discounts apply)"},
    {"label": "Packaging", "value": "Sealed cans or custom"},
    {"label": "Lead Time", "value": "3–5 business days"}
  ]',
  1350.00,
  'bulk_quote',
  false, true, 500,
  true, false, false,
  false, 0, 0,
  'Sesame (Gingelly) Oil — Bulk & Wholesale | Uggalla Oil Mills',
  'Wholesale pure sesame (gingelly) oil from Uggalla Oil Mills, Padukka. For kitchens, ayurvedic centres and food manufacturers. Request a quote.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Images for Sesame (Gingelly) Oil (Bulk)
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440017', '660e8400-e29b-41d4-a716-446655440009',
   'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=800&q=80',
   'Sesame gingelly oil — bulk supply', 1, true),
  ('880e8400-e29b-41d4-a716-446655440018', '660e8400-e29b-41d4-a716-446655440009',
   'https://images.unsplash.com/photo-1571943957988-b22f4c7b4f3c?w=800&q=80',
   'Pure sesame oil pouring', 2, false)
ON CONFLICT (id) DO NOTHING;


-- 9. Coconut Hair Oil (Bulk)
INSERT INTO public.products (
  id, slug, brand_id, category_id, name, short_description, description,
  key_facts, base_price, purchase_type,
  allows_subscription, allows_note, note_max_chars,
  is_published, is_featured, is_bestseller,
  stock_tracked, stock_quantity, low_stock_threshold,
  meta_title, meta_description
)
VALUES (
  '660e8400-e29b-41d4-a716-446655440010',
  'coconut-hair-oil-bulk',
  '550e8400-e29b-41d4-a716-446655440002',
  'b1b2c3d4-0001-0001-0001-000000000003',
  'Coconut Hair Oil (Bulk)',
  'Wholesale coconut hair oil infused with curry leaf & hibiscus for salons, spas, and ayurvedic distributors. Indicative price Rs. 700 / litre — request a quote.',
  '<p>The bulk version of our traditional coconut hair oil — pure cold-pressed coconut oil infused with curry leaf and hibiscus, a recipe passed down for generations at our Padukka mill.</p><p>Supplied to salons, spas, ayurvedic centres, and private-label distributors. Available from 10 litres upward in sealed cans or custom containers; tell us your volume and packaging when you request a quote.</p><p>We typically respond within 24 hours with a tailored commercial price.</p>',
  '[
    {"label": "Minimum Order", "value": "10 litres"},
    {"label": "Base Oil", "value": "Cold-pressed coconut oil"},
    {"label": "Enriched With", "value": "Curry leaf, hibiscus"},
    {"label": "Indicative Price", "value": "Rs. 700 / litre (volume discounts apply)"},
    {"label": "Packaging", "value": "Sealed cans or custom"},
    {"label": "Lead Time", "value": "3–5 business days"}
  ]',
  700.00,
  'bulk_quote',
  false, true, 500,
  true, false, false,
  false, 0, 0,
  'Coconut Hair Oil — Bulk & Wholesale | Uggalla Oil Mills',
  'Wholesale coconut hair oil infused with curry leaf and hibiscus from Uggalla Oil Mills. For salons, spas and ayurvedic distributors. Request a quote.'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  short_description = EXCLUDED.short_description,
  base_price = EXCLUDED.base_price,
  updated_at = now();

-- Images for Coconut Hair Oil (Bulk)
INSERT INTO public.product_images (id, product_id, url, alt_text, display_order, is_primary)
VALUES
  ('880e8400-e29b-41d4-a716-446655440019', '660e8400-e29b-41d4-a716-446655440010',
   'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=800&q=80',
   'Coconut hair oil — bulk supply', 1, true),
  ('880e8400-e29b-41d4-a716-446655440020', '660e8400-e29b-41d4-a716-446655440010',
   'https://images.unsplash.com/photo-1515023115689-589c33041d3c?w=800&q=80',
   'Coconuts — source for hair oil', 2, false)
ON CONFLICT (id) DO NOTHING;
