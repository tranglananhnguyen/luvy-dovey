-- Run after creating the private "memories" bucket in Storage.
-- The app server delivers authorised photos. Browser roles never access this bucket directly.
begin;
drop policy if exists "Memories require the app server" on storage.objects;
create policy "Memories require the app server" on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'memories')
  with check (bucket_id <> 'memories');
commit;
