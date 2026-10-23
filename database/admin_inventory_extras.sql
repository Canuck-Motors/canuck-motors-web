-- Stock history + low-stock level for the admin Inventory page. Run once in the Supabase SQL editor.

create table if not exists public.inventory_adjustments (
  id bigint generated always as identity primary key,
  product_id bigint not null,
  old_quantity int,
  new_quantity int not null,
  reason text,
  changed_by uuid default auth.uid(),
  changed_on timestamptz not null default now()
);
create index if not exists inventory_adjustments_product_idx
  on public.inventory_adjustments (product_id, changed_on desc);
alter table public.inventory_adjustments enable row level security;

-- Change stock and write a history row.
create or replace function public.admin_adjust_stock(
  p_product_id bigint, p_new_quantity int, p_reason text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare old_q int;
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  select quantity into old_q from public.inventory where product_id = p_product_id;
  perform public.adjust_inventory(p_product_id::int, p_new_quantity, p_reason);
  insert into public.inventory_adjustments (product_id, old_quantity, new_quantity, reason)
  values (p_product_id, old_q, p_new_quantity, p_reason);
end;
$$;
grant execute on function public.admin_adjust_stock(bigint, int, text) to authenticated;

-- Per-product "low stock" level.
create or replace function public.admin_set_low_stock(p_product_id bigint, p_threshold int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  if p_threshold is null or p_threshold < 0 then
    raise exception 'Low-stock level must be zero or more';
  end if;
  update public.inventory set low_stock_threshold = p_threshold where product_id = p_product_id;
end;
$$;
grant execute on function public.admin_set_low_stock(bigint, int) to authenticated;

-- History for one product (newest first) with the staff member's email.
create or replace function public.admin_stock_history(p_product_id bigint)
returns table (old_quantity int, new_quantity int, reason text, changed_on timestamptz, staff_email text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  return query
    select a.old_quantity, a.new_quantity, a.reason, a.changed_on, u.email::text
      from public.inventory_adjustments a
      left join auth.users u on u.id = a.changed_by
     where a.product_id = p_product_id
     order by a.changed_on desc
     limit 50;
end;
$$;
grant execute on function public.admin_stock_history(bigint) to authenticated;
