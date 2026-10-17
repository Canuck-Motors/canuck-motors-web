-- Fixes water pump specifications so they match the old Canuck Motors site.
-- Part 1 changes 38 values that were different. Part 2 adds 9 specs that were missing.
-- Safe to run twice. Variant parts (IM / AH) are not touched.

-- Part 1: correct values
update public.product_specifications s
set spec_value = v.spec_value
from (values
  ('1152290', 'Housing Material', 'Aluminum'),
  ('1202000', 'Water Pump Drive Type', 'Chain'),
  ('1204490', 'Pulley Included', 'Yes'),
  ('1207170', 'Impeller Material', 'Metal'),
  ('1207170', 'Impeller Rotation', 'Reverse'),
  ('1252101', 'Impeller Rotation', 'Reverse'),
  ('1253250', 'Water Pump Drive Type', 'Serpentine Belt'),
  ('1253260', 'Pulley Included', 'Yes'),
  ('1253260', 'Hub Pilot Diameter', '2.2 IN'),
  ('1253265', 'Water Pump Drive Type', 'Serpentine Belt'),
  ('1253270', 'Water Pump Drive Type', 'Serpentine Belt'),
  ('1253285', 'Pulley Included', 'Yes'),
  ('1253310', 'Impeller Rotation', 'Standard'),
  ('1253460', 'Impeller Material', 'Plastic'),
  ('1253470', 'Pulley Included', 'No'),
  ('1255920', 'Impeller Rotation', 'Reverse'),
  ('1255930', 'Impeller Rotation', 'Reverse'),
  ('1255950', 'Impeller Rotation', 'Reverse'),
  ('1259060', 'Impeller Rotation', 'Reverse'),
  ('1301480', 'Impeller Rotation', 'Reverse'),
  ('1302030', 'Includes Back Housing', 'No'),
  ('1302030', 'Impeller Rotation', 'Standard'),
  ('1303120', 'Pulley Included', 'Yes'),
  ('1307250', 'Housing Material', 'Cast Iron'),
  ('1307350', 'Includes Back Housing', 'No'),
  ('1307350', 'Impeller Material', 'Metal'),
  ('1307700', 'Impeller Rotation', 'Reverse'),
  ('1351010', 'Impeller Material', 'Metal'),
  ('1351390', 'Hub Pilot Diameter', '2.2 IN'),
  ('1467460', 'Impeller Rotation', 'Reverse'),
  ('1467460', 'Hub Height', '2.2 IN'),
  ('1467460', 'Hub Diameter (in)', '2.63 IN'),
  ('1472420', 'Impeller Rotation', 'Reverse'),
  ('1472420', 'Hub Height', '3.28 IN'),
  ('1472420', 'Hub Diameter (in)', '2.67 IN'),
  ('1502550', 'Hub Pilot Diameter', '2.2 IN'),
  ('1802310', 'Hub Pilot Diameter', '2.2 IN'),
  ('190-1040', 'Water Pump Drive Type', 'Serpentine Belt')
) as v(code, spec_name, spec_value)
join public.products p on regexp_replace(upper(p.sku), '^CM-?', '') = upper(v.code)
where s.product_id = p.id and s.spec_name = v.spec_name;

-- Part 2: add missing specs
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order)
select p.id, v.spec_name, v.spec_value, 30
from (values
  ('1253440', 'Water Pump Drive Type', 'Serpentine Belt'),
  ('1303020', 'Water Pump Drive Type', 'Serpentine Belt'),
  ('1305130', 'Includes Back Housing', 'No'),
  ('1305130', 'Pulley Included', 'No'),
  ('1305130', 'Housing Material', 'Aluminum'),
  ('1309670', 'Impeller Rotation', 'Reverse'),
  ('1351010', 'Hub Height', '2.19 IN'),
  ('1351010', 'Hub Pilot Diameter', '5.2 IN'),
  ('1472310', 'Pulley Included', 'Yes')
) as v(code, spec_name, spec_value)
join public.products p on regexp_replace(upper(p.sku), '^CM-?', '') = upper(v.code)
on conflict (product_id, spec_name) do nothing;
