-- CM1253260: use the GMB spec sheet (Tooling/new-data-modified/1253260.xlsx), which matches
-- the product photo: chain-driven pump, NO pulley. The old site said "Pulley Included: Yes".
-- Safe to run twice.
update public.product_specifications ps set spec_value = 'No'
from public.products p
where ps.product_id = p.id and p.sku = 'CM1253260' and ps.spec_name = 'Pulley Included';

update public.product_specifications ps set spec_value = '2.22 inches'
from public.products p
where ps.product_id = p.id and p.sku = 'CM1253260' and ps.spec_name = 'Hub Pilot Diameter';

update public.products set description = 'Replacement engine water pump CM1253260.

KEY FEATURES
' || chr(8226) || ' Cast aluminum housing
' || chr(8226) || ' Stamped steel impeller
' || chr(8226) || ' Standard rotation
' || chr(8226) || ' Chain drive
' || chr(8226) || ' No pulley
' || chr(8226) || ' Includes metal gasket and O-ring
' || chr(8226) || ' Hub height 0.91 inches (23.1 mm) ' || chr(183) || ' hub pilot diameter 2.22 inches (56.4 mm)

OE CROSS-REFERENCE
BR3Z8501A, BR3Z8501D, BR3Z8501E

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.'
where sku = 'CM1253260';
