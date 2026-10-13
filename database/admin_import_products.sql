-- Import / create products from the admin Import page. Run once in the Supabase SQL editor.

create table if not exists public.product_import_jobs (
  id bigint generated always as identity primary key,
  file_name text,
  created_count int not null default 0,
  updated_count int not null default 0,
  error_count int not null default 0,
  created_by uuid default auth.uid(),
  created_on timestamptz not null default now()
);
alter table public.product_import_jobs enable row level security;
drop policy if exists "Staff read product imports" on public.product_import_jobs;
create policy "Staff read product imports" on public.product_import_jobs
  for select to authenticated using (public.current_user_staff_role() is not null);

-- p_apply = false: preview only (every row is really tried, then rolled back).
-- New products are created HIDDEN so they do not go live without photos.
create or replace function public.admin_import_products(
  p_rows jsonb, p_apply boolean, p_file_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
  i int := 0;
  out jsonb := '[]'::jsonb;
  seen text[] := '{}';
  v_sku text; v_name text; v_price numeric; v_desc text; v_cat text;
  v_qty int; v_low int; v_cat_id bigint; v_pid bigint;
  v_action text; v_msg text; v_row int;
  n_create int := 0; n_update int := 0; n_err int := 0;
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 then
    raise exception 'Send between 1 and 5000 rows';
  end if;

  for r in select value from jsonb_array_elements(p_rows) loop
    i := i + 1;
    v_action := null; v_msg := null; v_pid := null; v_cat_id := null;
    v_row := coalesce(nullif(r->>'row_number', '')::int, i);
    v_sku  := nullif(trim(r->>'sku'), '');
    v_name := nullif(trim(r->>'name'), '');
    v_desc := nullif(trim(r->>'description'), '');
    v_cat  := nullif(trim(r->>'category'), '');

    begin
      v_price := nullif(trim(r->>'price'), '')::numeric;
      v_qty   := nullif(trim(r->>'quantity'), '')::int;
      v_low   := nullif(trim(r->>'low_stock'), '')::int;

      if v_sku is null then raise exception 'SKU is required'; end if;
      if lower(v_sku) = any(seen) then raise exception 'Duplicate SKU in this file'; end if;
      seen := seen || lower(v_sku);
      if v_price is not null and v_price < 0 then raise exception 'Price must be zero or more'; end if;
      if v_qty is not null and v_qty < 0 then raise exception 'Quantity must be zero or more'; end if;

      if v_cat is not null then
        select id into v_cat_id from public.product_categories
         where lower(category_name) = lower(v_cat) and is_delete = false limit 1;
        if v_cat_id is null then raise exception 'Unknown category "%"', v_cat; end if;
      end if;

      select id into v_pid from public.products
       where lower(sku) = lower(v_sku) and is_delete = false limit 1;

      if v_pid is null then
        if v_name is null then raise exception 'Name is required for a new product'; end if;
        if v_price is null then raise exception 'Price is required for a new product'; end if;

        insert into public.products
          (product_name, sku, description, price, slug, product_category_id, is_active, is_delete)
        values
          (v_name, v_sku, v_desc, v_price,
           trim(both '-' from regexp_replace(lower(v_name || '-' || v_sku), '[^a-z0-9]+', '-', 'g')),
           v_cat_id, false, false)
        returning id into v_pid;

        if exists (select 1 from public.inventory where product_id = v_pid) then
          update public.inventory
             set quantity = coalesce(v_qty, quantity),
                 low_stock_threshold = coalesce(v_low, low_stock_threshold)
           where product_id = v_pid;
        else
          insert into public.inventory (product_id, quantity, reserved_quantity, low_stock_threshold, is_active)
          values (v_pid, coalesce(v_qty, 0), 0, coalesce(v_low, 5), true);
        end if;
        v_action := 'create';
      else
        update public.products
           set product_name = coalesce(v_name, product_name),
               price = coalesce(v_price, price),
               description = coalesce(v_desc, description),
               product_category_id = coalesce(v_cat_id, product_category_id)
         where id = v_pid;
        if v_qty is not null then
          perform public.adjust_inventory(v_pid::int, v_qty, 'Product import');
          if to_regclass('public.inventory_adjustments') is not null then
            insert into public.inventory_adjustments (product_id, new_quantity, reason)
            values (v_pid, v_qty, 'Product import');
          end if;
        end if;
        if v_low is not null then
          update public.inventory set low_stock_threshold = v_low where product_id = v_pid;
        end if;
        v_action := 'update';
      end if;

      if not p_apply then raise exception 'cm_preview'; end if;
    exception when others then
      if sqlerrm <> 'cm_preview' then
        v_action := 'error';
        v_msg := sqlerrm;
      end if;
    end;

    if v_action = 'create' then n_create := n_create + 1;
    elsif v_action = 'update' then n_update := n_update + 1;
    else n_err := n_err + 1; end if;

    if not p_apply and v_action = 'create' then v_pid := null; end if;

    out := out || jsonb_build_object(
      'row', v_row, 'sku', v_sku, 'name', coalesce(v_name, ''),
      'action', v_action, 'message', v_msg, 'product_id', v_pid);
  end loop;

  if p_apply then
    insert into public.product_import_jobs (file_name, created_count, updated_count, error_count)
    values (p_file_name, n_create, n_update, n_err);
  end if;

  return out;
end;
$$;
grant execute on function public.admin_import_products(jsonb, boolean, text) to authenticated;
