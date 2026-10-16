-- Stock photos (Unsplash / Pexels) for AI blog posts. Run once in the Supabase SQL editor.
alter table public.blog_posts add column if not exists photos jsonb not null default '[]'::jsonb;
