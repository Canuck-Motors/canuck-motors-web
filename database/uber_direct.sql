-- Uber Direct same-day delivery: order columns + status/location events.
alter table public.orders
  add column if not exists delivery_method text not null default 'standard',
  add column if not exists delivery_fee numeric(10,2) not null default 0,
  add column if not exists delivery_phone text,
  add column if not exists uber_quote_id text,
  add column if not exists uber_delivery_id text,
  add column if not exists uber_tracking_url text,
  add column if not exists uber_status text,
  add column if not exists uber_dropoff jsonb;

create table if not exists public.uber_delivery_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  uber_delivery_id text not null,
  status text,
  courier_name text,
  courier_lat double precision,
  courier_lng double precision,
  eta timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists uber_delivery_events_order_idx
  on public.uber_delivery_events (order_id, created_at desc);

-- Only the server (service role) reads and writes events.
alter table public.uber_delivery_events enable row level security;
