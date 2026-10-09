-- Run first in the Supabase SQL Editor
create table if not exists public.product_specifications (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  spec_name text not null,
  spec_value text not null,
  sort_order int not null default 0,
  unique (product_id, spec_name)
);
create index if not exists product_specifications_product_idx on public.product_specifications(product_id);
alter table public.product_specifications enable row level security;
drop policy if exists "Public read specs" on public.product_specifications;
create policy "Public read specs" on public.product_specifications for select to anon, authenticated using (true);
