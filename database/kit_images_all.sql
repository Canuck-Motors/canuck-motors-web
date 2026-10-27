-- Add the front-set and rear-set photo to EVERY two-SKU brake pad kit (SKU like CMK1084-967).
-- Kit CMK1084-967 -> front CM1084H, rear CM967H (ceramic);  CMK1084SM-967SM -> CM1084HSM / CM967HSM.
-- Also accepts singles named CMK1084 / CM1084 if that is how they are stored.
-- Re-uses the same files in storage (nothing is uploaded). Safe to run twice (no duplicates).

-- ===== STEP 1: PREVIEW (read only). Check this before running step 2. =====
with kits as (
  select p.id as kit_id, p.sku as kit_sku, m[1] as a, m[2] as b
  from products p,
       lateral regexp_match(p.sku, '^CMK-?([A-Za-z0-9]+)-([A-Za-z0-9]+)$') m
  where m is not null
),
parts as (            -- one row per kit per position (1 = first SKU, 2 = second SKU)
  select kit_id, kit_sku, 1 as pos, a as tok from kits
  union all
  select kit_id, kit_sku, 2, b from kits
),
cands as (            -- possible single-SKU names for each part, best guess first
  select kit_id, kit_sku, pos, tok,
         regexp_replace(tok, '^CM', '') as t2
  from parts
),
names as (
  select kit_id, kit_sku, pos, 1 as pri, 'CM' || substring(t2 from '^\d+') || 'H' || coalesce(substring(t2 from '^\d+(.*)$'), '') as cand from cands
  union all select kit_id, kit_sku, pos, 2, 'CMK' || t2 from cands
  union all select kit_id, kit_sku, pos, 3, 'CM' || t2 from cands
  union all select kit_id, kit_sku, pos, 4, tok from cands
),
resolved as (         -- first candidate that exists AND has an image
  select distinct on (n.kit_id, n.pos)
         n.kit_id, n.kit_sku, n.pos, sp.sku as part_sku, img.path
  from names n
  join products sp on sp.sku = n.cand and sp.id <> n.kit_id
  join lateral (
    select path from product_images where product_id = sp.id order by sort_order, id limit 1
  ) img on true
  order by n.kit_id, n.pos, n.pri
)
select k.kit_sku,
       f.part_sku as front_found, r.part_sku as rear_found,
       case when f.part_sku is null or r.part_sku is null then 'MISSING - check' else 'ok' end as status
from kits k
left join resolved f on f.kit_id = k.kit_id and f.pos = 1
left join resolved r on r.kit_id = k.kit_id and r.pos = 2
order by status desc, k.kit_sku;

-- ===== STEP 2: INSERT (run only after the preview looks right) =====
-- Adds whichever of the two images were found, after the kit's own images.
with kits as (
  select p.id as kit_id, p.sku as kit_sku, m[1] as a, m[2] as b
  from products p,
       lateral regexp_match(p.sku, '^CMK-?([A-Za-z0-9]+)-([A-Za-z0-9]+)$') m
  where m is not null
),
parts as (            -- one row per kit per position (1 = first SKU, 2 = second SKU)
  select kit_id, kit_sku, 1 as pos, a as tok from kits
  union all
  select kit_id, kit_sku, 2, b from kits
),
cands as (            -- possible single-SKU names for each part, best guess first
  select kit_id, kit_sku, pos, tok,
         regexp_replace(tok, '^CM', '') as t2
  from parts
),
names as (
  select kit_id, kit_sku, pos, 1 as pri, 'CM' || substring(t2 from '^\d+') || 'H' || coalesce(substring(t2 from '^\d+(.*)$'), '') as cand from cands
  union all select kit_id, kit_sku, pos, 2, 'CMK' || t2 from cands
  union all select kit_id, kit_sku, pos, 3, 'CM' || t2 from cands
  union all select kit_id, kit_sku, pos, 4, tok from cands
),
resolved as (         -- first candidate that exists AND has an image
  select distinct on (n.kit_id, n.pos)
         n.kit_id, n.kit_sku, n.pos, sp.sku as part_sku, img.path
  from names n
  join products sp on sp.sku = n.cand and sp.id <> n.kit_id
  join lateral (
    select path from product_images where product_id = sp.id order by sort_order, id limit 1
  ) img on true
  order by n.kit_id, n.pos, n.pri
)
insert into product_images (product_id, path, sort_order)
select r.kit_id, r.path,
       coalesce((select max(sort_order) from product_images where product_id = r.kit_id), 0) + r.pos
from resolved r
on conflict (product_id, path) do nothing;

-- ===== STEP 3: CHECK - image count per kit (should be 3 for resolved kits) =====
select p.sku, count(i.id) as images
from products p left join product_images i on i.product_id = p.id
where p.sku ~ '^CMK-?[A-Za-z0-9]+-[A-Za-z0-9]+$'
group by p.sku order by images, p.sku;
