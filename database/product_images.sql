-- Run in the NEW Supabase SQL Editor (after creating the public bucket "product-images")
create table if not exists public.product_images (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products(id) on delete cascade,
  path text not null,              -- path inside the bucket, e.g. CM1253010/CM1253010-1.jpg
  sort_order int not null default 0, -- lowest number = main image
  unique (product_id, path)
);
create index if not exists product_images_product_idx on public.product_images(product_id, sort_order);

alter table public.product_images enable row level security;

drop policy if exists "Public read product images" on public.product_images;
create policy "Public read product images" on public.product_images
  for select to anon, authenticated using (true);

drop policy if exists "Staff manage product images" on public.product_images;
create policy "Staff manage product images" on public.product_images
  for all to authenticated
  using (public.current_user_staff_role() is not null)
  with check (public.current_user_staff_role() is not null);

-- Storage: staff can upload / replace / delete files in the bucket
drop policy if exists "Staff manage product image files" on storage.objects;
create policy "Staff manage product image files" on storage.objects
  for all to authenticated
  using (bucket_id = 'product-images' and public.current_user_staff_role() is not null)
  with check (bucket_id = 'product-images' and public.current_user_staff_role() is not null);
