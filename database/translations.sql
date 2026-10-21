-- French translations of product text, blog posts and chatbot replies.
-- Filled automatically by /api/translate the first time a French visitor sees a text.
-- To fix a translation: edit "translated" here (Table Editor > translations).
create table if not exists public.translations (
  hash text not null,
  lang text not null default 'fr',
  source text not null,
  translated text not null,
  created_at timestamptz not null default now(),
  primary key (hash, lang)
);
alter table public.translations enable row level security;
-- No policies: only the server (secret key) reads and writes it.
