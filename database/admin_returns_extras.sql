-- Returns: activity timeline + restock tracking. Run once in the Supabase SQL editor.

create table if not exists public.return_activity (
  id bigint generated always as identity primary key,
  request_id text not null,
  action text not null,
  detail text,
  created_by uuid default auth.uid(),
  created_on timestamptz not null default now()
);
create index if not exists return_activity_request_idx on public.return_activity (request_id, created_on desc);
alter table public.return_activity enable row level security;

create table if not exists public.return_restocks (
  request_id text primary key,
  restocked boolean not null,
  created_by uuid default auth.uid(),
  created_on timestamptz not null default now()
);
alter table public.return_restocks enable row level security;

create or replace function public.admin_log_return_activity(p_request_id text, p_action text, p_detail text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_staff_role() is null then raise exception 'Not authorized'; end if;
  insert into public.return_activity (request_id, action, detail) values (p_request_id, p_action, p_detail);
end; $$;
grant execute on function public.admin_log_return_activity(text, text, text) to authenticated;

create or replace function public.admin_return_activity()
returns table (request_id text, action text, detail text, created_on timestamptz, staff_email text)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_user_staff_role() is null then raise exception 'Not authorized'; end if;
  return query
    select a.request_id, a.action, a.detail, a.created_on, u.email::text
      from public.return_activity a left join auth.users u on u.id = a.created_by
     order by a.created_on desc limit 3000;
end; $$;
grant execute on function public.admin_return_activity() to authenticated;

create or replace function public.admin_mark_return_restocked(p_request_id text, p_restocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_user_staff_role() is null then raise exception 'Not authorized'; end if;
  insert into public.return_restocks (request_id, restocked) values (p_request_id, p_restocked);
exception when unique_violation then
  raise exception 'Stock for this return was already handled';
end; $$;
grant execute on function public.admin_mark_return_restocked(text, boolean) to authenticated;

create or replace function public.admin_return_restocks()
returns table (request_id text, restocked boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_user_staff_role() is null then raise exception 'Not authorized'; end if;
  return query select r.request_id, r.restocked from public.return_restocks r;
end; $$;
grant execute on function public.admin_return_restocks() to authenticated;
