-- Write "inches" instead of "in" for measurements, e.g. "Hub height 2.29 in (58 mm)"
-- -> "Hub height 2.29 inches (58 mm)". The inch-to-mm numbers were checked: all correct.
-- Touches product descriptions and specification values only. Safe to run twice.

-- Descriptions: "2.29 in (58 mm)" -> "2.29 inches (58 mm)"  (about 72 products)
update public.products
set description = regexp_replace(description, '([0-9]+(\.[0-9]+)?) in \(', '\1 inches (', 'g')
where description ~ '[0-9] in \(';

-- Specifications: "2.35 IN", "0.685 in (17.4 mm)" -> "2.35 inches", "0.685 inches (17.4 mm)"
update public.product_specifications
set spec_value = regexp_replace(spec_value, '([0-9]+(\.[0-9]+)?) ?(IN|in|In)(\s|\(|$)', '\1 inches\4', 'g')
where spec_value ~ '[0-9] ?(IN|in|In)(\s|\(|$)';
