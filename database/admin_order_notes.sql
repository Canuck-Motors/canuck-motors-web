-- Private staff note on each order. Run once in the Supabase SQL editor.
alter table public.orders add column if not exists admin_note text;

create or replace function public.admin_set_order_note(p_order_id text, p_note text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_staff_role() is null then
    raise exception 'Not authorized';
  end if;
  update public.orders
     set admin_note = nullif(trim(coalesce(p_note, '')), '')
   where id::text = p_order_id;
end;
$$;

grant execute on function public.admin_set_order_note(text, text) to authenticated;
