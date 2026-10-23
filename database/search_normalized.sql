-- Run in the NEW Supabase SQL Editor.
-- Lets search ignore dashes, spaces, dots and upper/lower case,
-- so "CM-1252102", "cm 1252102" and "CM1252102" all match.
create extension if not exists pg_trgm;

alter table public.products
  add column if not exists sku_norm text
  generated always as (regexp_replace(upper(coalesce(sku, '')), '[^A-Z0-9]', '', 'g')) stored;

alter table public.product_oe_numbers
  add column if not exists oe_number_norm text
  generated always as (regexp_replace(upper(coalesce(oe_number, '')), '[^A-Z0-9]', '', 'g')) stored;

alter table public.product_interchanges
  add column if not exists interchange_number_norm text
  generated always as (regexp_replace(upper(coalesce(interchange_number, '')), '[^A-Z0-9]', '', 'g')) stored;

create index if not exists products_sku_norm_trgm on public.products using gin (sku_norm gin_trgm_ops);
create index if not exists oe_number_norm_trgm on public.product_oe_numbers using gin (oe_number_norm gin_trgm_ops);
create index if not exists interchange_number_norm_trgm on public.product_interchanges using gin (interchange_number_norm gin_trgm_ops);
