-- supabase-only: the storage schema exists only on Supabase. The local dev server applies the
-- same rule through can_read_driver_documents() (supabase/dev/server.ts).
--
-- Reviewers may read driver documents as well as admins. The check goes through a SECURITY
-- DEFINER function because this policy runs as the signed-in user, who cannot read profiles.
drop policy "driver documents: read own or admin" on storage.objects;

create policy "driver documents: read own or staff" on storage.objects for select to authenticated
  using (bucket_id = 'driver-documents' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.can_read_driver_documents()));
