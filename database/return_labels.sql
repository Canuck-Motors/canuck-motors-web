-- Saves the return label details with each return, so the customer and admin always get the same label.
-- Run once in the Supabase SQL editor. Labels still work without it (they are built from live order data).
alter table public.return_requests
  add column if not exists label_data jsonb,
  add column if not exists label_created_on timestamptz;
