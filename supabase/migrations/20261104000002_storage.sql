-- supabase-only: the storage schema exists only on Supabase. The local dev server applies the
-- same rules in code (supabase/dev/server.ts).
--
-- Driver documents live in a private bucket under `<user id>/`. Drivers may write and read
-- their own folder; admins may read every folder.
insert into storage.buckets (id, name, public) values ('driver-documents', 'driver-documents', false)
on conflict (id) do nothing;

create policy "driver documents: write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "driver documents: replace own" on storage.objects for update to authenticated
  using (bucket_id = 'driver-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "driver documents: read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'driver-documents' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from public.profiles where id = auth.uid() and staff_role = 'admin')));
