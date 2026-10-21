-- Axel chat history for signed-in customers, so the chat follows them across
-- visits and devices. Run once in the Supabase SQL editor. Safe to run twice.
create table if not exists public.chat_history (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  context jsonb,
  updated_at timestamptz not null default now()
);

alter table public.chat_history enable row level security;

-- Each customer can only see and change their own chat
drop policy if exists "Own chat read" on public.chat_history;
create policy "Own chat read" on public.chat_history
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Own chat insert" on public.chat_history;
create policy "Own chat insert" on public.chat_history
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Own chat update" on public.chat_history;
create policy "Own chat update" on public.chat_history
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own chat delete" on public.chat_history;
create policy "Own chat delete" on public.chat_history
  for delete to authenticated using (auth.uid() = user_id);
