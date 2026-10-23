-- Descriptions for products that had NONE on the new site.
-- Built only from the old Canuck Motors site data (specs, OE numbers, fitment). Bullets are [*].
-- Only touches products whose description is empty. Safe to run twice.
update public.products p set description = replace(replace(d.description, '[*]', chr(8226)), '[.]', chr(183)),
  meta_description = coalesce(nullif(p.meta_description, ''), d.meta_description),
  title_tag = coalesce(nullif(p.title_tag, ''), d.title_tag)
from (values
  ('CM002','Replacement engine timing belt kit with water pump CM002 for the vehicles listed below.

APPLICATIONS
Acura MDX (2003-2013), RDX (2013-2017), RL (2005-2012), TL (2004-2014), TSX (2010-2014), ZDX (2010-2013); Honda Accord (2005-2017), Accord Crosstour (2010-2011), Crosstour (2012-2014), Odyssey (2005-2017), Pilot (2005-2015), Ridgeline (2006-2014); Saturn Vue (2004-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM002 engine timing belt kit with water pump for Acura MDX. Quality replacement part from Canuck Motors, Canada.','CM002 Engine Timing Belt Kit | Canuck Motors'),
  ('CM003','Replacement engine timing belt kit with water pump CM003 for the vehicles listed below.

APPLICATIONS
Hyundai Elantra (2007-2012), Tiburon (2007-2008), Tucson (2006-2009); Kia Soul (2010-2011), Spectra (2007-2009), Spectra5 (2007-2009), Sportage (2006-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM003 engine timing belt kit with water pump for Hyundai Elantra. Quality replacement part from Canuck Motors, Canada.','CM003 Engine Timing Belt Kit | Canuck Motors'),
  ('CM006','Replacement engine timing belt kit with water pump CM006 for the vehicles listed below.

APPLICATIONS
Subaru Forester (2006-2010), Impreza (2006-2011), Legacy (2010-2012), Outback (2010-2012)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM006 engine timing belt kit with water pump for Subaru Forester. Quality replacement part from Canuck Motors, Canada.','CM006 Engine Timing Belt Kit | Canuck Motors'),
  ('CM1204400','Replacement engine water pump CM1204400 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.29 inches (58 mm) [.] hub diameter 3.46 inches (88 mm)

OE CROSS-REFERENCE
68087367AA, 6.42e+011

APPLICATIONS
Dodge Sprinter 2500 (2007-2009), Sprinter 3500 (2007-2009); Freightliner Sprinter 2500 (2007-2021), Sprinter 3500 (2007-2021), Sprinter 3500XD (2018-2021); Jeep Grand Cherokee (2007-2009); Mercedes-Benz E320 (2007-2009), E350 (2011-2013), GL320 (2007-2009), GL350 (2010-2016), GLS350d (2017), ML320 (2007-2009), ML350 (2010-2014), R320 (2007-2009), R350 (2010-2012), S350 (2012), Sprinter 2500 (2010-2022), Sprinter 3500 (2010-2022), Sprinter 3500XD (2018-2022)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204400 engine water pump for Dodge Sprinter 2500. Quality replacement part from Canuck Motors, Canada.','CM1204400 Engine Water Pump | Canuck Motors'),
  ('CM1204420','Replacement engine water pump CM1204420 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.03 inches (52 mm) [.] hub diameter 2.11 inches (54 mm)

OE CROSS-REFERENCE
7B0121011C, 4648952AE, 7B0 121 011 F, 7B0121011, 4648 952BB, 4648952BA

APPLICATIONS
Chrysler Town & Country (2008-2010); Dodge Grand Caravan (2008-2010); Volkswagen Routan (2009-2010)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1204420 engine water pump for Chrysler Town & Country. Quality replacement part from Canuck Motors, Canada.','CM1204420 Engine Water Pump | Canuck Motors'),
  ('CM1259050','Replacement engine water pump CM1259050 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Shaft drive
[*] Hub height 4.24 inches (108 mm)

OE CROSS-REFERENCE
5F9Z 8501-A, 5F9Z8501BB

APPLICATIONS
Ford Five Hundred (2005-2007), Freestyle (2005-2007); Mercury Montego (2005-2007)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1259050 engine water pump for Ford Five Hundred. Quality replacement part from Canuck Motors, Canada.','CM1259050 Engine Water Pump | Canuck Motors'),
  ('CM1307340AT','Replacement engine water pump CM1307340AT for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 6.57 inches (167 mm) [.] hub diameter 5.85 inches (149 mm)

OE CROSS-REFERENCE
8-88894290-0, 8-89017439-0, 8-89018166-0

APPLICATIONS
Buick Rainier (2004-2007); Cadillac Escalade (2002-2006), Escalade ESV (2003-2006), Escalade EXT (2002-2006); Chevrolet Avalanche 1500 (2002-2006), Avalanche 2500 (2002-2006), Express 1500 (2003-2007), Express 2500 (2003-2007), Express 3500 (2003-2007), SSR (2003-2006), Silverado 1500 (1999-2006), Silverado 1500 HD (2001-2006), Silverado 2500 (1999-2006), Silverado 2500 HD (2001-2006), Silverado 3500 (2001-2006), Sonora (2003-2006), Suburban 1500 (2000-2006), Suburban 2500 (2000-2006), Tahoe (2000-2006), Trailblazer (2006-2007), Trailblazer EXT (2003-2006); GMC Envoy (2005-2007), Envoy XL (2003-2006), Envoy XUV (2004-2005), Savana 1500 (2003-2007), Savana 2500 (2003-2007), Savana 3500 (2003-2007), Sierra 1500 (1999-2006), Sierra 1500 HD (2001-2006), Sierra 2500 (1999-2004), Sierra 2500 HD (2001-2006), Sierra 3500 (2001-2006), Yukon (2000-2006), Yukon XL 1500 (2000-2006), Yukon XL 2500 (2000-2006); Hummer H2 (2003-2006); Isuzu Ascender (2003-2006); Saab 9-7x (2005-2006); Workhorse FasTrack FT1061 (2004-2005), FasTrack FT1261 (2005), FasTrack FT1461 (2004-2005), FasTrack FT1601 (2004-2005), FasTrack FT1801 (2004-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1307340AT engine water pump for Buick Rainier. Quality replacement part from Canuck Motors, Canada.','CM1307340AT Engine Water Pump | Canuck Motors'),
  ('CM1351640','Replacement engine water pump CM1351640 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 2.15 inches (55 mm) [.] hub diameter 4.72 inches (120 mm)

OE CROSS-REFERENCE
192005A2A01

APPLICATIONS
Acura ILX (2016-2022), TLX (2015-2020); Honda Accord (2013-2017), CR-V (2015-2019), Civic (2016-2022)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1351640 engine water pump for Acura ILX. Quality replacement part from Canuck Motors, Canada.','CM1351640 Engine Water Pump | Canuck Motors'),
  ('CM1352630','Replacement engine water pump CM1352630 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] No pulley
[*] Hub height 2.99 inches (76 mm) [.] hub diameter 2.8 inches (71 mm)

OE CROSS-REFERENCE
19200R1AA01, 19200R1PU01, 19200RZP003, 19200RZP013

APPLICATIONS
Acura ILX (2013-2015); Honda Civic (2012-2015)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1352630 engine water pump for Acura ILX. Quality replacement part from Canuck Motors, Canada.','CM1352630 Engine Water Pump | Canuck Motors'),
  ('CM1452510','Replacement engine water pump CM1452510 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Hub height 1.9 inches (48 mm) [.] hub diameter 1.95 inches (50 mm)

OE CROSS-REFERENCE
2S7Z8508AA, 3M4Z8501BG, 3M4Z8501BJ, 5M8E8501AD, 5M8Z8501A, 5M8Z8501B, AJTM15010, AJ0315010

APPLICATIONS
Ford Escape (2006-2008), Fusion (2006-2009); Lincoln Zephyr (2006); Mazda 6 (2003-2008); Mercury Mariner (2006-2008), Milan (2006-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1452510 engine water pump for Ford Escape. Quality replacement part from Canuck Motors, Canada.','CM1452510 Engine Water Pump | Canuck Motors'),
  ('CM1452510AH','Replacement engine water pump CM1452510AH for the vehicles listed below.

KEY FEATURES
[*] Cast Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Accessory belt drive
[*] Pulley included
[*] Includes back housing

OE CROSS-REFERENCE
AJTM15010, AJ5715010B

APPLICATIONS
Ford Escape (2006-2008), Fusion (2006-2009); Lincoln Zephyr (2006); Mazda 6 (2003-2008); Mercury Mariner (2006-2008), Milan (2006-2009)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1452510AH engine water pump for Ford Escape. Quality replacement part from Canuck Motors, Canada.','CM1452510AH Engine Water Pump | Canuck Motors'),
  ('CM1467340AH','Replacement engine water pump CM1467340AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Serpentine belt drive
[*] Includes back housing
[*] Hub height 2.52 inches (64 mm) [.] hub diameter 2.13 inches (54 mm)

OE CROSS-REFERENCE
251002G200

APPLICATIONS
Hyundai Santa Fe (2010-2012), Sonata (2006-2010), Tucson (2010-2012); Kia Forte (2010-2013), Forte Koup (2010-2012), Forte5 (2012-2013), Magentis (2007-2010), Optima (2006-2010), Rondo (2007-2009); Mitsubishi Lancer (2008-2017), Outlander (2008-2017), Outlander PHEV (2018-2019), Outlander Sport (2011-2017), RVR (2011-2017)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1467340AH engine water pump for Hyundai Santa Fe. Quality replacement part from Canuck Motors, Canada.','CM1467340AH Engine Water Pump | Canuck Motors'),
  ('CM1502340AH','Replacement engine water pump CM1502340AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Serpentine belt drive
[*] Pulley included
[*] Includes back housing
[*] Hub height 2.81 inches (71 mm) [.] hub diameter 3.82 inches (97 mm)

APPLICATIONS
Nissan Altima (2002-2013), Rogue (2008-2013), Rogue Select (2014-2015), Sentra (2002-2012), X-Trail (2002-2020)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1502340AH engine water pump for Nissan Altima. Quality replacement part from Canuck Motors, Canada.','CM1502340AH Engine Water Pump | Canuck Motors'),
  ('CM1602090','Replacement engine water pump CM1602090 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Reverse rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 3.66 inches (93 mm) [.] hub diameter 2.36 inches (60 mm)

OE CROSS-REFERENCE
21111AA280, 21111AA320

APPLICATIONS
Subaru Forester (2006-2010), Impreza (2006-2011), Legacy (2006-2012), Outback (2006-2012)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1602090 engine water pump for Subaru Forester. Quality replacement part from Canuck Motors, Canada.','CM1602090 Engine Water Pump | Canuck Motors'),
  ('CM1701770','Replacement engine water pump CM1701770 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.95 inches (50 mm) [.] hub diameter 2.26 inches (57 mm)

OE CROSS-REFERENCE
41530A, SI82207, 1610079135, 161007913583, 1610079136, 161007918583, 1611079026, 161008000000

APPLICATIONS
Toyota Camry (1987-2001), Celica (1987-1999), MR2 (1991-1995), RAV4 (1996-2000), Solara (1999-2001)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1701770 engine water pump for Toyota Camry. Quality replacement part from Canuck Motors, Canada.','CM1701770 Engine Water Pump | Canuck Motors'),
  ('CM1701770AH','Replacement engine water pump CM1701770AH for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Metal impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Includes back housing
[*] Hub height 1.95 inches (50 mm) [.] hub diameter 2.26 inches (57 mm)

OE CROSS-REFERENCE
1610009040, 1610009041, 1610079075, 161007907577, 161007907584, 1610079185, 161007918583, 1610079186

APPLICATIONS
Toyota Camry (1987-2001), Celica (1987-1999), MR2 (1991-1995), RAV4 (1996-2000), Solara (1999-2001)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1701770AH engine water pump for Toyota Camry. Quality replacement part from Canuck Motors, Canada.','CM1701770AH Engine Water Pump | Canuck Motors'),
  ('CM1802220','Replacement engine water pump CM1802220 for the vehicles listed below.

KEY FEATURES
[*] Aluminum housing
[*] Plastic impeller
[*] Standard rotation
[*] Timing belt drive
[*] Pulley included
[*] Hub height 1.81 inches (46 mm) [.] hub diameter 2.25 inches (57 mm)

OE CROSS-REFERENCE
06A121011H, 06A121011HX, 06A121011LV, 06A121011T, 06A121011G, 06A121012E, 038121012X, 06A121011HV

APPLICATIONS
Audi A4 (2001-2006), A4 Quattro (2001-2005), TT (2000-2006), TT Quattro (2000-2006); Volkswagen Beetle (1998-2005), Golf (1998-2006), Jetta (1999-2015), Passat (2000-2005)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM1802220 engine water pump for Audi A4. Quality replacement part from Canuck Motors, Canada.','CM1802220 Engine Water Pump | Canuck Motors'),
  ('CM190','Replacement engine water pump CM190 for the vehicles listed below.

OE CROSS-REFERENCE
161A0-29015, 161A0-39015

APPLICATIONS
Lexus CT200h (2011-2017); Toyota Prius (2010-2015), Prius C (2012-2019), Prius Plug-In (2012-2015), Prius V (2012-2017)

Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above.','CM190 engine water pump for Lexus CT200h. Quality replacement part from Canuck Motors, Canada.','CM190 Engine Water Pump | Canuck Motors')
) as d(sku, description, meta_description, title_tag)
where p.sku = d.sku and coalesce(p.description, '') = '';
