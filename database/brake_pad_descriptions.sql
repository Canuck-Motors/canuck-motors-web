-- Brake pad descriptions, meta descriptions and title tags.
-- Ceramic copy follows the approved Canuck Motors listing text. Semi-metallic sets get a plain factual description.
-- Bullets are written as [*] and turned into real bullets by the query, so the file is plain ASCII.
-- Only touches description, meta_description, title_tag. Safe to run twice.
update public.products p set description = replace(replace(d.description, '[*]', chr(8226)), '[.]', chr(183)), meta_description = d.meta_description, title_tag = d.title_tag
from (values
  ('CM1737H','Front ceramic brake pad set CM1737H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1737H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1737H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1012H','Rear ceramic brake pad set CM1012H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1012H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1012H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM967HSM','Rear semi-metallic brake pad set CM967HSM

KEY FEATURES
[*] Semi-metallic friction material
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Mounting hardware included

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM967HSM semi-metallic disc brake pads, rear. Direct-fit, vehicle-specific. Canuck Motors, Canada.','CM967HSM Rear Semi-Metallic Brake Pad Set | Canuck Motors'),
  ('CMK1044-1095','Front and rear ceramic brake pad kit CMK1044-1095

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings

WHAT''S IN THE KIT
[*] Front set CM1044H
[*] Rear set CM1095H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1044-1095 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1044-1095 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1084SM-967SM','Front and rear semi-metallic brake pad kit CMK1084SM-967SM

KEY FEATURES
[*] Semi-metallic friction material
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1084HSM
[*] Rear set CM967HSM

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1084SM-967SM semi-metallic disc brake pads, front and rear. Direct-fit, vehicle-specific. Canuck Motors, Canada.','CMK1084SM-967SM Front and Rear Semi-Metallic Brake Pad Kit | Canuck Motors'),
  ('CMK1273-1274','Front and rear ceramic brake pad kit CMK1273-1274

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1273H
[*] Rear set CM1274H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1273-1274 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1273-1274 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1324-1391','Front and rear ceramic brake pad kit CMK1324-1391

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1324H
[*] Rear set CM1391H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1324-1391 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1324-1391 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1327-1274','Front and rear ceramic brake pad kit CMK1327-1274

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1327H
[*] Rear set CM1274H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1327-1274 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1327-1274 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1327-1326','Front and rear ceramic brake pad kit CMK1327-1326

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1327H
[*] Rear set CM1326H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1327-1326 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1327-1326 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1363-1194','Front and rear ceramic brake pad kit CMK1363-1194

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1363H
[*] Rear set CM1194H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1363-1194 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1363-1194 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1543-1544','Front and rear ceramic brake pad kit CMK1543-1544

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1543H
[*] Rear set CM1544H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1543-1544 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1543-1544 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK2087-1012','Front and rear ceramic brake pad kit CMK2087-1012

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM2087H
[*] Rear set CM1012H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK2087-1012 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK2087-1012 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CM1044H','Front ceramic brake pad set CM1044H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1044H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1044H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1084H','Front ceramic brake pad set CM1084H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1084H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1084H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1084HSM','Front semi-metallic brake pad set CM1084HSM

KEY FEATURES
[*] Semi-metallic friction material
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Mounting hardware included

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1084HSM semi-metallic disc brake pads, front. Direct-fit, vehicle-specific. Canuck Motors, Canada.','CM1084HSM Front Semi-Metallic Brake Pad Set | Canuck Motors'),
  ('CM1589H','Front ceramic brake pad set CM1589H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1589H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1589H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1273H','Front ceramic brake pad set CM1273H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1273H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1273H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM2087H','Front ceramic brake pad set CM2087H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM2087H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM2087H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM815H','Front ceramic brake pad set CM815H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM815H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM815H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1086H','Rear ceramic brake pad set CM1086H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1086H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1086H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1095H','Rear ceramic brake pad set CM1095H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1095H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1095H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1274H','Rear ceramic brake pad set CM1274H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1274H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1274H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1596H','Rear ceramic brake pad set CM1596H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1596H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1596H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1707H','Rear ceramic brake pad set CM1707H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1707H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1707H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1878H','Rear ceramic brake pad set CM1878H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1878H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1878H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1916H','Rear ceramic brake pad set CM1916H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1916H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1916H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CMK1623-1846','Front and rear ceramic brake pad kit CMK1623-1846

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1623H
[*] Rear set CM1846H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1623-1846 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1623-1846 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1737-905','Front and rear ceramic brake pad kit CMK1737-905

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1737H
[*] Rear set CM905H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1737-905 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1737-905 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1815-1916','Front and rear ceramic brake pad kit CMK1815-1916

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1815H
[*] Rear set CM1916H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1815-1916 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1815-1916 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1843-1734','Front and rear ceramic brake pad kit CMK1843-1734

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1843H
[*] Rear set CM1734H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1843-1734 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1843-1734 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CM1210H','Front ceramic brake pad set CM1210H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1210H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1210H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1363H','Front ceramic brake pad set CM1363H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1363H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1363H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1593H','Front ceramic brake pad set CM1593H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1593H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1593H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1649H','Front ceramic brake pad set CM1649H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1649H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1649H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM914H','Front ceramic brake pad set CM914H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM914H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM914H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1194H','Rear ceramic brake pad set CM1194H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1194H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1194H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1391H','Rear ceramic brake pad set CM1391H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1391H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1391H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1734H','Rear ceramic brake pad set CM1734H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1734H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1734H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM967H','Rear ceramic brake pad set CM967H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM967H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM967H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CMK-914-1878','Front and rear ceramic brake pad kit CMK-914-1878

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM914H
[*] Rear set CM1878H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK-914-1878 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK-914-1878 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1295-1544','Front and rear ceramic brake pad kit CMK1295-1544

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1295H
[*] Rear set CM1544H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1295-1544 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1295-1544 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1324-1212','Front and rear ceramic brake pad kit CMK1324-1212

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1324H
[*] Rear set CM1212H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1324-1212 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1324-1212 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1363-1707','Front and rear ceramic brake pad kit CMK1363-1707

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1363H
[*] Rear set CM1707H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1363-1707 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1363-1707 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CM1295H','Front ceramic brake pad set CM1295H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1295H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1295H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1324H','Front ceramic brake pad set CM1324H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1324H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1324H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1846H','Rear ceramic brake pad set CM1846H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1846H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1846H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1354H','Rear ceramic brake pad set CM1354H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1354H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1354H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CMK1084-967','Front and rear ceramic brake pad kit CMK1084-967

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1084H
[*] Rear set CM967H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1084-967 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1084-967 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1210-1212','Front and rear ceramic brake pad kit CMK1210-1212

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1210H
[*] Rear set CM1212H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1210-1212 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1210-1212 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1210-1391','Front and rear ceramic brake pad kit CMK1210-1391

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1210H
[*] Rear set CM1391H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1210-1391 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1210-1391 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1210-945S','Front and rear ceramic brake pad kit CMK1210-945S

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings

WHAT''S IN THE KIT
[*] Front set CM1210H
[*] Rear set 945CM

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1210-945S ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1210-945S Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1210-CM1354','Front and rear ceramic brake pad kit CMK1210-CM1354

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1210H
[*] Rear set CM1354H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1210-CM1354 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1210-CM1354 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1327-1596','Front and rear ceramic brake pad kit CMK1327-1596

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1327H
[*] Rear set CM1596H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1327-1596 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1327-1596 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1589-1326','Front and rear ceramic brake pad kit CMK1589-1326

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1589H
[*] Rear set CM1326H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1589-1326 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1589-1326 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1589-1596','Front and rear ceramic brake pad kit CMK1589-1596

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1589H
[*] Rear set CM1596H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1589-1596 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1589-1596 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK1593-1544','Front and rear ceramic brake pad kit CMK1593-1544

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM1593H
[*] Rear set CM1544H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK1593-1544 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK1593-1544 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK2087-1602','Front and rear ceramic brake pad kit CMK2087-1602

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM2087H
[*] Rear set CM1602H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK2087-1602 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK2087-1602 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK815-905','Front and rear ceramic brake pad kit CMK815-905

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM815H
[*] Rear set CM905H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK815-905 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK815-905 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CMK914-1086','Front and rear ceramic brake pad kit CMK914-1086

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

WHAT''S IN THE KIT
[*] Front set CM914H
[*] Rear set CM1086H

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CMK914-1086 ceramic disc brake pads, front and rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CMK914-1086 Front and Rear Ceramic Brake Pad Kit | Canuck Motors'),
  ('CM1543H','Front ceramic brake pad set CM1543H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1543H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1543H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1326H','Rear ceramic brake pad set CM1326H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1326H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1326H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1815H','Front ceramic brake pad set CM1815H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1815H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1815H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1843H','Front ceramic brake pad set CM1843H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1843H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1843H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1544H','Rear ceramic brake pad set CM1544H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1544H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1544H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1327H','Front ceramic brake pad set CM1327H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1327H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1327H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1602H','Rear ceramic brake pad set CM1602H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1602H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1602H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1212H','Rear ceramic brake pad set CM1212H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1212H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1212H Rear Ceramic Brake Pad Set | Canuck Motors'),
  ('CM1623H','Front ceramic brake pad set CM1623H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM1623H ceramic disc brake pads, front. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM1623H Front Ceramic Brake Pad Set | Canuck Motors'),
  ('CM905H','Rear ceramic brake pad set CM905H

Engineered for Canadian roads, seasons and daily driving confidence.

KEY FEATURES
[*] OE-optimized ceramic blend for smooth, predictable braking
[*] Low-dust formula helps keep wheels cleaner
[*] Quiet Stop engineering minimizes squeal and vibration
[*] Direct-fit, vehicle-specific design for proper fit and alignment
[*] Copper-free formulation
[*] Built for Canadian conditions: cold starts, wet roads and seasonal temperature swings
[*] Mounting hardware included

Designed with Canadian drivers in mind, these ceramic pads deliver dependable stopping performance for daily commuting and highway driving, with smooth engagement and quiet operation.

Fitment varies by vehicle, trim and brake package. Please confirm with your vehicle or VIN before ordering. Compatible vehicles are listed in the tabs above.','CM905H ceramic disc brake pads, rear. Direct-fit, vehicle-specific; low dust, quiet stop, copper-free. Canuck Motors, Canada.','CM905H Rear Ceramic Brake Pad Set | Canuck Motors')
) as d(sku, description, meta_description, title_tag)
where p.sku = d.sku;
