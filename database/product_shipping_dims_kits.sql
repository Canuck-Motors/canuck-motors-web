-- Weight and box size for 28 brake pad kits (front + rear). Run once in the Supabase SQL editor,
-- after database/product_shipping_dims.sql (it adds the columns).
-- Source: the Amazon.ca listings, read on 2026-10-24. All kits share one box size (25.4 x 17.78 x 17.78 cm).
-- 'amazon_listing_default_weight' = exactly 2.7 kg, which many kits share, so it looks like a default.
-- Weigh a packed kit before relying on it.

update public.products p
set weight_kg = v.weight_kg, length_cm = v.l, width_cm = v.w, height_cm = v.h,
    shipping_dims_source = v.source, shipping_dims_verified = false
from (values
  ('CMK-914-1878', 3, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1044-1095', 3.02, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1084-967', 3.89, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1084SM-967SM', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1210-1212', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1210-1391', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1210-945S', 3.35, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1210-CM1354', 2.55, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1273-1274', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1295-1544', 2.87, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1324-1212', 3.3, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1324-1391', 3.32, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1327-1274', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1327-1326', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1327-1596', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1363-1194', 4, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1363-1707', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1543-1544', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1589-1326', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1593-1544', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK1623-1846', 3.05, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1737-905', 2.8, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1815-1916', 3.15, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK1843-1734', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK2087-1012', 4.45, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK2087-1602', 4.2, 25.4, 17.78, 17.78, 'amazon_listing'),
  ('CMK815-905', 2.7, 25.4, 17.78, 17.78, 'amazon_listing_default_weight'),
  ('CMK914-1086', 3, 25.4, 17.78, 17.78, 'amazon_listing')
) as v(sku, weight_kg, l, w, h, source)
where p.sku = v.sku;

-- Check: expect 154 products with data (126 + 28) and 111 without.
select count(*) filter (where weight_kg is not null) as with_data,
       count(*) filter (where weight_kg is null)     as without_data
from public.products where is_active = true;
