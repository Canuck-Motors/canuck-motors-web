-- Brand/model pairs that have at least one visible product. Run once in the Supabase SQL editor.
create or replace function public.models_with_parts()
returns table (manufacturer_id bigint, model_id bigint)
language sql
stable
security definer
set search_path = public
as $$
  select distinct vf.manufacturer_id::bigint, vf.model_id::bigint
  from public.product_fitments pf
  join public.vehicle_fitments vf on vf.id = pf.vehicle_fitment_id
  join public.products p on p.id = pf.product_id
  where p.is_active = true and p.is_delete = false
$$;

grant execute on function public.models_with_parts() to anon, authenticated;
