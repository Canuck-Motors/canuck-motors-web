-- Lets staff edit a product (name, description, price) and show/hide it on the website.
-- Run once in the Supabase SQL editor.
create or replace function public.admin_update_product(
  p_product_id bigint,
  p_name text,
  p_description text,
  p_price numeric,
  p_is_active boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  if coalesce(trim(p_name), '') = '' then
    raise exception 'Product name is required';
  end if;
  if p_price is null or p_price < 0 then
    raise exception 'Price must be zero or more';
  end if;

  update public.products
     set product_name = trim(p_name),
         description  = nullif(trim(coalesce(p_description, '')), ''),
         price        = p_price,
         is_active    = p_is_active
   where id = p_product_id;
end;
$$;

grant execute on function public.admin_update_product(bigint, text, text, numeric, boolean) to authenticated;
