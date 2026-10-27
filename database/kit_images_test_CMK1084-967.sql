-- TEST for one kit: add the main image of the front set and of the rear set to CMK1084-967.
-- Front = CMK1084 or CM1084H, Rear = CMK967 or CM967H (whichever exists and has an image).
-- Re-uses the same files in storage (nothing is uploaded).

-- 1) Preview: you should see 2 rows (front + rear). If you see 0 or 1, tell me what this returns:
select p.sku, i.path
from products p
join lateral (
  select path from product_images where product_id = p.id order by sort_order, id limit 1
) i on true
where p.sku in ('CMK1084','CM1084H','CMK967','CM967H');

-- 1b) If the preview is empty, see what SKUs/images exist for these parts:
-- select p.sku, count(i.id) images from products p left join product_images i on i.product_id=p.id
-- where p.sku ilike '%1084%' or p.sku ilike '%967%' group by p.sku order by p.sku;

-- 2) Add them after the kit's own image(s)
insert into product_images (product_id, path, sort_order)
select kit.id, src.path,
       coalesce((select max(sort_order) from product_images where product_id = kit.id), 0) + src.pos
from products kit
join (
  select distinct on (pos) pos, path from (
    select case when p.sku in ('CMK1084','CM1084H') then 1 else 2 end as pos,
           (select path from product_images where product_id = p.id order by sort_order, id limit 1) as path
    from products p
    where p.sku in ('CMK1084','CM1084H','CMK967','CM967H')
  ) x where path is not null order by pos
) src on true
where kit.sku = 'CMK1084-967'
on conflict (product_id, path) do nothing;

-- Check: should list 3 images
select p.sku, i.path, i.sort_order from product_images i join products p on p.id=i.product_id
where p.sku = 'CMK1084-967' order by i.sort_order;
