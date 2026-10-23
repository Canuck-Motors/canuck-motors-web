-- OE numbers for Drum Brake Shoe 945CM (Toyota / Scion xD rear shoes)
insert into public.product_oe_numbers (product_id, oe_brand, oe_number)
select p.id, v.oe_brand, v.oe_number
from public.products p
cross join (values
  ('TOYOTA', '04495-52120'),
  ('TOYOTA', '44950-2211'),
  ('TOYOTA', '44950-2212'),
  ('TOYOTA', '44955-2121')
) as v(oe_brand, oe_number)
where upper(p.sku) = '945CM'
  and not exists (
    select 1 from public.product_oe_numbers o
    where o.product_id = p.id
      and regexp_replace(upper(o.oe_number), '[^A-Z0-9]', '', 'g')
        = regexp_replace(upper(v.oe_number), '[^A-Z0-9]', '', 'g')
  );

select count(*) as oe_numbers_on_945cm
from public.product_oe_numbers o
join public.products p on p.id = o.product_id
where upper(p.sku) = '945CM';
