-- Water pump descriptions, meta descriptions and title tags.
-- Built only from specs confirmed on outside listings and matched to each CM number.
-- Bullets are written as [*] and turned into real bullets by the query, so the file is plain ASCII.
-- Only touches description, meta_description, title_tag. Safe to run twice.
update public.products p set description = replace(replace(d.description, '[*]', chr(8226)), '[.]', chr(183)), meta_description = d.meta_description, title_tag = d.title_tag
from (values
  ('CM1253010','Replacement engine water pump CM1253010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.43 in (87 mm) [.] hub diameter 2.91 in (74 mm)

OE CROSS-REFERENCE
4C3Z8501A, 4C3Z8501B, 7L3Z8501A

APPLICATIONS
Ford E-150/E-250 (2007-2009), Expedition (2007-2009), F-150 (2007-2008), F-250 (2007-2008), E-350/E-450 Super Duty (2010-2019), F-250/F-350 Super Duty (2010), F-450/F-550 Super Duty, Lincoln Navigator and Mark LT (2007-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253010 engine water pump for Ford E-150/E-250. Quality replacement water pump from Canuck Motors, Canada.','CM1253010 Engine Water Pump | Canuck Motors'),
  ('CM1252450','Replacement engine water pump CM1252450 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.09 in (78 mm) [.] hub diameter 3.85 in (98 mm)

OE CROSS-REFERENCE
4C3Z8501AB, 4C3Z8501AC, 7C3Z8501AC

APPLICATIONS
Ford E-350 Super Duty and E-450 Super Duty (2004-2010), E-350 Club Wagon (2004-2005), Excursion (2004-2005), F-250/F-350/F-450/F-550 Super Duty (2004-2007), Ford LCF (2006-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1252450 engine water pump for Ford E-350 Super Duty and E-450 Super Duty. Quality replacement water pump from Canuck Motors, Canada.','CM1252450 Engine Water Pump | Canuck Motors'),
  ('CM1253000','Replacement engine water pump CM1253000 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.92 in (100 mm) [.] hub diameter 3.7 in (94 mm)

OE CROSS-REFERENCE
8C3Z8501B

APPLICATIONS
Ford F-250/F-350/F-450/F-550 Super Duty (2008-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253000 engine water pump for Ford F-250/F-350/F-450/F-550 Super Duty. Quality replacement water pump from Canuck Motors, Canada.','CM1253000 Engine Water Pump | Canuck Motors'),
  ('CM1253240','Replacement engine water pump CM1253240 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.22 in (31 mm) [.] hub diameter 2.1 in (53 mm)

OE CROSS-REFERENCE
9L8Z8501A, 9L8Z8501B, 9L8Z8501C

APPLICATIONS
Ford Escape (2009-2012), Ford Fusion (2010-2012), Mazda Tribute (2009-2011), Mercury Mariner (2009-2011), Mercury Milan (2010-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253240 engine water pump for Ford Escape. Quality replacement water pump from Canuck Motors, Canada.','CM1253240 Engine Water Pump | Canuck Motors'),
  ('CM1253300','Replacement engine water pump CM1253300 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.68 in (93 mm) [.] hub diameter 2.28 in (58 mm)

OE CROSS-REFERENCE
7S7Z8501A, BE8Z8501A, BE8Z8501B

APPLICATIONS
Ford Escape (2013-2016), Ford Fiesta (2011-2019), Ford Fusion (2013-2014), Ford Transit Connect (2014-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253300 engine water pump for Ford Escape. Quality replacement water pump from Canuck Motors, Canada.','CM1253300 Engine Water Pump | Canuck Motors'),
  ('CM1253320','Replacement engine water pump CM1253320 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 5.08 in (129 mm) [.] hub diameter 2.36 in (60 mm)

OE CROSS-REFERENCE
4G7Z8501AA, 7R3Z8501A, 7R3Z8501BB

APPLICATIONS
Ford Mustang (2007-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253320 engine water pump for Ford Mustang. Quality replacement water pump from Canuck Motors, Canada.','CM1253320 Engine Water Pump | Canuck Motors'),
  ('CM1253340','Replacement engine water pump CM1253340 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: partcatalog: 2 rubber gaskets

APPLICATIONS
Ford Edge, Explorer and Flex (2011-2012), Lincoln MKS, MKT and MKX (2011-2012), Mazda 6 (2011-2013), Mazda CX-9 (2011-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253340 engine water pump for Ford Edge. Quality replacement water pump from Canuck Motors, Canada.','CM1253340 Engine Water Pump | Canuck Motors'),
  ('CM1253280','Replacement engine water pump CM1253280 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: partcatalog: 1 metal gasket + 2 o-rings

APPLICATIONS
Ford F-150 (2011-2017), Ford Mustang (2011-2017), Ford Transit-150/250/350/350 HD (2015-2019)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253280 engine water pump for Ford F-150. Quality replacement water pump from Canuck Motors, Canada.','CM1253280 Engine Water Pump | Canuck Motors'),
  ('CM1255930','Replacement engine water pump CM1255930 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.22 in (107 mm) [.] hub diameter 2.91 in (74 mm)

OE CROSS-REFERENCE
E6TZ8501AA, F81Z8501FA, E7TZ8501ARM

APPLICATIONS
Ford E-350 (1996-2003), E-450/E-550 Super Duty, Excursion (2000-2003), F-250/F-350/F-450/F-550 Super Duty (1999-2003)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1255930 engine water pump for Ford E-350. Quality replacement water pump from Canuck Motors, Canada.','CM1255930 Engine Water Pump | Canuck Motors'),
  ('CM1255950','Replacement engine water pump CM1255950 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.42 in (87 mm) [.] hub diameter 2.91 in (74 mm)

OE CROSS-REFERENCE
5R3Z8501A, YR3Z8501AB, XR3Z8501AA

APPLICATIONS
Ford Mustang (1999-2009), Ford Crown Victoria (1999-2002)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1255950 engine water pump for Ford Mustang. Quality replacement water pump from Canuck Motors, Canada.','CM1255950 Engine Water Pump | Canuck Motors'),
  ('CM1256000','Replacement engine water pump CM1256000 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 1.99 in (51 mm)

OE CROSS-REFERENCE
1S7Z8501A, 4S4Z8501AA, 6M8Z8501AC

APPLICATIONS
Ford Escape, Focus, Fusion, Edge, Explorer, EcoSport, Ranger, Transit Connect; Mazda 3, 5, 6, CX-7, Tribute; Mercury Mariner and Milan; Lincoln MKZ (various years 2001-2023)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1256000 engine water pump for Ford Escape. Quality replacement water pump from Canuck Motors, Canada.','CM1256000 Engine Water Pump | Canuck Motors'),
  ('CM1256050','Replacement engine water pump CM1256050 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.43 in (87 mm) [.] hub diameter 2.9 in (74 mm)

OE CROSS-REFERENCE
1L2Z8501BA, XL3Z8501AA, 5L2Z8501A

APPLICATIONS
Ford E-150/E-250/E-350 Econoline, F-150 (1997-2010), F-250/F-350 Super Duty (1999-2010), Expedition (1997-2006), Explorer (2002-2010), Excursion, Lincoln Navigator, Aviator, Mercury Mountaineer (2002-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1256050 engine water pump for Ford E-150/E-250/E-350 Econoline. Quality replacement water pump from Canuck Motors, Canada.','CM1256050 Engine Water Pump | Canuck Motors'),
  ('CM1256060','Replacement engine water pump CM1256060 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.7 in (43 mm) [.] hub diameter 2.3 in (58 mm)

OE CROSS-REFERENCE
2S7Z8501BA, 5L8Z8501A, 4373611

APPLICATIONS
Ford Escape (2003-2006), Ford Taurus (2003-2005), Mazda MPV (2003-2006), Mazda Tribute (2003-2006, 2008), Mercury Mariner (2005-2006), Mercury Sable (2003-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1256060 engine water pump for Ford Escape. Quality replacement water pump from Canuck Motors, Canada.','CM1256060 Engine Water Pump | Canuck Motors'),
  ('CM1259060','Replacement engine water pump CM1259060 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 1.93 in (49 mm) [.] hub diameter 1.79 in (45 mm)

OE CROSS-REFERENCE
7T4Z8501B, AA5Z8501D, CY0115010

APPLICATIONS
Ford Edge (2007-2010), Flex (2009-2010), Fusion (2010-2012), Taurus (2008-2012), Lincoln MKS, MKT, MKX, MKZ, Mazda 6 and CX-9, Mercury Sable (2008-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1259060 engine water pump for Ford Edge. Quality replacement water pump from Canuck Motors, Canada.','CM1259060 Engine Water Pump | Canuck Motors'),
  ('CM1301700','Replacement engine water pump CM1301700 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 7.28 in (185 mm) [.] hub diameter 2.62 in (67 mm)

OE CROSS-REFERENCE
10081980, 12456326, 88926236

APPLICATIONS
Chevrolet and GMC C/K 2500 and 3500 trucks, Suburban, G30/G3500 vans, Express and Savana 3500 (1988-2000)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1301700 engine water pump for Chevrolet and GMC C/K 2500 and 3500 trucks. Quality replacement water pump from Canuck Motors, Canada.','CM1301700 Engine Water Pump | Canuck Motors'),
  ('CM1301830','Replacement engine water pump CM1301830 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.84 in (123 mm) [.] hub diameter 3.19 in (81 mm)

OE CROSS-REFERENCE
12514574, 88894044, 5743241

APPLICATIONS
Chevrolet and GMC C/K 1500, 2500 and 3500 trucks, Suburban, Tahoe and Yukon, Express/Savana vans, Workhorse P-series, AM General Hummer (1988-1996)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1301830 engine water pump for Chevrolet and GMC C/K 1500. Quality replacement water pump from Canuck Motors, Canada.','CM1301830 Engine Water Pump | Canuck Motors'),
  ('CM1302030','Replacement engine water pump CM1302030 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 1.43 in (36 mm) [.] hub diameter 3.58 in (91 mm)

OE CROSS-REFERENCE
97372515, 98031233, 98025501

APPLICATIONS
Chevrolet Silverado and GMC Sierra 2500 HD/3500 HD (2006-2016), Express and Savana 2500/3500 (2006-2016), Kodiak/Topkick C4500-C5500 (2006-2009), Workhorse LF72

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1302030 engine water pump for Chevrolet Silverado and GMC Sierra 2500 HD/3500 HD. Quality replacement water pump from Canuck Motors, Canada.','CM1302030 Engine Water Pump | Canuck Motors'),
  ('CM1302140','Replacement engine water pump CM1302140 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.17 in (55 mm) [.] hub diameter 1.73 in (44 mm)

OE CROSS-REFERENCE
55484625, 55579016, 55599494

APPLICATIONS
Buick Encore (2013-2021), Chevrolet Cruze (2011-2016), Cruze Limited (2016), Sonic (2012-2020), Trax (2013-2021)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1302140 engine water pump for Buick Encore. Quality replacement water pump from Canuck Motors, Canada.','CM1302140 Engine Water Pump | Canuck Motors'),
  ('CM1101080','Replacement engine water pump CM1101080 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.35 in (60 mm) [.] hub diameter 3.29 in (84 mm)

OE CROSS-REFERENCE
4626215, 83503407, 85503407

APPLICATIONS
Jeep Cherokee (1987-2001), Comanche (1987-1992), Wagoneer (1987-1990), Eagle Premier (1988-1989)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1101080 engine water pump for Jeep Cherokee. Quality replacement water pump from Canuck Motors, Canada.','CM1101080 Engine Water Pump | Canuck Motors'),
  ('CM1201270','Replacement engine water pump CM1201270 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.57 in (65 mm) [.] hub diameter 2.39 in (61 mm)

OE CROSS-REFERENCE
4448878, 4654390, 5010898AA

APPLICATIONS
Chrysler Town & Country (1990-2000), Dodge Caravan and Grand Caravan (1990-2000), Plymouth Voyager and Grand Voyager (1990-2000), Chrysler New Yorker, Imperial and Dynasty (1990-1993)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1201270 engine water pump for Chrysler Town & Country. Quality replacement water pump from Canuck Motors, Canada.','CM1201270 Engine Water Pump | Canuck Motors'),
  ('CM1202010','Replacement engine water pump CM1202010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.39 in (61 mm) [.] hub diameter 3.23 in (82 mm)

OE CROSS-REFERENCE
4666044AA, 4666044BA, 4666044BB

APPLICATIONS
Jeep Wrangler (2007-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1202010 engine water pump for Jeep Wrangler. Quality replacement water pump from Canuck Motors, Canada.','CM1202010 Engine Water Pump | Canuck Motors'),
  ('CM1203041','Replacement engine water pump CM1203041 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 4.51 in (115 mm) [.] hub diameter 5.41 in (137 mm)

OE CROSS-REFERENCE
4851178AA, 53021018AB, 53020135

APPLICATIONS
Dodge Ram 1500/2500/3500 (1994-2003), Dakota (1993-2003), Durango (1998-2003), B-series vans (1993-1998), Jeep Grand Cherokee (1993-1998)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1203041 engine water pump for Dodge Ram 1500/2500/3500. Quality replacement water pump from Canuck Motors, Canada.','CM1203041 Engine Water Pump | Canuck Motors'),
  ('CM1204220','Replacement engine water pump CM1204220 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 3.21 in (82 mm) [.] hub diameter 2.33 in (59 mm)

OE CROSS-REFERENCE
04884159AA, 4694307AF, 4694309

APPLICATIONS
Chrysler Cirrus, PT Cruiser, Sebring; Dodge Caravan, Stratus; Jeep Liberty (2002-2005), TJ/Wrangler (2003-2006); Plymouth Breeze, Voyager (1995-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204220 engine water pump for Chrysler Cirrus. Quality replacement water pump from Canuck Motors, Canada.','CM1204220 Engine Water Pump | Canuck Motors'),
  ('CM1204230','Replacement engine water pump CM1204230 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.53 in (64 mm) [.] hub diameter 3.66 in (93 mm)

OE CROSS-REFERENCE
04781157AA, 4781157AC

APPLICATIONS
Chrysler Town & Country (2001-2007), Chrysler Voyager (2001-2003), Dodge Caravan and Grand Caravan (2001-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204230 engine water pump for Chrysler Town & Country. Quality replacement water pump from Canuck Motors, Canada.','CM1204230 Engine Water Pump | Canuck Motors'),
  ('CM1204340','Replacement engine water pump CM1204340 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.72 in (69 mm) [.] hub diameter 3.85 in (98 mm)

OE CROSS-REFERENCE
5012366AA, 53010378AC, 53010417

APPLICATIONS
Jeep Grand Cherokee (1999-2004), Jeep TJ and Wrangler (2000-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204340 engine water pump for Jeep Grand Cherokee. Quality replacement water pump from Canuck Motors, Canada.','CM1204340 Engine Water Pump | Canuck Motors'),
  ('CM1204350','Replacement engine water pump CM1204350 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.97 in (75 mm) [.] hub diameter 5.41 in (137 mm)

OE CROSS-REFERENCE
5179734AA, 53020873, 53022189AH

APPLICATIONS
Chrysler Aspen, Dodge Dakota, Durango, Nitro, Ram 1500, Jeep Commander, Grand Cherokee, Liberty, Mitsubishi Raider (2000-2013)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204350 engine water pump for Chrysler Aspen. Quality replacement water pump from Canuck Motors, Canada.','CM1204350 Engine Water Pump | Canuck Motors'),
  ('CM1152090','Replacement engine water pump CM1152090.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 1.87 in (47 mm) [.] hub diameter 2.63 in (67 mm)

OE CROSS-REFERENCE
11511433712, 11517527910

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1152090 engine water pump for BMW 3 Series. Quality replacement water pump from Canuck Motors, Canada.','CM1152090 Engine Water Pump | Canuck Motors'),
  ('CM1802290','Replacement engine water pump CM1802290.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 1.24 in (31 mm) [.] hub diameter 1.17 in (30 mm)

OE CROSS-REFERENCE
022121011A, 95510603300

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1802290 engine water pump for VW CC. Quality replacement water pump from Canuck Motors, Canada.','CM1802290 Engine Water Pump | Canuck Motors'),
  ('CM1301250','Replacement engine water pump CM1301250 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Supplied with: partcatalog: gaskets and plug

APPLICATIONS
Chevrolet, GMC, Buick, Pontiac, Oldsmobile cars, trucks and vans (1972-1996), 3.8L V6, 4.3L V6, 5.0L V8, 5.7L V8

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1301250 engine water pump for Chevrolet. Quality replacement water pump from Canuck Motors, Canada.','CM1301250 Engine Water Pump | Canuck Motors'),
  ('CM1301480','Replacement engine water pump CM1301480 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: partcatalog: 1 paper gasket

APPLICATIONS
Buick, Chevrolet, Pontiac, Oldsmobile, Saturn and Cadillac V6 applications (1987-2007), 2.8L to 3.5L

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1301480 engine water pump for Buick. Quality replacement water pump from Canuck Motors, Canada.','CM1301480 Engine Water Pump | Canuck Motors'),
  ('CM1301620','Replacement engine water pump CM1301620 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Supplied with: partcatalog: 2 paper gaskets + plug

APPLICATIONS
Chevrolet, GMC, Cadillac, Oldsmobile, Pontiac and AM General 4.3L V6, 5.0L V8 and 5.7L V8 trucks, vans, SUVs and cars (1987-1996)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1301620 engine water pump for Chevrolet. Quality replacement water pump from Canuck Motors, Canada.','CM1301620 Engine Water Pump | Canuck Motors'),
  ('CM1301820','Replacement engine water pump CM1301820 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Supplied with: partcatalog: 2 paper gaskets

APPLICATIONS
Chevrolet and GMC Silverado/Sierra 1500 (1999-2013), Express/Savana, Tahoe, Yukon, Astro, Blazer, S10, Sonoma (1996-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1301820 engine water pump for Chevrolet and GMC Silverado/Sierra 1500. Quality replacement water pump from Canuck Motors, Canada.','CM1301820 Engine Water Pump | Canuck Motors'),
  ('CM1203072','Replacement engine water pump CM1203072 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Supplied with: partcatalog: 1 o-ring; gaskets and pulley included

APPLICATIONS
Dodge Ram 2500 (1994-2010), Ram 3500 (1994-2007) with 5.9L L6; Dodge D250/D350/W250/W350 (1989-1993); Chevrolet P30 and GMC P3500 3.9L

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1203072 engine water pump for Dodge Ram 2500. Quality replacement water pump from Canuck Motors, Canada.','CM1203072 Engine Water Pump | Canuck Motors'),
  ('CM1302050','Replacement engine water pump CM1302050 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: partcatalog: 1 rubber gasket

APPLICATIONS
Chevrolet Aveo (2009-2016), Aveo5, Cruze (2011-2016), Sonic (2012-2018), Trax (2013-2018), Pontiac G3, Saturn Astra

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1302050 engine water pump for Chevrolet Aveo. Quality replacement water pump from Canuck Motors, Canada.','CM1302050 Engine Water Pump | Canuck Motors'),
  ('CM1152290','Replacement engine water pump CM1152290 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 3.85 in (98 mm) [.] hub diameter 4.57 in (116 mm)

OE CROSS-REFERENCE
11517548263, 11517548264

APPLICATIONS
BMW 550i (2011-2018), 650i (2012-2019), 750i/750Li (2009-2019), Alpina B7, X5 (2010-2018), X6 (2008-2019)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1152290 engine water pump for BMW 550i. Quality replacement water pump from Canuck Motors, Canada.','CM1152290 Engine Water Pump | Canuck Motors'),
  ('CM1204370','Replacement engine water pump CM1204370 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 4.66 in (118 mm) [.] hub diameter 5.42 in (138 mm)

OE CROSS-REFERENCE
53011380AG, 68382494AA

APPLICATIONS
Chrysler Aspen (2007-2008), Dodge Durango (2004-2008), Dodge Ram 1500/2500/3500 (2003-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204370 engine water pump for Chrysler Aspen. Quality replacement water pump from Canuck Motors, Canada.','CM1204370 Engine Water Pump | Canuck Motors'),
  ('CM1204410','Replacement engine water pump CM1204410 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 3.35 in (85 mm) [.] hub diameter 3.48 in (88 mm)

OE CROSS-REFERENCE
68003402AA, R8003402AB

APPLICATIONS
Ram and Dodge Ram 2500/3500/4500/5500 (2007-2012), Freightliner, Blue Bird, Gillig, Ford F-650/F-750 and other medium-duty trucks and buses (2007-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204410 engine water pump for Ram and Dodge Ram 2500/3500/4500/5500. Quality replacement water pump from Canuck Motors, Canada.','CM1204410 Engine Water Pump | Canuck Motors'),
  ('CM1204430','Replacement engine water pump CM1204430 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 4.03 in (102 mm) [.] hub diameter 4.75 in (121 mm)

OE CROSS-REFERENCE
53022192AE, 53022192AK

APPLICATIONS
Chrysler Aspen (2009), Dodge Durango (2009), Dodge Ram 1500/2500/3500 (2009-2010), Ram 1500/2500/3500 (2011-2018), Ram 1500 Classic (2019-2024)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204430 engine water pump for Chrysler Aspen. Quality replacement water pump from Canuck Motors, Canada.','CM1204430 Engine Water Pump | Canuck Motors'),
  ('CM1204450','Replacement engine water pump CM1204450 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.63 in (67 mm) [.] hub diameter 4.33 in (110 mm)

OE CROSS-REFERENCE
5184321AE, 68087340AA, 68158680AA

APPLICATIONS
Chrysler 200, 300, Town & Country; Dodge Avenger, Challenger, Charger, Durango, Grand Caravan, Journey; Jeep Grand Cherokee; Ram 1500, ProMaster; Volkswagen Routan (2011-2023)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204450 engine water pump for Chrysler 200. Quality replacement water pump from Canuck Motors, Canada.','CM1204450 Engine Water Pump | Canuck Motors'),
  ('CM1204460','Replacement engine water pump CM1204460 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub diameter 4.28 in (109 mm)

OE CROSS-REFERENCE
5038668AA, 53022340AC

APPLICATIONS
Chrysler 300 (2011-2023), Dodge Challenger and Charger (2011-2023), Dodge Durango (2011-2026), Jeep Grand Cherokee (2011-2023)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204460 engine water pump for Chrysler 300. Quality replacement water pump from Canuck Motors, Canada.','CM1204460 Engine Water Pump | Canuck Motors'),
  ('CM1204480','Replacement engine water pump CM1204480 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.44 in (62 mm) [.] hub diameter 2.25 in (57 mm)

OE CROSS-REFERENCE
4892713AA, 4893386AA, 68291856AA

APPLICATIONS
Dodge Dart (2013-2016), Fiat 500, 500L, 500X, 124 Spider, Jeep Renegade (2015-2018), Ram ProMaster Rapid (2017-2022)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204480 engine water pump for Dodge Dart. Quality replacement water pump from Canuck Motors, Canada.','CM1204480 Engine Water Pump | Canuck Motors'),
  ('CM1204490','Replacement engine water pump CM1204490 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.3 in (58 mm) [.] hub diameter 5.24 in (133 mm)

OE CROSS-REFERENCE
5047389AA

APPLICATIONS
Jeep Cherokee, Compass, Patriot, Renegade; Dodge Avenger, Caliber, Dart, Journey; Chrysler 200 and Sebring; Fiat 500X; Ram ProMaster City

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204490 engine water pump for Jeep Cherokee. Quality replacement water pump from Canuck Motors, Canada.','CM1204490 Engine Water Pump | Canuck Motors'),
  ('CM1204520','Replacement engine water pump CM1204520 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 3.9 in (99 mm) [.] hub diameter 3.23 in (82 mm)

OE CROSS-REFERENCE
68210961AA, 68414058AB

APPLICATIONS
Ram 2500, 3500, 4500 and 5500 (2013-2018)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204520 engine water pump for Ram 2500. Quality replacement water pump from Canuck Motors, Canada.','CM1204520 Engine Water Pump | Canuck Motors'),
  ('CM1207220','Replacement engine water pump CM1207220 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.59 in (91 mm) [.] hub diameter 2.67 in (68 mm)

OE CROSS-REFERENCE
05138057AA, 6472000101, A6472000101

APPLICATIONS
Dodge Sprinter 2500/3500 (2004-2006), Freightliner Sprinter 2500/3500 (2004-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1207220 engine water pump for Dodge Sprinter 2500/3500. Quality replacement water pump from Canuck Motors, Canada.','CM1207220 Engine Water Pump | Canuck Motors'),
  ('CM1251770','Replacement engine water pump CM1251770 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.17 in (106 mm) [.] hub diameter 3.06 in (78 mm)

OE CROSS-REFERENCE
F0TZ8501D, F7TZ8501AC, ZZL015010

APPLICATIONS
Ford Aerostar (1990-1997), Explorer (1991-2000), Ranger (1990-2000), Mazda B4000 (1994-2000), Mazda Navajo (1991-1994)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1251770 engine water pump for Ford Aerostar. Quality replacement water pump from Canuck Motors, Canada.','CM1251770 Engine Water Pump | Canuck Motors'),
  ('CM1251850','Replacement engine water pump CM1251850 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.22 in (107 mm) [.] hub diameter 2.9 in (74 mm)

OE CROSS-REFERENCE
5U3Z8501A, ZZR115010

APPLICATIONS
Ford Ranger (1995-2008), Ford Aerostar (1995-1997), Mazda B3000 (1995-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1251850 engine water pump for Ford Ranger. Quality replacement water pump from Canuck Motors, Canada.','CM1251850 Engine Water Pump | Canuck Motors'),
  ('CM1251940','Replacement engine water pump CM1251940 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 5.89 in (150 mm) [.] hub diameter 2.62 in (67 mm)

OE CROSS-REFERENCE
3R3Z8501A, 4U7Z8501B

APPLICATIONS
Ford Mustang (1996-2004), Ford Thunderbird (1996-1997), Mercury Cougar (1996-1997)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1251940 engine water pump for Ford Mustang. Quality replacement water pump from Canuck Motors, Canada.','CM1251940 Engine Water Pump | Canuck Motors'),
  ('CM1204600','Replacement engine water pump CM1204600 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: partcatalog: 1 rubber gasket

APPLICATIONS
Chrysler 300, Dodge Challenger, Dodge Charger, Jeep Commander and Jeep Grand Cherokee with 5.7L V8 (2009-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204600 engine water pump for Chrysler 300. Quality replacement water pump from Canuck Motors, Canada.','CM1204600 Engine Water Pump | Canuck Motors'),
  ('CM1251840','Replacement engine water pump CM1251840 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: partcatalog: 2 o-rings; no gasket or pulley

APPLICATIONS
Ford Ranger (1995-2001), Mazda B2300 (1995-1997), Mazda B2500 (1998-2001)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1251840 engine water pump for Ford Ranger. Quality replacement water pump from Canuck Motors, Canada.','CM1251840 Engine Water Pump | Canuck Motors'),
  ('CM1307340','Replacement engine water pump CM1307340 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 6.57 in (167 mm) [.] hub diameter 5.85 in (149 mm)

OE CROSS-REFERENCE
12458935, 12556449

APPLICATIONS
Cadillac Escalade (2002-2006), Chevrolet Silverado 1500/2500/3500 (1999-2006), Avalanche, Suburban, Tahoe, Express, GMC Sierra, Savana, Yukon, Hummer H2 (2003-2006), Buick Rainier, Isuzu Ascender, Saab 9-7x

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1307340 engine water pump for Cadillac Escalade. Quality replacement water pump from Canuck Motors, Canada.','CM1307340 Engine Water Pump | Canuck Motors'),
  ('CM1252101','Replacement engine water pump CM1252101 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 5.65 in (144 mm) [.] hub diameter 2.91 in (74 mm)

OE CROSS-REFERENCE
3L3Z8501DA, 5L3Z8501A, 6U7Z8501B

APPLICATIONS
Ford E-150 (1997-2003), Ford E-250 (1997-2003), Ford F-150 (1997-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1252101 engine water pump for Ford E-150. Quality replacement water pump from Canuck Motors, Canada.','CM1252101 Engine Water Pump | Canuck Motors'),
  ('CM1351250','Replacement engine water pump CM1351250 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.19 in (56 mm) [.] hub diameter 2.77 in (70 mm)

OE CROSS-REFERENCE
19200PH7000, 19200PH7003, 19200P0GA01

APPLICATIONS
Acura Legend (1986-1990), Honda Accord (1995-1997), Sterling 825 and 827 (1987-1991)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351250 engine water pump for Acura Legend. Quality replacement water pump from Canuck Motors, Canada.','CM1351250 Engine Water Pump | Canuck Motors'),
  ('CM1351260','Replacement engine water pump CM1351260 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.75 in (44 mm) [.] hub diameter 2.21 in (56 mm)

OE CROSS-REFERENCE
19200PM3000, 1610087705

APPLICATIONS
Honda Civic (1988-1995), Honda CRX (1988-1991), Honda Civic del Sol (1993-1995)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351260 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1351260 Engine Water Pump | Canuck Motors'),
  ('CM1351390','Replacement engine water pump CM1351390 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.73 in (44 mm) [.] hub diameter 2.2 in (56 mm)

OE CROSS-REFERENCE
19200P2A003, 19200P2A004, 19200PDFE01

APPLICATIONS
Honda Civic (1996-2000), Civic del Sol (1996-1997), Acura EL (1997-2000)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351390 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1351390 Engine Water Pump | Canuck Motors'),
  ('CM1351500','Replacement engine water pump CM1351500 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.5 in (64 mm) [.] hub diameter 4.88 in (124 mm)

OE CROSS-REFERENCE
19200RAAA01, 19200RBB003, 19200RFE003

APPLICATIONS
Honda Accord (2003-2007), Honda CR-V (2007-2009), Honda Element (2003-2011), Acura TSX (2004-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351500 engine water pump for Honda Accord. Quality replacement water pump from Canuck Motors, Canada.','CM1351500 Engine Water Pump | Canuck Motors'),
  ('CM1351520','Replacement engine water pump CM1351520 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.5 in (64 mm) [.] hub diameter 5.04 in (128 mm)

OE CROSS-REFERENCE
19200PNA003, 19200RBB002, 19200RFE003

APPLICATIONS
Honda Civic (2002-2005), Honda CR-V (2002-2006), Acura RSX (2002-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351520 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1351520 Engine Water Pump | Canuck Motors'),
  ('CM1351530','Replacement engine water pump CM1351530 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.41 in (36 mm) [.] hub diameter 2.52 in (64 mm)

OE CROSS-REFERENCE
19200RDMA01

APPLICATIONS
Honda Accord (2003-2017), Odyssey (2005-2025), Pilot (2005-2022), Ridgeline, Passport (2019-2025); Acura MDX, TL, TLX, RL, RLX, RDX, TSX, ZDX; Saturn Vue (2004-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351530 engine water pump for Honda Accord. Quality replacement water pump from Canuck Motors, Canada.','CM1351530 Engine Water Pump | Canuck Motors'),
  ('CM1351630','Replacement engine water pump CM1351630 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.6 in (66 mm) [.] hub diameter 2.68 in (68 mm)

OE CROSS-REFERENCE
19200RB0003

APPLICATIONS
Honda Fit (2009-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351630 engine water pump for Honda Fit. Quality replacement water pump from Canuck Motors, Canada.','CM1351630 Engine Water Pump | Canuck Motors'),
  ('CM1351650','Replacement engine water pump CM1351650 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.16 in (55 mm) [.] hub diameter 4.88 in (124 mm)

OE CROSS-REFERENCE
19200RX0A01

APPLICATIONS
Honda Civic (2012-2015), Honda CR-V (2012), Acura ILX (2013-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351650 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1351650 Engine Water Pump | Canuck Motors'),
  ('CM1307350','Replacement engine water pump CM1307350.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 2.91 in (74 mm) [.] hub diameter 1.96 in (50 mm)

OE CROSS-REFERENCE
24439797, 93172718, 12624936

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1307350 engine water pump for Chevrolet Cobalt. Quality replacement water pump from Canuck Motors, Canada.','CM1307350 Engine Water Pump | Canuck Motors'),
  ('CM1307360','Replacement engine water pump CM1307360.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.76 in (70 mm) [.] hub diameter 3.54 in (90 mm)

OE CROSS-REFERENCE
1610009230, 1610029095, 88972167

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1307360 engine water pump for Toyota Corolla. Quality replacement water pump from Canuck Motors, Canada.','CM1307360 Engine Water Pump | Canuck Motors'),
  ('CM1307700','Replacement engine water pump CM1307700.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.15 in (55 mm) [.] hub diameter 3.31 in (84 mm)

OE CROSS-REFERENCE
12620226, 8126202260

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1307700 engine water pump for Chevrolet Colorado. Quality replacement water pump from Canuck Motors, Canada.','CM1307700 Engine Water Pump | Canuck Motors'),
  ('CM1352380','Replacement engine water pump CM1352380 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.71 in (43 mm) [.] hub diameter 2.52 in (64 mm)

OE CROSS-REFERENCE
19200P8A003, 19200P8AA02, 19200P8AA03

APPLICATIONS
Honda Accord (1998-2002), Odyssey (1999-2004), Pilot (2003-2004); Acura CL, TL, MDX (1997-2003)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1352380 engine water pump for Honda Accord. Quality replacement water pump from Canuck Motors, Canada.','CM1352380 Engine Water Pump | Canuck Motors'),
  ('CM1352420','Replacement engine water pump CM1352420 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.65 in (42 mm) [.] hub diameter 2.21 in (56 mm)

OE CROSS-REFERENCE
19200PLC003, 19200PLE005, 19200PMEA01

APPLICATIONS
Honda Civic (2001-2005), Acura EL (2001-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1352420 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1352420 Engine Water Pump | Canuck Motors'),
  ('CM1353010','Replacement engine water pump CM1353010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.19 in (56 mm) [.] hub diameter 5.2 in (132 mm)

OE CROSS-REFERENCE
19200PZA013, 19200RMX003

APPLICATIONS
Honda Civic (2003-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1353010 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1353010 Engine Water Pump | Canuck Motors'),
  ('CM1356980','Replacement engine water pump CM1356980 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.01 in (76 mm) [.] hub diameter 2.52 in (64 mm)

OE CROSS-REFERENCE
06192R1A305, 19200RNAA01, 19200RNAA02

APPLICATIONS
Honda Civic (2006-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1356980 engine water pump for Honda Civic. Quality replacement water pump from Canuck Motors, Canada.','CM1356980 Engine Water Pump | Canuck Motors'),
  ('CM1451390','Replacement engine water pump CM1451390 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.3 in (84 mm) [.] hub diameter 1.24 in (31 mm)

OE CROSS-REFERENCE
8ABB15010, 024A15010, 0K24A1501Y

APPLICATIONS
Mazda Miata (1994-1997, 1999-2005), Mazda Protege (1995-2001), Mazda MX-3 (1994-1996), Kia Sephia (1995-1997)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1451390 engine water pump for Mazda Miata. Quality replacement water pump from Canuck Motors, Canada.','CM1451390 Engine Water Pump | Canuck Motors'),
  ('CM1461110','Replacement engine water pump CM1461110.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.59 in (91 mm) [.] hub diameter 2.28 in (58 mm)

OE CROSS-REFERENCE
2510038002, 2510038200

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1461110 engine water pump. Quality replacement water pump from Canuck Motors, Canada.','CM1461110 Engine Water Pump | Canuck Motors'),
  ('CM1462040','Replacement engine water pump CM1462040 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.44 in (62 mm) [.] hub diameter 2.56 in (65 mm)

OE CROSS-REFERENCE
2510037202

APPLICATIONS
Hyundai Santa Fe (2001-2006), Sonata (1999-2005), Tiburon (2003-2008), Tucson (2005-2009); Kia Magentis, Optima (2001-2006), Sportage (2005-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1462040 engine water pump for Hyundai Santa Fe. Quality replacement water pump from Canuck Motors, Canada.','CM1462040 Engine Water Pump | Canuck Motors'),
  ('CM1467330','Replacement engine water pump CM1467330 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.53 in (64 mm) [.] hub diameter 2.68 in (68 mm)

OE CROSS-REFERENCE
251003C100, 251003C120, 452524C000

APPLICATIONS
Hyundai Azera, Entourage, Genesis, Genesis Coupe, Santa Fe, Sonata, Veracruz; Kia Amanti, Borrego, Sedona, Sorento (2006-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1467330 engine water pump for Hyundai Azera. Quality replacement water pump from Canuck Motors, Canada.','CM1467330 Engine Water Pump | Canuck Motors'),
  ('CM1467340','Replacement engine water pump CM1467340 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.52 in (64 mm) [.] hub diameter 2.13 in (54 mm)

OE CROSS-REFERENCE
251002G000, 1300A082

APPLICATIONS
Hyundai Santa Fe, Santa Fe Sport, Sonata, Tucson; Kia Forte, Forte5, Magentis, Optima, Rondo; Mitsubishi Lancer, Outlander, Outlander Sport, RVR (2006-2025)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1467340 engine water pump for Hyundai Santa Fe. Quality replacement water pump from Canuck Motors, Canada.','CM1467340 Engine Water Pump | Canuck Motors'),
  ('CM1467410','Replacement engine water pump CM1467410 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.54 in (65 mm) [.] hub diameter 1.47 in (37 mm)

OE CROSS-REFERENCE
251002G500, 251002G510, 251102G500

APPLICATIONS
Hyundai Santa Fe Sport (2013-2016), Sonata (2011-2014), Tucson (2011-2015); Kia Optima (2011-2015), Rondo (2010-2011), Sorento (2011-2015), Sportage (2011-2021)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1467410 engine water pump for Hyundai Santa Fe Sport. Quality replacement water pump from Canuck Motors, Canada.','CM1467410 Engine Water Pump | Canuck Motors'),
  ('CM1467390','Replacement engine water pump CM1467390 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.55 in (65 mm) [.] hub diameter 1.47 in (37 mm)

OE CROSS-REFERENCE
251102G400

APPLICATIONS
Hyundai Santa Fe Sport (2013-2016), Hyundai Sonata (2011-2014), Kia Optima (2011-2015), Kia Sportage (2011-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1467390 engine water pump for Hyundai Santa Fe Sport. Quality replacement water pump from Canuck Motors, Canada.','CM1467390 Engine Water Pump | Canuck Motors'),
  ('CM1472250','Replacement engine water pump CM1472250.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.28 in (83 mm) [.] hub diameter 2.67 in (68 mm)

OE CROSS-REFERENCE
5097158AA, 1122000501

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1472250 engine water pump. Quality replacement water pump from Canuck Motors, Canada.','CM1472250 Engine Water Pump | Canuck Motors'),
  ('CM1472310','Replacement engine water pump CM1472310 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.93 in (74 mm) [.] hub diameter 4.93 in (125 mm)

OE CROSS-REFERENCE
2722000901

APPLICATIONS
Mercedes-Benz C230, C280, C300, C350, CLK350, E350, GLK350, ML350, R350, SLK280, SLK300, SLK350 (2005-2012)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1472310 engine water pump for Mercedes-Benz C230. Quality replacement water pump from Canuck Motors, Canada.','CM1472310 Engine Water Pump | Canuck Motors'),
  ('CM1481400','Replacement engine water pump CM1481400 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.93 in (49 mm) [.] hub diameter 2.36 in (60 mm)

OE CROSS-REFERENCE
5135756AA, MD972003, 2510035010

APPLICATIONS
Chrysler, Dodge and Plymouth minivans and cars (Caravan, Voyager, Spirit, Acclaim, Shadow, Daytona, Stealth), Mitsubishi 3000GT, Diamante, Montero, Hyundai Sonata (1987-2000)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1481400 engine water pump for Chrysler. Quality replacement water pump from Canuck Motors, Canada.','CM1481400 Engine Water Pump | Canuck Motors'),
  ('CM1481780','Replacement engine water pump CM1481780 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.17 in (81 mm) [.] hub diameter 2.28 in (58 mm)

OE CROSS-REFERENCE
1300A066, MD979191, MD979395

APPLICATIONS
Mitsubishi Eclipse (2006-2012), Galant (2004-2012), Lancer (2004-2006), Outlander (2004-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1481780 engine water pump for Mitsubishi Eclipse. Quality replacement water pump from Canuck Motors, Canada.','CM1481780 Engine Water Pump | Canuck Motors'),
  ('CM1482280','Replacement engine water pump CM1482280 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.44 in (62 mm) [.] hub diameter 2.35 in (60 mm)

OE CROSS-REFERENCE
MD346790, MD309756, 30874316

APPLICATIONS
Mitsubishi Lancer (2002-2007), Mitsubishi Mirage (1997-2002)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1482280 engine water pump for Mitsubishi Lancer. Quality replacement water pump from Canuck Motors, Canada.','CM1482280 Engine Water Pump | Canuck Motors'),
  ('CM1502010','Replacement engine water pump CM1502010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.9 in (74 mm) [.] hub diameter 4.07 in (103 mm)

APPLICATIONS
Nissan Versa (2007-2012), Sentra (2007-2012), Cube (2009-2014), NV200 (2013-2021), Tiida (2007-2018), Chevrolet City Express (2015-2018)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502010 engine water pump for Nissan Versa. Quality replacement water pump from Canuck Motors, Canada.','CM1502010 Engine Water Pump | Canuck Motors'),
  ('CM1502020','Replacement engine water pump CM1502020 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 2.85 in (72 mm) [.] hub diameter 2.55 in (65 mm)

APPLICATIONS
Nissan Altima (2007-2018), Maxima (2009-2023), Murano (2007, 2009-2024), Pathfinder (2013-2019), Quest (2011-2017); INFINITI G25, JX35, QX60

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502020 engine water pump for Nissan Altima. Quality replacement water pump from Canuck Motors, Canada.','CM1502020 Engine Water Pump | Canuck Motors'),
  ('CM1502320','Replacement engine water pump CM1502320 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 1.54 in (39 mm) [.] hub diameter 2.38 in (60 mm)

OE CROSS-REFERENCE
210107Y00A, 1740082Z00

APPLICATIONS
Nissan Altima (2002-2006), Maxima (2002-2008), Murano (2003-2007), Pathfinder (2005-2012), Frontier (2005-2019), Xterra (2005-2015), Quest (2004-2009), 350Z, NV1500/2500/3500; INFINITI FX35, G35, I35, M35; Suzuki Equator

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502320 engine water pump for Nissan Altima. Quality replacement water pump from Canuck Motors, Canada.','CM1502320 Engine Water Pump | Canuck Motors'),
  ('CM1502400','Replacement engine water pump CM1502400 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.8 in (71 mm) [.] hub diameter 2.37 in (60 mm)

OE CROSS-REFERENCE
21010EA010, 1740082Z10

APPLICATIONS
Nissan Frontier (2005-2019), NP300 Frontier (2016-2019), Urvan (2008-2013), Suzuki Equator (2009-2012)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502400 engine water pump for Nissan Frontier. Quality replacement water pump from Canuck Motors, Canada.','CM1502400 Engine Water Pump | Canuck Motors'),
  ('CM1502340','Replacement engine water pump CM1502340.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.81 in (71 mm) [.] hub diameter 3.82 in (97 mm)

OE CROSS-REFERENCE
210106N225

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502340 engine water pump. Quality replacement water pump from Canuck Motors, Canada.','CM1502340 Engine Water Pump | Canuck Motors'),
  ('CM1509010','Replacement engine water pump CM1509010 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.64 in (118 mm) [.] hub diameter 3.01 in (76 mm)

OE CROSS-REFERENCE
210107S000, 21010AR725

APPLICATIONS
INFINITI FX45, FX50, M45, M56, Q45, Q70, QX56, QX70, QX80; Nissan Armada, Pathfinder (2008-2012), Titan, Titan XD, NV2500, NV3500 (2003-2024)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1509010 engine water pump for INFINITI FX45. Quality replacement water pump from Canuck Motors, Canada.','CM1509010 Engine Water Pump | Canuck Motors'),
  ('CM1701960','Replacement engine water pump CM1701960 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.66 in (68 mm) [.] hub diameter 3.07 in (78 mm)

OE CROSS-REFERENCE
1610009460, 1610078245, 1610079245

APPLICATIONS
Toyota Tacoma (1995-2023), Hilux (2004-2017), T100 (1994-1998), 4Runner (1996-2000, 2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1701960 engine water pump for Toyota Tacoma. Quality replacement water pump from Canuck Motors, Canada.','CM1701960 Engine Water Pump | Canuck Motors'),
  ('CM1701970','Replacement engine water pump CM1701970 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.73 in (69 mm) [.] hub diameter 2.36 in (60 mm)

OE CROSS-REFERENCE
1610039395, 1610069395, 1610069396

APPLICATIONS
Toyota 4Runner (1996-2002), Tacoma (1995-2004), T100 (1995-1998), Tundra (2000-2004)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1701970 engine water pump for Toyota 4Runner. Quality replacement water pump from Canuck Motors, Canada.','CM1701970 Engine Water Pump | Canuck Motors'),
  ('CM1701980','Replacement engine water pump CM1701980 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.76 in (70 mm) [.] hub diameter 3.54 in (90 mm)

OE CROSS-REFERENCE
1610009080, 1610009230, 1610029095

APPLICATIONS
Toyota Corolla (1998-2008), Celica (2000-2005), Matrix (2003-2008), MR2 Spyder (2000-2006), Chevrolet Prizm (1998-2002), Pontiac Vibe (2003-2008)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1701980 engine water pump for Toyota Corolla. Quality replacement water pump from Canuck Motors, Canada.','CM1701980 Engine Water Pump | Canuck Motors'),
  ('CM1702101','Replacement engine water pump CM1702101 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 1.99 in (51 mm) [.] hub diameter 1.97 in (50 mm)

OE CROSS-REFERENCE
1610029155, 1610029156, 1610029195

APPLICATIONS
Toyota Yaris (2004-2020), Prius (2001-2009), Echo (2000-2005), Scion xA and xB (2004-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1702101 engine water pump for Toyota Yaris. Quality replacement water pump from Canuck Motors, Canada.','CM1702101 Engine Water Pump | Canuck Motors'),
  ('CM1702103','Replacement engine water pump CM1702103 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.73 in (69 mm) [.] hub diameter 2.36 in (60 mm)

OE CROSS-REFERENCE
1610069405, 1610069406, 1610069407

APPLICATIONS
Toyota 4Runner (1996), Tacoma (1995-2002), T100 (1995-1998), Tundra (2000-2004)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1702103 engine water pump for Toyota 4Runner. Quality replacement water pump from Canuck Motors, Canada.','CM1702103 Engine Water Pump | Canuck Motors'),
  ('CM1702400','Replacement engine water pump CM1702400 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.11 in (54 mm) [.] hub diameter 3.38 in (86 mm)

OE CROSS-REFERENCE
1610029145, 1610029146, 88972819

APPLICATIONS
Toyota Celica (2000-2005), Corolla (2005-2006), Matrix (2003-2006), Pontiac Vibe

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1702400 engine water pump for Toyota Celica. Quality replacement water pump from Canuck Motors, Canada.','CM1702400 Engine Water Pump | Canuck Motors'),
  ('CM1702470','Replacement engine water pump CM1702470 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.54 in (65 mm) [.] hub diameter 2.76 in (70 mm)

OE CROSS-REFERENCE
161000H010, 161000H030, 1610028040

APPLICATIONS
Toyota Camry (2002-2018), Corolla (2009-2010), Matrix (2009-2013), RAV4 (2001-2008), Highlander (2001-2007), Solara, Scion tC, Lexus HS250h, Pontiac Vibe

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1702470 engine water pump for Toyota Camry. Quality replacement water pump from Canuck Motors, Canada.','CM1702470 Engine Water Pump | Canuck Motors'),
  ('CM1255920','Replacement engine water pump CM1255920 for the vehicles listed below.

KEY FEATURES
[*] Cast iron housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.42 in (87 mm) [.] hub diameter 2.91 in (74 mm)

OE CROSS-REFERENCE
4C3Z8501B, F81Z8501DA, YC3Z8501AA

APPLICATIONS
Ford E-350/E-450/E-550 Super Duty (1999-2009), Excursion (2000-2005), F-250/F-350/F-450/F-550 Super Duty (1999-2009), F-53 Motorhome Chassis, F-650/F-750 (2012-2019)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1255920 engine water pump for Ford E-350/E-450/E-550 Super Duty. Quality replacement water pump from Canuck Motors, Canada.','CM1255920 Engine Water Pump | Canuck Motors'),
  ('CM1502550','Replacement engine water pump CM1502550 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 1.89 in (48 mm) [.] hub diameter 2.2 in (56 mm)

OE CROSS-REFERENCE
B1010JK20A

APPLICATIONS
Nissan 350Z, 370Z, GT-R, Frontier (2020-2025); INFINITI G35, G37, Q50, Q60, Q70, QX50, QX70, FX35, FX37, EX35, EX37, M35h, M37

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502550 engine water pump for Nissan 350Z. Quality replacement water pump from Canuck Motors, Canada.','CM1502550 Engine Water Pump | Canuck Motors'),
  ('CM1704000','Replacement engine water pump CM1704000 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.48 in (63 mm) [.] hub diameter 2.75 in (70 mm)

OE CROSS-REFERENCE
1610009490, 1610039495, 1610039496

APPLICATIONS
Toyota Tundra (2007-2021), Sequoia (2008-2022), Land Cruiser (2008-2021), Lexus LX570 (2008-2021)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1704000 engine water pump for Toyota Tundra. Quality replacement water pump from Canuck Motors, Canada.','CM1704000 Engine Water Pump | Canuck Motors'),
  ('CM1703940','Replacement engine water pump CM1703940 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.48 in (88 mm) [.] hub diameter 3.07 in (78 mm)

OE CROSS-REFERENCE
1610009470, 1610031070, 1610039405

APPLICATIONS
Toyota 4Runner (2003-2009), FJ Cruiser (2007-2009), Tacoma (2005-2015), Tundra (2005-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1703940 engine water pump for Toyota 4Runner. Quality replacement water pump from Canuck Motors, Canada.','CM1703940 Engine Water Pump | Canuck Motors'),
  ('CM1704060','Replacement engine water pump CM1704060 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.46 in (88 mm) [.] hub diameter 3.07 in (78 mm)

OE CROSS-REFERENCE
1610039545

APPLICATIONS
Toyota 4Runner (2010-2024), FJ Cruiser (2010-2014), Tundra (2011-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1704060 engine water pump for Toyota 4Runner. Quality replacement water pump from Canuck Motors, Canada.','CM1704060 Engine Water Pump | Canuck Motors'),
  ('CM1704030','Replacement engine water pump CM1704030 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Electric drive
[*] Supplied with: partcatalog: 1 rubber gasket; electric auxiliary pump

APPLICATIONS
Toyota Prius (2010-2020), Prius Prime (2017-2020), Prius C (2012-2019), Prius V (2012-2018), Prius Plug-In (2012-2015), Lexus CT200h (2011-2017)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1704030 engine water pump for Toyota Prius. Quality replacement water pump from Canuck Motors, Canada.','CM1704030 Engine Water Pump | Canuck Motors'),
  ('CM1704100','Replacement engine water pump CM1704100 for the vehicles listed below.

KEY FEATURES
[*] Plastic housing
[*] Electric drive
[*] Supplied with: partcatalog: electric auxiliary hybrid water pump; gaskets not included

APPLICATIONS
Toyota Prius (2004-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1704100 engine water pump for Toyota Prius. Quality replacement water pump from Canuck Motors, Canada.','CM1704100 Engine Water Pump | Canuck Motors'),
  ('CM1707370','Replacement engine water pump CM1707370 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.55 in (65 mm) [.] hub diameter 2.76 in (70 mm)

OE CROSS-REFERENCE
1610009440, 1610039455, 1610039456

APPLICATIONS
Toyota Camry (2007-2017), Avalon (2005-2018), Highlander (2008-2016), Sienna (2007-2016), RAV4 (2006-2012), Venza (2009-2016); Lexus ES350 (2007-2018), RX350 (2007-2015), RX450h (2010-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1707370 engine water pump for Toyota Camry. Quality replacement water pump from Canuck Motors, Canada.','CM1707370 Engine Water Pump | Canuck Motors'),
  ('CM1802310','Replacement engine water pump CM1802310 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.04 in (52 mm) [.] hub diameter 2.2 in (56 mm)

OE CROSS-REFERENCE
038121011C, 03G121011

APPLICATIONS
Volkswagen Golf, Jetta, Beetle, Passat (2004-2014), Amarok (2011-2014); Audi A3 (2010-2013)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1802310 engine water pump for Volkswagen Golf. Quality replacement water pump from Canuck Motors, Canada.','CM1802310 Engine Water Pump | Canuck Motors'),
  ('CM1802340','Replacement engine water pump CM1802340 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.81 in (46 mm) [.] hub diameter 2.25 in (57 mm)

OE CROSS-REFERENCE
06F121011, 06F121011X

APPLICATIONS
Audi A3, A4, TT, TTS (2005-2015); Volkswagen GTI, Golf R, Jetta, Passat, Eos (2006-2013)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1802340 engine water pump for Audi A3. Quality replacement water pump from Canuck Motors, Canada.','CM1802340 Engine Water Pump | Canuck Motors'),
  ('CM1802460','Replacement engine water pump CM1802460.

KEY FEATURES
[*] Plastic housing
[*] Plastic impeller
[*] Electric drive

OE CROSS-REFERENCE
1K0965561J

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1802460 engine water pump. Quality replacement water pump from Canuck Motors, Canada.','CM1802460 Engine Water Pump | Canuck Motors'),
  ('CM1809070','Replacement engine water pump CM1809070 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.3 in (33 mm) [.] hub diameter 3.9 in (99 mm)

OE CROSS-REFERENCE
07K121011B, 07K121011G

APPLICATIONS
Volkswagen Beetle (2006-2017), Golf (2010-2014), Jetta (2005-2018), Passat (2012-2014), Rabbit (2006-2009), Bora; Audi TT RS (2012-2013)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1809070 engine water pump for Volkswagen Beetle. Quality replacement water pump from Canuck Motors, Canada.','CM1809070 Engine Water Pump | Canuck Motors'),
  ('CM1461230','Replacement engine water pump CM1461230 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.65 in (93 mm) [.] hub diameter 2.05 in (52 mm)

APPLICATIONS
Hyundai Accent (1996-1998, 2001-2011), Kia Rio and Rio5 (2006-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1461230 engine water pump for Hyundai Accent. Quality replacement water pump from Canuck Motors, Canada.','CM1461230 Engine Water Pump | Canuck Motors'),
  ('CM1461240','Replacement engine water pump CM1461240 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 2.06 in (52 mm) [.] hub diameter 2.76 in (70 mm)

OE CROSS-REFERENCE
2510039800, 2510039802

APPLICATIONS
Kia Sorento (2003-2006)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1461240 engine water pump for Kia Sorento. Quality replacement water pump from Canuck Motors, Canada.','CM1461240 Engine Water Pump | Canuck Motors'),
  ('CM1462020','Replacement engine water pump CM1462020 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.39 in (86 mm) [.] hub diameter 2.17 in (55 mm)

OE CROSS-REFERENCE
2510023001, 2510023010

APPLICATIONS
Hyundai Elantra (1996-2010), Tiburon (1997-2001, 2003-2008), Tucson (2005-2009); Kia Spectra and Spectra5 (2004-2009), Sportage (2005-2010), Soul (2010-2011)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1462020 engine water pump for Hyundai Elantra. Quality replacement water pump from Canuck Motors, Canada.','CM1462020 Engine Water Pump | Canuck Motors'),
  ('CM150-1610','Replacement engine water pump CM150-1610 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 4.61 in (117 mm) [.] hub diameter 2.99 in (76 mm)

APPLICATIONS
Nissan Frontier (1999-2004), Xterra (2000-2004), Pathfinder (1996-2000), INFINITI QX4 (1997-2000)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM150-1610 engine water pump for Nissan Frontier. Quality replacement water pump from Canuck Motors, Canada.','CM150-1610 Engine Water Pump | Canuck Motors'),
  ('CM190-1040','Replacement engine water pump CM190-1040 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 5.16 in (131 mm) [.] hub diameter 2.23 in (57 mm)

OE CROSS-REFERENCE
1326342, 270559, 271975

APPLICATIONS
Volvo 240 (1990-1993), 244/245 (1985-1989), 740/745 (1985-1992), 760 (1985-1990), 780 (1989-1991), 940 (1991-1995)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM190-1040 engine water pump for Volvo 240. Quality replacement water pump from Canuck Motors, Canada.','CM190-1040 Engine Water Pump | Canuck Motors'),
  ('CM135-1620','Replacement engine water pump CM135-1620 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.34 in (59 mm) [.] hub diameter 2.05 in (52 mm)

OE CROSS-REFERENCE
19200R40A01

APPLICATIONS
Honda Accord (2008-2012), Honda CR-V (2010-2011), Acura TSX (2009-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM135-1620 engine water pump for Honda Accord. Quality replacement water pump from Canuck Motors, Canada.','CM135-1620 Engine Water Pump | Canuck Motors'),
  ('CM147-2410','Replacement engine water pump CM147-2410 for the vehicles listed below.

KEY FEATURES
[*] Plastic housing
[*] Plastic impeller
[*] Reverse rotation
[*] Electric drive

OE CROSS-REFERENCE
2118350264

APPLICATIONS
Mercedes-Benz G-Class, GL, ML, R-Class, E-Class, CLS, Sprinter (2004-2025)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM147-2410 engine water pump for Mercedes-Benz G-Class. Quality replacement water pump from Canuck Motors, Canada.','CM147-2410 Engine Water Pump | Canuck Motors'),
  ('CM160-1260','Replacement engine water pump CM160-1260 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 4.07 in (103 mm) [.] hub diameter 2.36 in (60 mm)

OE CROSS-REFERENCE
21111AA250

APPLICATIONS
Subaru Forester (2008-2013), Impreza (2008-2012), WRX (2013-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM160-1260 engine water pump for Subaru Forester. Quality replacement water pump from Canuck Motors, Canada.','CM160-1260 Engine Water Pump | Canuck Motors'),
  ('CM1253250','Replacement engine water pump CM1253250 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] No pulley
[*] Supplied with: 1 metal gasket + 2 o-rings

APPLICATIONS
Ford F-150 (2011-2016), Ford Transit-150/250/350 (2015-2020), Ford Expedition (2015-2017), Lincoln Navigator (2015-2017) with 3.5L V6

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253250 engine water pump for Ford F-150. Quality replacement water pump from Canuck Motors, Canada.','CM1253250 Engine Water Pump | Canuck Motors'),
  ('CM1253290','Replacement engine water pump CM1253290 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 4.02 in (102 mm) [.] hub diameter 5.86 in (149 mm)

OE CROSS-REFERENCE
BC3Z8501A

APPLICATIONS
Ford F-250, F-350, F-450 and F-550 Super Duty (2011-2016)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253290 engine water pump for Ford F-250. Quality replacement water pump from Canuck Motors, Canada.','CM1253290 Engine Water Pump | Canuck Motors'),
  ('CM1305980','Replacement engine water pump CM1305980 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Chain drive
[*] Pulley included
[*] Hub height 2.51 in (64 mm) [.] hub diameter 3.67 in (93 mm)

APPLICATIONS
Chevrolet Silverado 2500 HD and 3500 (2001-2005), GMC Sierra 2500 HD and 3500 (2001-2005), Chevrolet Kodiak C4500/C5500 and GMC Topkick C4500/C5500 (2003-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1305980 engine water pump for Chevrolet Silverado 2500 HD and 3500. Quality replacement water pump from Canuck Motors, Canada.','CM1305980 Engine Water Pump | Canuck Motors'),
  ('CM1351330','Replacement engine water pump CM1351330 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.87 in (47 mm) [.] hub diameter 2.55 in (65 mm)

OE CROSS-REFERENCE
19200P13000, 19200P13003, 19200P13013

APPLICATIONS
Honda Prelude (1993-2001)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351330 engine water pump for Honda Prelude. Quality replacement water pump from Canuck Motors, Canada.','CM1351330 Engine Water Pump | Canuck Motors'),
  ('CM1251670','Replacement engine water pump CM1251670.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 5.73 in (146 mm) [.] hub diameter 2.62 in (67 mm)

OE CROSS-REFERENCE
E7TZ8501A, E9TZ8501D, F3TZ8501A, 6L3Z8501A

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1251670 engine water pump for Ford F-150. Quality replacement water pump from Canuck Motors, Canada.','CM1251670 Engine Water Pump | Canuck Motors'),
  ('CM1202000','Replacement engine water pump CM1202000.

KEY FEATURES
[*] Aluminum housing
[*] Pulley included
[*] Supplied with: 1 metal gasket

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1202000 engine water pump. Quality replacement water pump from Canuck Motors, Canada.','CM1202000 Engine Water Pump | Canuck Motors'),
  ('CM1207150','Replacement engine water pump CM1207150.

KEY FEATURES
[*] Aluminum housing
[*] Supplied with: 1 rubber gasket pre-installed

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1207150 engine water pump. Quality replacement water pump from Canuck Motors, Canada.','CM1207150 Engine Water Pump | Canuck Motors'),
  ('CM1253060','Replacement engine water pump CM1253060 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 3.48 in (88 mm) [.] hub diameter 2.91 in (74 mm)

OE CROSS-REFERENCE
AL3Z8501B

APPLICATIONS
Ford Expedition (2010-2014), Ford F-150 (2010), Lincoln Navigator (2010-2014)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1253060 engine water pump for Ford Expedition. Quality replacement water pump from Canuck Motors, Canada.','CM1253060 Engine Water Pump | Canuck Motors')
) as d(sku, description, meta_description, title_tag)
where p.sku = d.sku;
