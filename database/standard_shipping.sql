-- Standard shipping (Chit Chats Select, quoted Oct 2026 from Vancouver, rounded up to the next dollar).
-- Zones: BC (V), AB (T, S), ON (K L M N P R), QC (G H J + Atlantic A B C E).
-- Edit prices here when Chit Chats changes theirs. No row for a weight = "contact us for shipping".
create table if not exists shipping_rates (
  zone text not null,
  max_weight_kg numeric(6,2) not null,
  price_cents integer not null check (price_cents >= 0),
  primary key (zone, max_weight_kg)
);
alter table shipping_rates enable row level security;
drop policy if exists "shipping_rates readable" on shipping_rates;
create policy "shipping_rates readable" on shipping_rates for select using (true);

insert into shipping_rates (zone, max_weight_kg, price_cents) values
  ('BC', 1.00,  600), ('BC', 2.50,  700), ('BC', 6.00,  900),
  ('AB', 1.00, 1000), ('AB', 2.50, 1300), ('AB', 6.00, 2100),
  ('ON', 1.00, 1000), ('ON', 2.50, 1300), ('ON', 6.00, 2200),
  ('QC', 1.00, 1100), ('QC', 2.50, 1600), ('QC', 6.00, 2800)
on conflict (zone, max_weight_kg) do update set price_cents = excluded.price_cents;

alter table orders
  add column if not exists shipping_zone text,
  add column if not exists shipping_weight_kg numeric(7,3),
  add column if not exists shipping_quote_postal text,
  add column if not exists shipping_zone_mismatch boolean not null default false;

-- Delivery address chosen in the cart (account address or a different location).
alter table orders add column if not exists ship_to jsonb;

-- What the carrier really charged for the label (staff enter it on the order).
alter table orders add column if not exists shipping_cost numeric(8,2);

-- Payment rows made before this fix left shipping out, so Stripe reconciliation flagged them.
update payments p
set amount = o.total_amount + o.delivery_fee
from orders o
where p.order_id = o.id
  and coalesce(o.delivery_fee, 0) > 0
  and p.amount = o.total_amount;

-- Marks orders whose confirmation email has been sent, so customers never get it twice.
alter table orders add column if not exists confirmation_sent_at timestamptz;
