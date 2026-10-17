-- Saved delivery address for each customer (edited on the My Account page).
-- Safe to run twice.
alter table public.users
  add column if not exists shipping_address jsonb;
