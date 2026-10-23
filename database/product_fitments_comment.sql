-- Old site: Vehicle Compatibility > Body Type and Comment (exact old text)
alter table public.product_fitments
  add column if not exists comment text,
  add column if not exists body_type text;
