-- Amazon redirect mode: product pages send customers to Amazon instead of our cart.
alter table public.fulfillment_settings
  add column if not exists amazon_redirect_enabled boolean not null default false;
