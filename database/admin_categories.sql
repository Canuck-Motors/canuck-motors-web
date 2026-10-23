-- Admin category management. Run once in the Supabase SQL editor.

alter table public.product_categories
  add column if not exists sort_order int,
  add column if not exists image_path text;

-- Staff can see hidden categories too.
drop policy if exists "staff can read all categories" on public.product_categories;
create policy "staff can read all categories" on public.product_categories
  for select to authenticated using (public.current_user_staff_role() is not null);

-- Create (p_id null) or update a category. The web address (slug) of an existing one never changes.
create or replace function public.admin_save_category(
  p_id bigint, p_name text, p_is_active boolean,
  p_image_path text default null, p_clear_image boolean default false
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare v_id bigint; v_slug text; v_base text; n int := 1;
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Category name is required';
  end if;

  if p_id is null then
    v_base := trim(both '-' from regexp_replace(lower(trim(p_name)), '[^a-z0-9]+', '-', 'g'));
    v_slug := v_base;
    while exists (select 1 from public.product_categories where slug = v_slug) loop
      n := n + 1;
      v_slug := v_base || '-' || n;
    end loop;

    insert into public.product_categories
      (category_name, slug, is_active, is_delete, sort_order, image_path)
    values
      (trim(p_name), v_slug, coalesce(p_is_active, true), false,
       coalesce((select max(sort_order) from public.product_categories), 0) + 1,
       p_image_path)
    returning id into v_id;
    return v_id;
  end if;

  update public.product_categories
     set category_name = trim(p_name),
         is_active = coalesce(p_is_active, is_active),
         image_path = case when p_clear_image then null else coalesce(p_image_path, image_path) end
   where id = p_id;
  return p_id;
end;
$$;
grant execute on function public.admin_save_category(bigint, text, boolean, text, boolean) to authenticated;

-- Set the display order: the array is the new order, first = first on the site.
create or replace function public.admin_reorder_categories(p_ids bigint[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare i int;
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    update public.product_categories set sort_order = i where id = p_ids[i];
  end loop;
end;
$$;
grant execute on function public.admin_reorder_categories(bigint[]) to authenticated;

-- Move products into a category (null = no category).
create or replace function public.admin_set_product_category(p_ids bigint[], p_category_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  update public.products set product_category_id = p_category_id where id = any(p_ids);
end;
$$;
grant execute on function public.admin_set_product_category(bigint[], bigint) to authenticated;

-- Categories that have at least one visible product (the public site hides empty ones).
create or replace function public.categories_with_products()
returns table (category_id bigint)
language sql
stable
security definer
set search_path = public
as $$
  select distinct product_category_id::bigint
    from public.products
   where is_active = true and is_delete = false and product_category_id is not null
$$;
grant execute on function public.categories_with_products() to anon, authenticated;
