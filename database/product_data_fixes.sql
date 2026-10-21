-- Canuck Motors product data fixes, checked against the GMB spec sheets, the old site data
-- and every product photo (19 Oct 2026). Run once in the Supabase SQL editor. Safe to run twice.
-- Plain ASCII on purpose: bullets are written as [*] and [.] and turned into real characters by chr().
begin;

-- 0. Repair bullets garbled by an earlier run (UTF-8 bullets that were read as Mac Roman)
update public.products set description = replace(replace(description, chr(8218) || chr(196) || chr(162), chr(8226)), chr(172) || chr(8721), chr(183))
where description like '%' || chr(8218) || chr(196) || chr(162) || '%' or description like '%' || chr(172) || chr(8721) || '%';

-- 1. Specifications decided from the photos
-- CM1253260: photo: chain sprocket, no pulley (GMB sheet: No; old site: Yes)
update public.product_specifications ps set spec_value = $t$No$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1253260' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$No$t$, 99 from public.products p where p.sku = 'CM1253260' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');
update public.product_specifications ps set spec_value = $t$2.22 inches$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1253260' and ps.spec_name = 'Hub Pilot Diameter';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Hub Pilot Diameter', $t$2.22 inches$t$, 99 from public.products p where p.sku = 'CM1253260' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Hub Pilot Diameter');
-- CM1253310: photo: chain sprocket, not a belt pulley
update public.product_specifications ps set spec_value = $t$No$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1253310' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$No$t$, 99 from public.products p where p.sku = 'CM1253310' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');
-- CM1259060: photo: chain sprocket, not a belt pulley
update public.product_specifications ps set spec_value = $t$No$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1259060' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$No$t$, 99 from public.products p where p.sku = 'CM1259060' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');
-- CM1307350: photo: chain sprocket, not a belt pulley
update public.product_specifications ps set spec_value = $t$No$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1307350' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$No$t$, 99 from public.products p where p.sku = 'CM1307350' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');
-- CM1253240: photo: bare shaft, no pulley (all three sources said Yes)
update public.product_specifications ps set spec_value = $t$No$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1253240' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$No$t$, 99 from public.products p where p.sku = 'CM1253240' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');
-- CM1467340AH: photo: ribbed pulley attached (no pulley spec before)
update public.product_specifications ps set spec_value = $t$Yes$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM1467340AH' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$Yes$t$, 99 from public.products p where p.sku = 'CM1467340AH' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');
-- CM190: photo: electric pump for Prius / CT200h (no specs before)
update public.product_specifications ps set spec_value = $t$Electric$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM190' and ps.spec_name = 'Water Pump Drive Type';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Water Pump Drive Type', $t$Electric$t$, 99 from public.products p where p.sku = 'CM190' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Water Pump Drive Type');
update public.product_specifications ps set spec_value = $t$No$t$ from public.products p where ps.product_id = p.id and p.sku = 'CM190' and ps.spec_name = 'Pulley Included';
insert into public.product_specifications (product_id, spec_name, spec_value, sort_order) select p.id, 'Pulley Included', $t$No$t$, 99 from public.products p where p.sku = 'CM190' and not exists (select 1 from public.product_specifications ps where ps.product_id = p.id and ps.spec_name = 'Pulley Included');

-- 2. Measurements written as inches ("2.35 IN" -> "2.35 inches")
update public.product_specifications set spec_value = regexp_replace(spec_value, '([0-9]+(\.[0-9]+)?) ?(IN|in|In)(\s|\(|$)', '\1 inches\4', 'g') where spec_value ~ '[0-9] ?(IN|in|In)(\s|\(|$)';

-- 3. OE numbers imported split across brand and number ("Ford 7T4Z 8501" + "D" -> Ford, 7T4Z8501D)
-- 3a. a split row whose joined number is already listed (or appears twice) is removed
delete from public.product_oe_numbers s
where s.oe_brand ~ '^[A-Za-z-]+ [^ ]*[0-9]' and s.oe_brand !~ '^[0-9]{4} - ' and (
  exists (select 1 from public.product_oe_numbers o where o.product_id = s.product_id and o.id <> s.id
    and o.oe_brand = split_part(s.oe_brand, ' ', 1)
    and o.oe_number = regexp_replace(substring(s.oe_brand from '[^ ]+ (.*)$') || s.oe_number, '[^A-Za-z0-9]', '', 'g'))
  or exists (select 1 from public.product_oe_numbers o where o.product_id = s.product_id and o.id < s.id
    and o.oe_brand ~ '^[A-Za-z-]+ [^ ]*[0-9]'
    and split_part(o.oe_brand, ' ', 1) = split_part(s.oe_brand, ' ', 1)
    and regexp_replace(substring(o.oe_brand from '[^ ]+ (.*)$') || o.oe_number, '[^A-Za-z0-9]', '', 'g')
      = regexp_replace(substring(s.oe_brand from '[^ ]+ (.*)$') || s.oe_number, '[^A-Za-z0-9]', '', 'g')));
-- 3b. the other split rows are joined
update public.product_oe_numbers set oe_number = regexp_replace(substring(oe_brand from '[^ ]+ (.*)$') || oe_number, '[^A-Za-z0-9]', '', 'g'),
  oe_brand = split_part(oe_brand, ' ', 1)
where oe_brand ~ '^[A-Za-z-]+ [^ ]*[0-9]' and oe_brand !~ '^[0-9]{4} - ';
-- (oe_number_norm is a generated column: the database updates it by itself)
-- engine sizes stored as OE numbers ("1998 - 1998 Isuzu Oasis L4 2.3L" / "2254cc")
delete from public.product_oe_numbers where oe_number ~ '^[0-9]+cc$' or oe_brand ~ '^[0-9]{4} - ';

-- 4. Other part numbers: drop exact duplicates and 'Undefined' rows that repeat an OE number; rename the rest
delete from public.product_interchanges a using public.product_interchanges b
where a.product_id = b.product_id and a.id > b.id and lower(coalesce(a.interchange_brand,'')) = lower(coalesce(b.interchange_brand,''))
  and upper(regexp_replace(a.interchange_number, '[^A-Za-z0-9]', '', 'g')) = upper(regexp_replace(b.interchange_number, '[^A-Za-z0-9]', '', 'g'));
delete from public.product_interchanges i where lower(coalesce(i.interchange_brand,'')) in ('undefined','') and exists (
  select 1 from public.product_oe_numbers o where o.product_id = i.product_id
  and upper(regexp_replace(o.oe_number, '[^A-Za-z0-9]', '', 'g')) = upper(regexp_replace(i.interchange_number, '[^A-Za-z0-9]', '', 'g')));
delete from public.product_interchanges i where lower(coalesce(i.interchange_brand,'')) in ('undefined','') and exists (
  select 1 from public.product_interchanges o where o.product_id = i.product_id and o.interchange_brand = 'Cross-reference' and o.interchange_number = i.interchange_number);
update public.product_interchanges set interchange_brand = 'Cross-reference' where lower(coalesce(interchange_brand,'')) in ('undefined','');

-- 5. Descriptions rebuilt so KEY FEATURES match the specifications exactly (87 products)
update public.products set description = replace(replace($t$Replacement engine water pump CM1152090.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, O-Ring
[*] Hub height 1.87 inches (47.5 mm) [.] hub pilot diameter 2.63 inches (66.8 mm)

OE CROSS-REFERENCE
11511433712, 11517527910

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1152090';
update public.products set description = replace(replace($t$Replacement engine water pump CM1152320 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 1.83 inches (46.5 mm) [.] hub diameter 2.44 inches (62 mm)

OE CROSS-REFERENCE
11517648827, 11518604888, 1201H8, 11517550484

APPLICATIONS
BMW 120i (2016); Mini Cooper (2007-2016), Cooper Countryman (2011-2016), Cooper Paceman (2013-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1152320';
update public.products set description = replace(replace($t$Replacement engine water pump CM1201270 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, O-Ring
[*] Hub height 2.57 inches (65.3 mm) [.] hub pilot diameter 2.39 inches (60.7 mm)

OE CROSS-REFERENCE
4448878, 4654390, 5010898AA

APPLICATIONS
Chrysler Town & Country (1990-2000), Dodge Caravan and Grand Caravan (1990-2000), Plymouth Voyager and Grand Voyager (1990-2000), Chrysler New Yorker, Imperial and Dynasty (1990-1993)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1201270';
update public.products set description = replace(replace($t$Replacement engine water pump CM1203041 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] 3 outlets
[*] In the box: Water Pump, Gasket, O-Ring, Pipe
[*] Hub height 4.51 inches (114.6 mm) [.] hub pilot diameter 5.41 inches (137.4 mm)

OE CROSS-REFERENCE
4851178AA, 53021018AB, 53020135

APPLICATIONS
Dodge Ram 1500/2500/3500 (1994-2003), Dakota (1993-2003), Durango (1998-2003), B-series vans (1993-1998), Jeep Grand Cherokee (1993-1998)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1203041';
update public.products set description = replace(replace($t$Replacement engine water pump CM1203072 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, O-Ring, Bushing
[*] Hub height 3.95 inches (100.3 mm) [.] hub pilot diameter 3.44 inches (87.4 mm)

APPLICATIONS
Dodge Ram 2500 (1994-2010), Ram 3500 (1994-2007) with 5.9L L6; Dodge D250/D350/W250/W350 (1989-1993); Chevrolet P30 and GMC P3500 3.9L

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1203072';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204230 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, O-Ring
[*] Hub height 2.53 inches (64.3 mm) [.] hub pilot diameter 3.66 inches (93 mm)

OE CROSS-REFERENCE
04781157AA, 4781157AC

APPLICATIONS
Chrysler Town & Country (2001-2007), Chrysler Voyager (2001-2003), Dodge Caravan and Grand Caravan (2001-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204230';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204350 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.97 inches (75.4 mm) [.] hub pilot diameter 5.41 inches (137.4 mm)

OE CROSS-REFERENCE
5179734AA, 53020873, 53022189AH

APPLICATIONS
Chrysler Aspen, Dodge Dakota, Durango, Nitro, Ram 1500, Jeep Commander, Grand Cherokee, Liberty, Mitsubishi Raider (2000-2013)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204350';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204400 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.29 inches (58.2 mm) [.] hub diameter 3.46 inches (87.9 mm)

OE CROSS-REFERENCE
68087367AA, 6.42e+011

APPLICATIONS
Dodge Sprinter 2500 (2007-2009), Sprinter 3500 (2007-2009); Freightliner Sprinter 2500 (2007-2021), Sprinter 3500 (2007-2021), Sprinter 3500XD (2018-2021); Jeep Grand Cherokee (2007-2009); Mercedes-Benz E320 (2007-2009), E350 (2011-2013), GL320 (2007-2009), GL350 (2010-2016), GLS350d (2017), ML320 (2007-2009), ML350 (2010-2014), R320 (2007-2009), R350 (2010-2012), S350 (2012), Sprinter 2500 (2010-2022), Sprinter 3500 (2010-2022), Sprinter 3500XD (2018-2022)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204400';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204410 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump w/ Pulley Attached, O-Ring, Bushing
[*] Hub height 3.35 inches (85.1 mm) [.] hub pilot diameter 3.48 inches (88.4 mm)

OE CROSS-REFERENCE
68003402AA, R8003402AB

APPLICATIONS
Ram and Dodge Ram 2500/3500/4500/5500 (2007-2012), Freightliner, Blue Bird, Gillig, Ford F-650/F-750 and other medium-duty trucks and buses (2007-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204410';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204420 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.03 inches (51.6 mm) [.] hub diameter 2.11 inches (53.6 mm)

OE CROSS-REFERENCE
7B0121011C, 4648952AE, 7B0 121 011 F, 7B0121011, 4648 952BB, 4648952BA

APPLICATIONS
Chrysler Town & Country (2008-2010); Dodge Grand Caravan (2008-2010); Volkswagen Routan (2009-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204420';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204430 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Gasket
[*] Hub height 4.03 inches (102.4 mm) [.] hub pilot diameter 4.75 inches (120.6 mm)

OE CROSS-REFERENCE
53022192AE, 53022192AK

APPLICATIONS
Chrysler Aspen (2009), Dodge Durango (2009), Dodge Ram 1500/2500/3500 (2009-2010), Ram 1500/2500/3500 (2011-2018), Ram 1500 Classic (2019-2024)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204430';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204450 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] 2 outlets
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.63 inches (66.8 mm) [.] hub pilot diameter 4.33 inches (110 mm)

OE CROSS-REFERENCE
5184321AE, 68087340AA, 68158680AA

APPLICATIONS
Chrysler 200, 300, Town & Country; Dodge Avenger, Challenger, Charger, Durango, Grand Caravan, Journey; Jeep Grand Cherokee; Ram 1500, ProMaster; Volkswagen Routan (2011-2023)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204450';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204460 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Gasket
[*] hub pilot diameter 4.28 inches (108.7 mm)

OE CROSS-REFERENCE
5038668AA, 53022340AC

APPLICATIONS
Chrysler 300 (2011-2023), Dodge Challenger and Charger (2011-2023), Dodge Durango (2011-2026), Jeep Grand Cherokee (2011-2023)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204460';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204500.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 3.19 inches (81 mm) [.] hub pilot diameter 4.33 inches (110 mm)

OE CROSS-REFERENCE
68079412AB, 68079412AC, 68079412AD, RL079412AB

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204500';
update public.products set description = replace(replace($t$Replacement engine water pump CM1204520 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, O-Ring
[*] Hub height 3.9 inches (99.1 mm) [.] hub pilot diameter 3.23 inches (82 mm)

OE CROSS-REFERENCE
68210961AA, 68414058AB

APPLICATIONS
Ram 2500, 3500, 4500 and 5500 (2013-2018)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1204520';
update public.products set description = replace(replace($t$Replacement engine water pump CM1251670.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] 3 outlets
[*] In the box: Water Pump, Gasket
[*] Hub height 5.73 inches (145.5 mm) [.] hub pilot diameter 2.62 inches (66.5 mm)

OE CROSS-REFERENCE
E7TZ8501A, E9TZ8501D, F3TZ8501A, 6L3Z8501A

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1251670';
update public.products set description = replace(replace($t$Replacement engine water pump CM1251770 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] 2 outlets
[*] In the box: Water Pump, Gasket
[*] Hub height 4.17 inches (105.9 mm) [.] hub pilot diameter 3.06 inches (77.7 mm)

OE CROSS-REFERENCE
F0TZ8501D, F7TZ8501AC, ZZL015010

APPLICATIONS
Ford Aerostar (1990-1997), Explorer (1991-2000), Ranger (1990-2000), Mazda B4000 (1994-2000), Mazda Navajo (1991-1994)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1251770';
update public.products set description = replace(replace($t$Replacement engine water pump CM1251850 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] 1 outlet
[*] In the box: Water Pump, Gasket
[*] Hub height 4.22 inches (107.2 mm) [.] hub pilot diameter 2.9 inches (73.7 mm)

OE CROSS-REFERENCE
5U3Z8501A, ZZR115010

APPLICATIONS
Ford Ranger (1995-2008), Ford Aerostar (1995-1997), Mazda B3000 (1995-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1251850';
update public.products set description = replace(replace($t$Replacement engine water pump CM1252101 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] 2 outlets
[*] In the box: Water Pump, Gasket, 2 O-Rings
[*] Hub height 5.65 inches (143.5 mm) [.] hub pilot diameter 2.91 inches (73.9 mm)

OE CROSS-REFERENCE
3L3Z8501DA, 5L3Z8501A, 6U7Z8501B

APPLICATIONS
Ford E-150 (1997-2003), Ford E-250 (1997-2003), Ford F-150 (1997-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1252101';
update public.products set description = replace(replace($t$Replacement engine water pump CM1252102.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.18 inches (106.2 mm) [.] hub pilot diameter 3.06 inches (77.7 mm)

OE CROSS-REFERENCE
6L2Z8501A, 97JM8505A, F77Z8501AD, 1F2215010, 1F8215010, 97JM8505AD

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1252102';
update public.products set description = replace(replace($t$Replacement engine water pump CM1252450 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.09 inches (78.5 mm) [.] hub pilot diameter 3.85 inches (97.8 mm)

OE CROSS-REFERENCE
4C3Z8501AB, 4C3Z8501AC, 7C3Z8501AC

APPLICATIONS
Ford E-350 Super Duty and E-450 Super Duty (2004-2010), E-350 Club Wagon (2004-2005), Excursion (2004-2005), F-250/F-350/F-450/F-550 Super Duty (2004-2007), Ford LCF (2006-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1252450';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.43 inches (87.1 mm) [.] hub pilot diameter 2.91 inches (73.9 mm)

OE CROSS-REFERENCE
4C3Z8501A, 4C3Z8501B, 7L3Z8501A

APPLICATIONS
Ford E-150/E-250 (2007-2009), Expedition (2007-2009), F-150 (2007-2008), F-250 (2007-2008), E-350/E-450 Super Duty (2010-2019), F-250/F-350 Super Duty (2010), F-450/F-550 Super Duty, Lincoln Navigator and Mark LT (2007-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253010';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253060 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, O-Ring
[*] Hub height 3.48 inches (88.4 mm) [.] hub pilot diameter 2.91 inches (73.9 mm)

OE CROSS-REFERENCE
AL3Z8501B

APPLICATIONS
Ford Expedition (2010-2014), Ford F-150 (2010), Lincoln Navigator (2010-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253060';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253240 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket
[*] Hub height 1.22 inches (31 mm) [.] hub pilot diameter 2.1 inches (53.3 mm)

OE CROSS-REFERENCE
9L8Z8501A, 9L8Z8501B, 9L8Z8501C

APPLICATIONS
Ford Escape (2009-2012), Ford Fusion (2010-2012), Mazda Tribute (2009-2011), Mercury Mariner (2009-2011), Mercury Milan (2010-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253240';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253250 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.85 inches (72.4 mm) [.] hub pilot diameter 2.91 inches (73.9 mm)

APPLICATIONS
Ford F-150 (2011-2016), Ford Transit-150/250/350 (2015-2020), Ford Expedition (2015-2017), Lincoln Navigator (2015-2017) with 3.5L V6

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253250';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253255.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket, O-Ring
[*] Hub height 2.86 inches (72.6 mm) [.] hub pilot diameter 2.16 inches (54.9 mm)

OE CROSS-REFERENCE
BL3Z8501C

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253255';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253260.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Standard rotation
[*] Chain drive
[*] Chain sprocket attached, no belt pulley
[*] In the box: Water Pump, Metal Gasket, O-Ring
[*] Hub height 0.91 inches (23.1 mm) [.] hub pilot diameter 2.22 inches (56.4 mm)

OE CROSS-REFERENCE
BR3Z8501A, BR3Z8501D, BR3Z8501E

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253260';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253265.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Metal Gasket, O-Ring

OE CROSS-REFERENCE
ER3Z8501C

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253265';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253270.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] 1 outlet
[*] In the box: Water Pump, O-Ring
[*] hub pilot diameter 2.23 inches (56.6 mm)

OE CROSS-REFERENCE
BR3Z8501C, BR3Z8501H

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253270';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253280 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket, O-Ring
[*] Hub height 2.85 inches (72.4 mm) [.] hub pilot diameter 2.91 inches (73.9 mm)

APPLICATIONS
Ford F-150 (2011-2017), Ford Mustang (2011-2017), Ford Transit-150/250/350/350 HD (2015-2019)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253280';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253285.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Metal Gasket, O-Ring
[*] Hub height 2.86 inches (72.6 mm) [.] hub pilot diameter 2.16 inches (54.9 mm)

OE CROSS-REFERENCE
ER3Z8501B

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253285';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253300 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 3.68 inches (93.5 mm) [.] hub pilot diameter 2.28 inches (57.9 mm)

OE CROSS-REFERENCE
7S7Z8501A, BE8Z8501A, BE8Z8501B

APPLICATIONS
Ford Escape (2013-2016), Ford Fiesta (2011-2019), Ford Fusion (2013-2014), Ford Transit Connect (2014-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253300';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253310.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Chain drive
[*] Chain sprocket attached, no belt pulley
[*] In the box: Water Pump, 2 Gaskets
[*] Hub height 1.96 inches (49.8 mm) [.] hub pilot diameter 1.91 inches (48.5 mm)

OE CROSS-REFERENCE
AA5Z8501C, DG1Z8501A

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253310';
update public.products set description = replace(replace($t$Replacement engine water pump CM1253460.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2 inches (50.8 mm) [.] hub pilot diameter 2.17 inches (55.1 mm)

OE CROSS-REFERENCE
EJ7Z8501A, EJ7Z8501B, EJ7Z8501C, EJ7Z8501D, EJ7Z8501F, EJ7Z8501G

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1253460';
update public.products set description = replace(replace($t$Replacement engine water pump CM1255930 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] 2 outlets
[*] In the box: Water Pump, Rubber Seal Ring, 3 O-Rings, 2 Bolts
[*] Hub height 4.22 inches (107.2 mm) [.] hub pilot diameter 2.91 inches (73.9 mm)

OE CROSS-REFERENCE
E6TZ8501AA, F81Z8501FA, E7TZ8501ARM

APPLICATIONS
Ford E-350 (1996-2003), E-450/E-550 Super Duty, Excursion (2000-2003), F-250/F-350/F-450/F-550 Super Duty (1999-2003)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1255930';
update public.products set description = replace(replace($t$Replacement engine water pump CM1256000 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 1.99 inches (50.5 mm)

OE CROSS-REFERENCE
1S7Z8501A, 4S4Z8501AA, 6M8Z8501AC

APPLICATIONS
Ford Escape, Focus, Fusion, Edge, Explorer, EcoSport, Ranger, Transit Connect; Mazda 3, 5, 6, CX-7, Tribute; Mercury Mariner and Milan; Lincoln MKZ (various years 2001-2023)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1256000';
update public.products set description = replace(replace($t$Replacement engine water pump CM1256050 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.43 inches (87.1 mm) [.] hub pilot diameter 2.9 inches (73.7 mm)

OE CROSS-REFERENCE
1L2Z8501BA, XL3Z8501AA, 5L2Z8501A

APPLICATIONS
Ford E-150/E-250/E-350 Econoline, F-150 (1997-2010), F-250/F-350 Super Duty (1999-2010), Expedition (1997-2006), Explorer (2002-2010), Excursion, Lincoln Navigator, Aviator, Mercury Mountaineer (2002-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1256050';
update public.products set description = replace(replace($t$Replacement engine water pump CM1256060 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.7 inches (43.2 mm) [.] hub pilot diameter 2.3 inches (58.4 mm)

OE CROSS-REFERENCE
2S7Z8501BA, 5L8Z8501A, 4373611

APPLICATIONS
Ford Escape (2003-2006), Ford Taurus (2003-2005), Mazda MPV (2003-2006), Mazda Tribute (2003-2006, 2008), Mercury Mariner (2005-2006), Mercury Sable (2003-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1256060';
update public.products set description = replace(replace($t$Replacement engine water pump CM1259050 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Shaft drive
[*] Hub height 4.24 inches (107.7 mm)

OE CROSS-REFERENCE
5F9Z 8501-A, 5F9Z8501BB

APPLICATIONS
Ford Five Hundred (2005-2007), Freestyle (2005-2007); Mercury Montego (2005-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1259050';
update public.products set description = replace(replace($t$Replacement engine water pump CM1259060 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Chain drive
[*] Chain sprocket attached, no belt pulley
[*] Hub height 1.93 inches (49 mm) [.] hub pilot diameter 1.79 inches (45.5 mm)

OE CROSS-REFERENCE
7T4Z8501B, AA5Z8501D, CY0115010

APPLICATIONS
Ford Edge (2007-2010), Flex (2009-2010), Fusion (2010-2012), Taurus (2008-2012), Lincoln MKS, MKT, MKX, MKZ, Mazda 6 and CX-9, Mercury Sable (2008-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1259060';
update public.products set description = replace(replace($t$Replacement engine water pump CM1301250 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Stamped steel impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] 1 outlet
[*] In the box: Water Pump, 3 Gaskets, Plug
[*] Hub height 6.93 inches (176 mm) [.] hub pilot diameter 2.66 inches (67.6 mm)

APPLICATIONS
Chevrolet, GMC, Buick, Pontiac, Oldsmobile cars, trucks and vans (1972-1996), 3.8L V6, 4.3L V6, 5.0L V8, 5.7L V8

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1301250';
update public.products set description = replace(replace($t$Replacement engine water pump CM1301480 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket, 5 Bolts
[*] Hub height 1.15 inches (29.2 mm) [.] hub pilot diameter 3.29 inches (83.6 mm)

APPLICATIONS
Buick, Chevrolet, Pontiac, Oldsmobile, Saturn and Cadillac V6 applications (1987-2007), 2.8L to 3.5L

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1301480';
update public.products set description = replace(replace($t$Replacement engine water pump CM1301820 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] 3 outlets
[*] In the box: Water Pump, 2 Gaskets
[*] Hub height 6.72 inches (170.7 mm) [.] hub pilot diameter 3.33 inches (84.6 mm)

APPLICATIONS
Chevrolet and GMC Silverado/Sierra 1500 (1999-2013), Express/Savana, Tahoe, Yukon, Astro, Blazer, S10, Sonoma (1996-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1301820';
update public.products set description = replace(replace($t$Replacement engine water pump CM1302050 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 1.9 inches (48.3 mm) [.] hub pilot diameter 2.28 inches (57.9 mm)

APPLICATIONS
Chevrolet Aveo (2009-2016), Aveo5, Cruze (2011-2016), Sonic (2012-2018), Trax (2013-2018), Pontiac G3, Saturn Astra

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1302050';
update public.products set description = replace(replace($t$Replacement engine water pump CM1302140 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] 1 outlet
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.17 inches (55.1 mm) [.] hub pilot diameter 1.73 inches (43.9 mm)

OE CROSS-REFERENCE
55484625, 55579016, 55599494

APPLICATIONS
Buick Encore (2013-2021), Chevrolet Cruze (2011-2016), Cruze Limited (2016), Sonic (2012-2020), Trax (2013-2021)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1302140';
update public.products set description = replace(replace($t$Replacement engine water pump CM1303020.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Metal Gasket

OE CROSS-REFERENCE
12669020, 12670051, 12670246, 12674637

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1303020';
update public.products set description = replace(replace($t$Replacement engine water pump CM1305130.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket, 6 Bolts
[*] Hub height 1.73 inches (43.9 mm) [.] hub pilot diameter 3.41 inches (86.6 mm)

OE CROSS-REFERENCE
12618472, 12637479, 12645176, 12657499, 19195148, 92149009

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1305130';
update public.products set description = replace(replace($t$Replacement engine water pump CM1307340 for the vehicles listed below.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Includes thermostat and housing
[*] 2 outlets
[*] In the box: Water Pump w/ Thermostat & Housing, 2 Metal Gaskets, Gasket
[*] Hub height 6.57 inches (166.9 mm) [.] hub pilot diameter 5.85 inches (148.6 mm)

OE CROSS-REFERENCE
12458935, 12556449

APPLICATIONS
Cadillac Escalade (2002-2006), Chevrolet Silverado 1500/2500/3500 (1999-2006), Avalanche, Suburban, Tahoe, Express, GMC Sierra, Savana, Yukon, Hummer H2 (2003-2006), Buick Rainier, Isuzu Ascender, Saab 9-7x

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1307340';
update public.products set description = replace(replace($t$Replacement engine water pump CM1307340AT for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Includes thermostat and housing
[*] 2 outlets
[*] In the box: Water Pump w/ Thermostat & Housing, 2 Metal Gaskets, Gasket
[*] Hub height 6.57 inches (166.9 mm) [.] hub pilot diameter 5.85 inches (148.6 mm)

OE CROSS-REFERENCE
8-88894290-0, 8-89017439-0, 8-89018166-0

APPLICATIONS
Buick Rainier (2004-2007); Cadillac Escalade (2002-2006), Escalade ESV (2003-2006), Escalade EXT (2002-2006); Chevrolet Avalanche 1500 (2002-2006), Avalanche 2500 (2002-2006), Express 1500 (2003-2007), Express 2500 (2003-2007), Express 3500 (2003-2007), SSR (2003-2006), Silverado 1500 (1999-2006), Silverado 1500 HD (2001-2006), Silverado 2500 (1999-2006), Silverado 2500 HD (2001-2006), Silverado 3500 (2001-2006), Sonora (2003-2006), Suburban 1500 (2000-2006), Suburban 2500 (2000-2006), Tahoe (2000-2006), Trailblazer (2006-2007), Trailblazer EXT (2003-2006); GMC Envoy (2005-2007), Envoy XL (2003-2006), Envoy XUV (2004-2005), Savana 1500 (2003-2007), Savana 2500 (2003-2007), Savana 3500 (2003-2007), Sierra 1500 (1999-2006), Sierra 1500 HD (2001-2006), Sierra 2500 (1999-2004), Sierra 2500 HD (2001-2006), Sierra 3500 (2001-2006), Yukon (2000-2006), Yukon XL 1500 (2000-2006), Yukon XL 2500 (2000-2006); Hummer H2 (2003-2006); Isuzu Ascender (2003-2006); Saab 9-7x (2005-2006); Workhorse FasTrack FT1061 (2004-2005), FasTrack FT1261 (2005), FasTrack FT1461 (2004-2005), FasTrack FT1601 (2004-2005), FasTrack FT1801 (2004-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1307340AT';
update public.products set description = replace(replace($t$Replacement engine water pump CM1307350.

KEY FEATURES
[*] Cast aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Chain drive
[*] Chain sprocket attached, no belt pulley
[*] In the box: Water Pump w/ Back Housing, Rubber Seal Ring
[*] Hub height 2.91 inches (73.9 mm) [.] hub pilot diameter 1.96 inches (49.8 mm)

OE CROSS-REFERENCE
24439797, 93172718, 12624936

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1307350';
update public.products set description = replace(replace($t$Replacement engine water pump CM1307700.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.15 inches (54.6 mm) [.] hub pilot diameter 3.31 inches (84.1 mm)

OE CROSS-REFERENCE
12620226, 8126202260

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1307700';
update public.products set description = replace(replace($t$Replacement engine water pump CM1309670.

KEY FEATURES
[*] Cast aluminum housing
[*] Stamped steel impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] 4 outlets
[*] In the box: Water Pump, 2 Metal Gaskets, 2 Bolts
[*] Hub height 6.9 inches (175.3 mm) [.] hub pilot diameter 5.84 inches (148.3 mm)

OE CROSS-REFERENCE
12587305, 12600767, 12681417, 19208815, 19253263, 8126007670

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1309670';
update public.products set description = replace(replace($t$Replacement engine water pump CM1351010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.19 inches (55.6 mm) [.] hub pilot diameter 5.2 inches (132.1 mm)

OE CROSS-REFERENCE
19200RMX003, 19200PZA013

APPLICATIONS
Acura Integra (2023-2024); Honda Accord (2018-2024), CR-V (2017-2024), Civic (2003-2024)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1351010';
update public.products set description = replace(replace($t$Replacement engine water pump CM1351260 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 1.75 inches (44.4 mm) [.] hub pilot diameter 2.21 inches (56.1 mm)

OE CROSS-REFERENCE
19200PM3000, 1610087705

APPLICATIONS
Honda Civic (1988-1995), Honda CRX (1988-1991), Honda Civic del Sol (1993-1995)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1351260';
update public.products set description = replace(replace($t$Replacement engine water pump CM1351280 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.9 inches (48.3 mm) [.] hub diameter 2.33 inches (59.2 mm)

OE CROSS-REFERENCE
19200P0A001, 5862023750, 19200P0BA01, GWP345, 19200PT0013, 19200PDAE01, 19200POBA01

APPLICATIONS
Acura CL (1997-1999); Honda Accord (1990-2002), Odyssey (1995-1998), Prelude (1992-1996); Isuzu Oasis (1996-1999)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1351280';
update public.products set description = replace(replace($t$Replacement engine water pump CM1351500 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 2.5 inches (63.5 mm) [.] hub pilot diameter 4.88 inches (124 mm)

OE CROSS-REFERENCE
19200RAAA01, 19200RBB003, 19200RFE003

APPLICATIONS
Honda Accord (2003-2007), Honda CR-V (2007-2009), Honda Element (2003-2011), Acura TSX (2004-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1351500';
update public.products set description = replace(replace($t$Replacement engine water pump CM1351530 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 1.41 inches (35.8 mm) [.] hub pilot diameter 2.52 inches (64 mm)

OE CROSS-REFERENCE
19200RDMA01

APPLICATIONS
Honda Accord (2003-2017), Odyssey (2005-2025), Pilot (2005-2022), Ridgeline, Passport (2019-2025); Acura MDX, TL, TLX, RL, RLX, RDX, TSX, ZDX; Saturn Vue (2004-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1351530';
update public.products set description = replace(replace($t$Replacement engine water pump CM1351640 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.15 inches (54.6 mm) [.] hub diameter 4.72 inches (119.9 mm)

OE CROSS-REFERENCE
192005A2A01

APPLICATIONS
Acura ILX (2016-2022), TLX (2015-2020); Honda Accord (2013-2017), CR-V (2015-2019), Civic (2016-2022)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1351640';
update public.products set description = replace(replace($t$Replacement engine water pump CM1352380 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 1.71 inches (43.4 mm) [.] hub pilot diameter 2.52 inches (64 mm)

OE CROSS-REFERENCE
19200P8A003, 19200P8AA02, 19200P8AA03

APPLICATIONS
Honda Accord (1998-2002), Odyssey (1999-2004), Pilot (2003-2004); Acura CL, TL, MDX (1997-2003)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1352380';
update public.products set description = replace(replace($t$Replacement engine water pump CM1352420 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 1.65 inches (41.9 mm) [.] hub pilot diameter 2.21 inches (56.1 mm)

OE CROSS-REFERENCE
19200PLC003, 19200PLE005, 19200PMEA01

APPLICATIONS
Honda Civic (2001-2005), Acura EL (2001-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1352420';
update public.products set description = replace(replace($t$Replacement engine water pump CM1352630 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket
[*] Hub height 2.99 inches (75.9 mm) [.] hub pilot diameter 2.8 inches (71.1 mm)

OE CROSS-REFERENCE
19200R1AA01, 19200R1PU01, 19200RZP003, 19200RZP013

APPLICATIONS
Acura ILX (2013-2015); Honda Civic (2012-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1352630';
update public.products set description = replace(replace($t$Replacement engine water pump CM1356980 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 3.01 inches (76.5 mm) [.] hub pilot diameter 2.52 inches (64 mm)

OE CROSS-REFERENCE
06192R1A305, 19200RNAA01, 19200RNAA02

APPLICATIONS
Honda Civic (2006-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1356980';
update public.products set description = replace(replace($t$Replacement engine water pump CM1452510 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.9 inches (48.3 mm) [.] hub diameter 1.95 inches (49.5 mm)

OE CROSS-REFERENCE
2S7Z8508AA, 3M4Z8501BG, 3M4Z8501BJ, 5M8E8501AD, 5M8Z8501A, 5M8Z8501B, AJTM15010, AJ0315010

APPLICATIONS
Ford Escape (2006-2008), Fusion (2006-2009); Lincoln Zephyr (2006); Mazda 6 (2003-2008); Mercury Mariner (2006-2008), Milan (2006-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1452510';
update public.products set description = replace(replace($t$Replacement engine water pump CM1452510AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Accessory belt drive
[*] Pulley included
[*] Includes back housing
[*] 3 outlets
[*] In the box: Water Pump w/ Back Housing
[*] Hub height 1.9 inches (48.3 mm) [.] hub pilot diameter 1.95 inches (49.5 mm)

OE CROSS-REFERENCE
AJTM15010, AJ5715010B

APPLICATIONS
Ford Escape (2006-2008), Fusion (2006-2009); Lincoln Zephyr (2006); Mazda 6 (2003-2008); Mercury Mariner (2006-2008), Milan (2006-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1452510AH';
update public.products set description = replace(replace($t$Replacement engine water pump CM1461230 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket, O-Ring, Bolt
[*] Hub height 3.65 inches (92.7 mm) [.] hub pilot diameter 2.05 inches (52.1 mm)

APPLICATIONS
Hyundai Accent (1996-1998, 2001-2011), Kia Rio and Rio5 (2006-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1461230';
update public.products set description = replace(replace($t$Replacement engine water pump CM1462020 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket
[*] Hub height 3.39 inches (86.1 mm) [.] hub pilot diameter 2.17 inches (55.1 mm)

OE CROSS-REFERENCE
2510023001, 2510023010

APPLICATIONS
Hyundai Elantra (1996-2010), Tiburon (1997-2001, 2003-2008), Tucson (2005-2009); Kia Spectra and Spectra5 (2004-2009), Sportage (2005-2010), Soul (2010-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1462020';
update public.products set description = replace(replace($t$Replacement engine water pump CM1467330 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] 1 outlet
[*] In the box: Water Pump, Metal Gasket, O-Ring
[*] Hub height 2.53 inches (64.3 mm) [.] hub pilot diameter 2.68 inches (68.1 mm)

OE CROSS-REFERENCE
251003C100, 251003C120, 452524C000

APPLICATIONS
Hyundai Azera, Entourage, Genesis, Genesis Coupe, Santa Fe, Sonata, Veracruz; Kia Amanti, Borrego, Sedona, Sorento (2006-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1467330';
update public.products set description = replace(replace($t$Replacement engine water pump CM1467340 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.52 inches (64 mm) [.] hub diameter 2.13 inches (54.1 mm)

OE CROSS-REFERENCE
251002G000, 1300A082

APPLICATIONS
Hyundai Santa Fe, Santa Fe Sport, Sonata, Tucson; Kia Forte, Forte5, Magentis, Optima, Rondo; Mitsubishi Lancer, Outlander, Outlander Sport, RVR (2006-2025)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1467340';
update public.products set description = replace(replace($t$Replacement engine water pump CM1467340AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Includes back housing
[*] In the box: Water Pump w/ Back Housing, 2 Gaskets
[*] Hub height 2.52 inches (64 mm) [.] hub pilot diameter 2.13 inches (54.1 mm)

OE CROSS-REFERENCE
251002G200

APPLICATIONS
Hyundai Santa Fe (2010-2012), Sonata (2006-2010), Tucson (2010-2012); Kia Forte (2010-2013), Forte Koup (2010-2012), Forte5 (2012-2013), Magentis (2007-2010), Optima (2006-2010), Rondo (2007-2009); Mitsubishi Lancer (2008-2017), Outlander (2008-2017), Outlander PHEV (2018-2019), Outlander Sport (2011-2017), RVR (2011-2017)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1467340AH';
update public.products set description = replace(replace($t$Replacement engine water pump CM1467420.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.2 inches (55.9 mm) [.] hub pilot diameter 2.63 inches (66.8 mm)

OE CROSS-REFERENCE
251002B000, 251002B700, 252212B000, PA10119

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1467420';
update public.products set description = replace(replace($t$Replacement engine water pump CM1482520.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.6 inches (66 mm) [.] hub pilot diameter 2.44 inches (62 mm)

OE CROSS-REFERENCE
1300A055

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1482520';
update public.products set description = replace(replace($t$Replacement engine water pump CM1502010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.9 inches (73.7 mm) [.] hub pilot diameter 4.07 inches (103.4 mm)

APPLICATIONS
Nissan Versa (2007-2012), Sentra (2007-2012), Cube (2009-2014), NV200 (2013-2021), Tiida (2007-2018), Chevrolet City Express (2015-2018)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1502010';
update public.products set description = replace(replace($t$Replacement engine water pump CM1502340.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.81 inches (71.4 mm) [.] hub diameter 3.82 inches (97 mm)

OE CROSS-REFERENCE
210106N225

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1502340';
update public.products set description = replace(replace($t$Replacement engine water pump CM1502340AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Includes back housing
[*] In the box: Water Pump, Metal Gasket
[*] Hub height 2.81 inches (71.4 mm) [.] hub pilot diameter 3.82 inches (97 mm)

APPLICATIONS
Nissan Altima (2002-2013), Rogue (2008-2013), Rogue Select (2014-2015), Sentra (2002-2012), X-Trail (2002-2020)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1502340AH';
update public.products set description = replace(replace($t$Replacement engine water pump CM1602090 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 3.66 inches (93 mm) [.] hub diameter 2.36 inches (59.9 mm)

OE CROSS-REFERENCE
21111AA280, 21111AA320

APPLICATIONS
Subaru Forester (2006-2010), Impreza (2006-2011), Legacy (2006-2012), Outback (2006-2012)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1602090';
update public.products set description = replace(replace($t$Replacement engine water pump CM1701770 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.95 inches (49.5 mm) [.] hub diameter 2.26 inches (57.4 mm)

OE CROSS-REFERENCE
41530A, SI82207, 1610079135, 161007913583, 1610079136, 161007918583, 1611079026, 161008000000

APPLICATIONS
Toyota Camry (1987-2001), Celica (1987-1999), MR2 (1991-1995), RAV4 (1996-2000), Solara (1999-2001)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1701770';
update public.products set description = replace(replace($t$Replacement engine water pump CM1701770AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Includes back housing
[*] 4 outlets
[*] In the box: Water Pump w/ Back Housing, Gasket, 3 O-Rings
[*] Hub height 1.95 inches (49.5 mm) [.] hub pilot diameter 2.26 inches (57.4 mm)

OE CROSS-REFERENCE
1610009040, 1610009041, 1610079075, 161007907577, 161007907584, 1610079185, 161007918583, 1610079186

APPLICATIONS
Toyota Camry (1987-2001), Celica (1987-1999), MR2 (1991-1995), RAV4 (1996-2000), Solara (1999-2001)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1701770AH';
update public.products set description = replace(replace($t$Replacement engine water pump CM1701980 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, O-Ring
[*] Hub height 2.76 inches (70.1 mm) [.] hub pilot diameter 3.54 inches (89.9 mm)

OE CROSS-REFERENCE
1610009080, 1610009230, 1610029095

APPLICATIONS
Toyota Corolla (1998-2008), Celica (2000-2005), Matrix (2003-2008), MR2 Spyder (2000-2006), Chevrolet Prizm (1998-2002), Pontiac Vibe (2003-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1701980';
update public.products set description = replace(replace($t$Replacement engine water pump CM1702101 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket
[*] Hub height 1.99 inches (50.5 mm) [.] hub pilot diameter 1.97 inches (50 mm)

OE CROSS-REFERENCE
1610029155, 1610029156, 1610029195

APPLICATIONS
Toyota Yaris (2004-2020), Prius (2001-2009), Echo (2000-2005), Scion xA and xB (2004-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1702101';
update public.products set description = replace(replace($t$Replacement engine water pump CM1702470 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Gasket
[*] Hub height 2.54 inches (64.5 mm) [.] hub pilot diameter 2.76 inches (70.1 mm)

OE CROSS-REFERENCE
161000H010, 161000H030, 1610028040

APPLICATIONS
Toyota Camry (2002-2018), Corolla (2009-2010), Matrix (2009-2013), RAV4 (2001-2008), Highlander (2001-2007), Solara, Scion tC, Lexus HS250h, Pontiac Vibe

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1702470';
update public.products set description = replace(replace($t$Replacement engine water pump CM1703020.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Drive belt drive
[*] No pulley
[*] Hub height 60.8 inches (1544.3 mm)

OE CROSS-REFERENCE
16100-09690

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1703020';
update public.products set description = replace(replace($t$Replacement engine water pump CM1703050.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Gasket
[*] Hub height 2.06 inches (52.3 mm) [.] hub pilot diameter 4.33 inches (110 mm)

OE CROSS-REFERENCE
1610009620, 1610039565

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1703050';
update public.products set description = replace(replace($t$Replacement engine water pump CM1704010.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.88 inches (47.8 mm) [.] hub pilot diameter 3.74 inches (95 mm)

OE CROSS-REFERENCE
1610009515, 1610009600, 1610039515

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1704010';
update public.products set description = replace(replace($t$Replacement engine water pump CM1707370 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] In the box: Water Pump, Shroud/Back Plate
[*] Hub height 2.55 inches (64.8 mm) [.] hub pilot diameter 2.76 inches (70.1 mm)

OE CROSS-REFERENCE
1610009440, 1610039455, 1610039456

APPLICATIONS
Toyota Camry (2007-2017), Avalon (2005-2018), Highlander (2008-2016), Sienna (2007-2016), RAV4 (2006-2012), Venza (2009-2016); Lexus ES350 (2007-2018), RX350 (2007-2015), RX450h (2010-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1707370';
update public.products set description = replace(replace($t$Replacement engine water pump CM1707480.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] In the box: Water Pump, Rubber Seal Ring
[*] Hub height 1.56 inches (39.6 mm) [.] hub pilot diameter 4.33 inches (110 mm)

OE CROSS-REFERENCE
19205246, 1610009500, 1610009501, 1610009560, 1610039465, 1610039466

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1707480';
update public.products set description = replace(replace($t$Replacement engine water pump CM1802220 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.81 inches (46 mm) [.] hub diameter 2.25 inches (57.1 mm)

OE CROSS-REFERENCE
06A121011H, 06A121011HX, 06A121011LV, 06A121011T, 06A121011G, 06A121012E, 038121012X, 06A121011HV

APPLICATIONS
Audi A4 (2001-2006), A4 Quattro (2001-2005), TT (2000-2006), TT Quattro (2000-2006); Volkswagen Beetle (1998-2005), Golf (1998-2006), Jetta (1999-2015), Passat (2000-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM1802220';
update public.products set description = replace(replace($t$Replacement engine water pump CM190 for the vehicles listed below.

KEY FEATURES
[*] Electric pump
[*] No pulley

OE CROSS-REFERENCE
161A0-39015, 161A0-29015

APPLICATIONS
Lexus CT200h (2011-2017); Toyota Prius (2010-2015), Prius C (2012-2019), Prius Plug-In (2012-2015), Prius V (2012-2017)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.$t$, '[*]', chr(8226)), '[.]', chr(183)) where sku = 'CM190';

commit;
