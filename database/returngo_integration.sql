-- ReturnGO integration settings and per-return sync fields.
-- Safe to run more than once.

alter table public.fulfillment_settings
  add column if not exists returngo_enabled boolean not null default false;

alter table public.return_requests
  add column if not exists returngo_rma_id text,
  add column if not exists returngo_status text,
  add column if not exists returngo_label_url text,
  add column if not exists returngo_error text,
  add column if not exists returngo_synced_on timestamptz;
