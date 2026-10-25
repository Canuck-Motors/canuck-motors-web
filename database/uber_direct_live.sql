-- Live Uber tracking data (driver, location, ETA) for the customer order page.
alter table public.orders
  add column if not exists uber_live jsonb;
