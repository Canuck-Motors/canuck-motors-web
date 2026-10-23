import json,collections,re
D=json.load(open('tests/part-finder/data/snapshot.json'))
T={k:[dict(zip(v['cols'],r)) for r in v['rows']] for k,v in D.items()}
A=json.load(open('tests/part-finder/data/aces.json'))
P={p['id']:p for p in T['products'] if p['is_active'] and not p['is_delete']}
SKU={p['sku'].upper():p for p in P.values()}
VF={v['id']:v for v in T['vehicle_fitments']}
Y={y['id']:y['year'] for y in T['year']};M={m['id']:m['manufacturer_name'] for m in T['manufacturer']}
MO={m['id']:m['model_name'] for m in T['models']};E={e['id']:e['engine_name'] for e in T['engine_sizes']};TR={t['id']:t['trim_name'] for t in T['trim']}
n=lambda s:re.sub('[^a-z0-9]','',str(s).lower())
def ekey(name):  # "2L | L4 | 1984cc | GAS" -> ("l4","2.0")
    li=re.search(r'([\d.]+)\s*L\b',name); et=re.search(r'\b([LVHW]\d{1,2}|R\d)\b',name)
    return ((et.group(1).lower() if et else ''),(('%.1f'%float(li.group(1))) if li else ''))
db=collections.defaultdict(lambda:collections.defaultdict(list))  # (y,make,model,et,cc) -> sku -> [(trim,comment)]
dbveh=set()
for r in T['product_fitments']:
    v=VF[r['vehicle_fitment_id']]; et,cc=ekey(E[v['engine_size_id']])
    vk=(Y[v['year_id']],n(M[v['manufacturer_id']]),n(MO[v['model_id']]),et,cc)
    dbveh.add(vk)
    if r['product_id'] in P: db[vk][P[r['product_id']]['sku'].upper()].append((TR.get(v['trim_id'],''),r['comment'] or ''))
s1=A['Aces_Canuck_01_29_2025']
res=collections.Counter(); ex=collections.defaultdict(list)
missing_parts=collections.Counter(); note_diff=[]
for r in s1:
    vk=(int(r['Year']),n(r['MakeName']),n(r['ModelName']),str(r['Engtype']).lower(),('%.1f'%float(r['Liter'])) if r['Liter'] not in (None,'None','') else '')
    sku=str(r['Partno']).upper()
    if sku not in SKU: res['part not on website (inactive/missing product)']+=1; missing_parts[sku]+=1; continue
    if vk not in dbveh: res['vehicle+engine not in website fitment tables']+=1; ex['veh'].append(vk); continue
    rows=db[vk].get(sku)
    if not rows: res['part not linked to this vehicle+engine in DB']+=1; ex['link'].append((vk,sku,r['Note with Submodel and Attributes'])); continue
    note=r['Note with Submodel and Attributes'] or ''
    parts=note.split(';'); subs=[s.strip() for s in parts[0].split(',')] if parts else []
    attrs=';'.join(parts[1:])
    dbtrims=set(t for t,_ in rows)
    miss=[s for s in subs if s and s not in dbtrims]
    # attributes present in db comments?
    acl=[a.strip().lower() for a in re.split('[;,]',attrs) if a.strip()]
    dbc=' '.join(c.lower() for _,c in rows)
    lost=[a for a in acl if a not in dbc]
    if miss: res['submodel(s) in sheet missing from DB trims']+=1; ex['trim'].append((vk,sku,miss[:5]))
    if lost: res['note attribute in sheet missing from DB comment']+=1; note_diff.append((vk,sku,lost))
    if not miss and not lost: res['matches DB (part, vehicle, trims, notes)']+=1
print('sheet1 rows',len(s1)); 
for k,v in res.most_common(): print(f'  {v:6d}  {k}')
print('parts in sheet but not active on site:',len(missing_parts),sorted(missing_parts)[:60])
for k in ['veh','link','trim']:
    print(k,ex[k][:6])
print('note diffs',note_diff[:12])
lostc=collections.Counter(a for _,_,l in note_diff for a in l); print(lostc.most_common(20))
json.dump({'res':res,'missing_parts':missing_parts,'veh':ex['veh'][:200],'link':ex['link'][:300],'trim':ex['trim'][:200],'notes':note_diff[:300]},open('tests/part-finder/data/aces_compare.json','w'),default=str)
