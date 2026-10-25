-- Sales tax by delivery province (Canada, 2026 rates), charged on parts + shipping.
-- READ BEFORE RUNNING: only charge tax you are registered to collect. Ask your accountant, then
-- change the flags below. Defaults: GST/HST on everywhere, provincial tax (PST/QST/RST) on for BC only.
create table if not exists tax_settings (
  id integer primary key default 1 check (id = 1),
  collect_tax boolean not null default true   -- false = charge no tax at all (e.g. small supplier)
);
insert into tax_settings (id) values (1) on conflict do nothing;

create table if not exists tax_rates (
  province text primary key,
  gst_name text not null,              -- GST or HST
  gst_rate numeric(7,5) not null,
  gst_enabled boolean not null default true,
  pst_name text,                       -- PST, RST or QST (null = none)
  pst_rate numeric(7,5) not null default 0,
  pst_enabled boolean not null default false
);

insert into tax_rates (province, gst_name, gst_rate, pst_name, pst_rate, pst_enabled) values
  ('AB','GST',0.05,null,0,false),
  ('BC','GST',0.05,'PST',0.07,true),
  ('MB','GST',0.05,'RST',0.07,false),
  ('NB','HST',0.15,null,0,false),
  ('NL','HST',0.15,null,0,false),
  ('NS','HST',0.14,null,0,false),
  ('NT','GST',0.05,null,0,false),
  ('NU','GST',0.05,null,0,false),
  ('ON','HST',0.13,null,0,false),
  ('PE','HST',0.15,null,0,false),
  ('QC','GST',0.05,'QST',0.09975,false),
  ('SK','GST',0.05,'PST',0.06,false),
  ('YT','GST',0.05,null,0,false)
on conflict (province) do update set
  gst_name = excluded.gst_name, gst_rate = excluded.gst_rate,
  pst_name = excluded.pst_name, pst_rate = excluded.pst_rate;
-- (re-running keeps your pst_enabled / gst_enabled choices)

alter table tax_settings enable row level security;
alter table tax_rates enable row level security;
drop policy if exists "tax_rates readable" on tax_rates;
create policy "tax_rates readable" on tax_rates for select using (true);
drop policy if exists "tax_settings readable" on tax_settings;
create policy "tax_settings readable" on tax_settings for select using (true);

-- What was charged on each order (total_amount stays as it was).
alter table orders
  add column if not exists sales_tax numeric(8,2) not null default 0,
  add column if not exists tax_lines jsonb;
