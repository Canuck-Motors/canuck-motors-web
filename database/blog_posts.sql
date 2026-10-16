-- AI blog: posts created from /admin/blog. Run once in the Supabase SQL editor.
create table if not exists public.blog_posts (
  id bigint generated always as identity primary key,
  slug text not null unique,
  title text not null,
  heading text not null,
  description text not null,
  excerpt text not null,
  cover text not null default '/about/manufacturer-hero.jpg',
  body_html text not null,
  faq jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  topic text,
  mode text,
  generated_by text not null default 'admin',
  status text not null default 'draft' check (status in ('draft', 'published', 'unpublished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

alter table public.blog_posts enable row level security;

-- Visitors can only read published posts. Writes go through the server (service key).
drop policy if exists "Public can read published blog posts" on public.blog_posts;
create policy "Public can read published blog posts"
  on public.blog_posts for select
  to anon, authenticated
  using (status = 'published');
