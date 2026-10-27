-- Lets the admin switch Uber same-day delivery on/off from /admin/fulfillment.
alter table public.fulfillment_settings
  add column if not exists uber_enabled boolean not null default true;
