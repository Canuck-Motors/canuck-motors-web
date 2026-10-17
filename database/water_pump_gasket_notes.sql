-- Adds "Includes Water Pump Gasket" / "Includes O-Ring" to the fitment note of
-- each water pump, based on what the product photos show. Safe to run twice
-- (it skips notes that already say it).

-- 1) Gasket (55 pumps)
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes Water Pump Gasket')
from public.products p
where pf.product_id = p.id
  and p.sku in (
    'CM1252102','CM1253240','CM1253250','CM1253255','CM1253265','CM1253280','CM1253285',
    'CM1253300','CM1253310','CM1255930','CM1256060','CM1259060','CM1251670','CM1251770',
    'CM1251850','CM1252101','CM1301250','CM1301480','CM1301820','CM1302050','CM1302140',
    'CM1305130','CM1203041','CM1204350','CM1204430','CM1204450','CM1204460','CM1204500',
    'CM1307350','CM1307700','CM1309670','CM1351260','CM1351500','CM1351530','CM1352380',
    'CM1352420','CM1352630','CM1356980','CM1461230','CM1462020','CM1467330','CM1467340AH',
    'CM1467420','CM1482520','CM1502010','CM1701980','CM1702101','CM1702470','CM1703020',
    'CM1703050','CM1704010','CM1707370','CM1707480','CM1502340AH','CM1701770AH'
  )
  and coalesce(pf.comment, '') not ilike '%gasket%';

-- 2) O-Ring only (13 pumps)
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes O-Ring')
from public.products p
where pf.product_id = p.id
  and p.sku in (
    'CM1152090','CM1201270','CM1203072','CM1204230','CM1204410','CM1204520','CM1252450',
    'CM1253010','CM1253060','CM1253270','CM1253460','CM1256000','CM1256050'
  )
  and coalesce(pf.comment, '') not ilike '%o-ring%'
  and coalesce(pf.comment, '') not ilike '%o ring%';

-- 3) Pumps whose photos show BOTH a gasket and an O-Ring
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes O-Ring')
from public.products p
where pf.product_id = p.id
  and p.sku in (
    'CM1253250','CM1253255','CM1253265','CM1253280','CM1307350','CM1467340AH','CM1701770AH'
  )
  and coalesce(pf.comment, '') not ilike '%o-ring%'
  and coalesce(pf.comment, '') not ilike '%o ring%';

-- ===== Added after second photo check (pumps missed the first time) =====

-- 4) More pumps with a gasket
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes Water Pump Gasket')
from public.products p
where pf.product_id = p.id
  and p.sku in (
    'CM003','CM006','CM1204400','CM1204420','CM1259050','CM1303020','CM1307340AT',
    'CM1452510','CM1452510AH','CM1467340','CM1501610','CM1502340','CM1602090',
    'CM1701770','CM1901040'
  )
  and coalesce(pf.comment, '') not ilike '%gasket%';

-- 5) More pumps with an O-Ring only
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes O-Ring')
from public.products p
where pf.product_id = p.id
  and p.sku in ('CM1152320','CM1351010','CM1351280','CM1351640','CM1802220')
  and coalesce(pf.comment, '') not ilike '%o-ring%'
  and coalesce(pf.comment, '') not ilike '%o ring%';

-- 6) Gasket AND O-Ring (photo shows both)
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes O-Ring')
from public.products p
where pf.product_id = p.id
  and p.sku in ('CM006','CM1602090','CM1701770','CM1901040')
  and coalesce(pf.comment, '') not ilike '%o-ring%'
  and coalesce(pf.comment, '') not ilike '%o ring%';

-- 7) Pumps stored with a dash in the SKU (photo folder has no dash)
update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes Water Pump Gasket')
from public.products p
where pf.product_id = p.id
  and p.sku in ('CM150-1610','CM190-1040')
  and coalesce(pf.comment, '') not ilike '%gasket%';

update public.product_fitments pf
set comment = trim(both '; ' from coalesce(pf.comment, '') || '; Includes O-Ring')
from public.products p
where pf.product_id = p.id
  and p.sku = 'CM190-1040'
  and coalesce(pf.comment, '') not ilike '%o-ring%'
  and coalesce(pf.comment, '') not ilike '%o ring%';
