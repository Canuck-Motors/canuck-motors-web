-- Customer photos for return requests. Run once in the Supabase SQL editor.
insert into storage.buckets (id, name, public)
values ('return-photos', 'return-photos', false)
on conflict (id) do nothing;

-- A signed-in customer can upload into their own folder: <their user id>/<order id>/file
drop policy if exists "Customers upload return photos" on storage.objects;
create policy "Customers upload return photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'return-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
