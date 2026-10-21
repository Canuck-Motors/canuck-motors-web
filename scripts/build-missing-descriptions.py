"""Builds database/missing_descriptions_old_data.sql: descriptions for products that have
none on the new site, written ONLY from the old site's data (CanuckMotors/supabase/seed.sql):
specs, OE numbers and the vehicles each part fits. Run: python3 scripts/build-missing-descriptions.py <seed.sql>"""
import re, sys, collections

SKUS = sys.argv[2].split(",") if len(sys.argv) > 2 else []
seed = open(sys.argv[1], encoding="utf-8").read().split("\n")

TOK = re.compile(r"'((?:[^']|'')*)'|(NULL|true|false)|(-?\d+(?:\.\d+)?)")
def row(line):
    out = []
    for m in TOK.finditer(line):
        if m.group(1) is not None: out.append(m.group(1).replace("''", "'"))
        elif m.group(2) is not None: out.append({"NULL": None, "true": True, "false": False}[m.group(2)])
        else: out.append(float(m.group(3)) if "." in m.group(3) else int(m.group(3)))
    return out

tables = collections.defaultdict(list)
cur = None
for line in seed:
    m = re.match(r'INSERT INTO "api"\."(\w+)"', line)
    if m: cur = m.group(1); continue
    if cur and line.startswith("\t("): tables[cur].append(row(line))
    elif cur and not line.strip(): cur = None

want = set(SKUS)
prod = {r[0]: r for r in tables["products"] if r[0] in want}
spec = collections.defaultdict(dict)
for r in tables["string_spec"]:
    if r[0] in want: spec[r[0]][r[1]] = r[2]
for r in tables["bool_spec"]:
    if r[0] in want: spec[r[0]][r[1]] = r[2]
for r in tables["number_spec"]:
    if r[0] in want: spec[r[0]][r[1]] = (r[3], r[2])
oe = collections.defaultdict(list)
for r in tables["oe_numbers"]:
    if r[0] in want and r[2] and r[2] not in oe[r[0]]: oe[r[0]].append(r[2])
car = {r[0]: r for r in tables["car"]}
apps = collections.defaultdict(lambda: collections.defaultdict(set))
for r in tables["fits"]:
    if r[0] in want and r[1] in car:
        c = car[r[1]]; apps[r[0]][(c[1], c[2])].add(c[3])

def num(v):
    return f"{v:g}"
def features(s):
    f = []
    if s.get("Housing Material"): f.append(f"{s['Housing Material']} housing")
    if s.get("Impeller Material"): f.append(f"{s['Impeller Material']} impeller")
    if s.get("Impeller Rotation"): f.append(f"{s['Impeller Rotation']} rotation")
    if s.get("Water Pump Drive Type"): f.append(f"{s['Water Pump Drive Type'].lower()} drive".capitalize())
    if "Pulley Included" in s: f.append("Pulley included" if s["Pulley Included"] is True else "No pulley")
    if s.get("Includes Back Housing") is True: f.append("Includes back housing")
    if s.get("Thermostat And Housing Included") is True: f.append("Includes thermostat and housing")
    if s.get("Contents"): f.append(f"Contents: {s['Contents']}")
    hh, hd = s.get("Hub Height"), s.get("Hub Diameter") or s.get("Hub Pilot Diameter")
    def meas(name, v):
        val, uom = v
        if uom and uom.lower().startswith("in"): return f"{name} {num(val)} inches ({num(round(val*25.4))} mm)"
        return f"{name} {num(val)} {uom or ''}".strip()
    if hh and hd: f.append(meas("Hub height", hh) + " [.] " + meas("hub diameter", hd))
    elif hh: f.append(meas("Hub height", hh))
    return f

def applications(a):
    by_make = collections.defaultdict(list)
    for (mk, md), years in sorted(a.items()):
        y = sorted(years); r = f"{y[0]}" if y[0] == y[-1] else f"{y[0]}-{y[-1]}"
        by_make[mk].append(f"{md} ({r})")
    return "; ".join(f"{mk} " + ", ".join(v) for mk, v in by_make.items())

out = ["-- Descriptions for products that had NONE on the new site.",
       "-- Built only from the old Canuck Motors site data (specs, OE numbers, fitment). Bullets are [*].",
       "-- Only touches products whose description is empty. Safe to run twice.",
       "update public.products p set description = replace(replace(d.description, '[*]', chr(8226)), '[.]', chr(183)),",
       "  meta_description = coalesce(nullif(p.meta_description, ''), d.meta_description),",
       "  title_tag = coalesce(nullif(p.title_tag, ''), d.title_tag)",
       "from (values"]
vals = []
for sku in SKUS:
    if sku not in prod: print("no old data for", sku, file=sys.stderr); continue
    ptype = prod[sku][1]
    kind = "engine timing belt kit with water pump" if "Timing" in ptype else "engine water pump"
    a = applications(apps[sku])
    lines = [f"Replacement {kind} {sku}" + (" for the vehicles listed below." if a else ".")]
    f = features(spec[sku])
    if f: lines += ["", "KEY FEATURES"] + [f"[*] {x}" for x in f]
    if oe[sku]: lines += ["", "OE CROSS-REFERENCE", ", ".join(oe[sku][:8])]
    if a: lines += ["", "APPLICATIONS", a]
    lines += ["", "Fitment varies by engine and trim. Please confirm with your vehicle or VIN before ordering. Full specifications, OE numbers and compatible vehicles are in the tabs above."]
    first = next(iter(sorted(apps[sku])), None)
    label = "Engine Timing Belt Kit" if "Timing" in ptype else "Engine Water Pump"
    meta = f"{sku} {kind}" + (f" for {first[0]} {first[1]}" if first else "") + ". Quality replacement part from Canuck Motors, Canada."
    title = f"{sku} {label} | Canuck Motors"
    q = lambda s: "'" + s.replace("'", "''") + "'"
    vals.append(f"  ({q(sku)},{q(chr(10).join(lines))},{q(meta)},{q(title)})")
out.append(",\n".join(vals))
out += [") as d(sku, description, meta_description, title_tag)",
        "where p.sku = d.sku and coalesce(p.description, '') = '';", ""]
open("database/missing_descriptions_old_data.sql", "w").write("\n".join(out))
print(f"wrote {len(vals)} descriptions")
