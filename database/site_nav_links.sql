-- Lets an admin show or hide links in the top menu (Auto Parts, Categories, Brands, Deals, About Us).
create table if not exists public.site_nav_links (
  key text primary key,
  visible boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.site_nav_links enable row level security;

drop policy if exists "Anyone can read menu settings" on public.site_nav_links;
create policy "Anyone can read menu settings"
  on public.site_nav_links for select
  using (true);

-- Writes happen only from the admin page (service key), so no insert/update policy is needed.
