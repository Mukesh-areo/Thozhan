-- Extra people for the browser tests (scripts/e2e.ts). Loaded after supabase/seed.sql with
-- `node supabase/dev/server.ts --fresh --seed scripts/e2e-seed.sql`. Never for a real database.
--
--   +91 90000 00021  driver for the real-trip test    +91 90000 00022  driver for the parcel test
--   +91 90000 00023  owes exactly ₹100 (blocked)      +91 90000 00024  owes ₹90 (not blocked)
--   +91 90000 00025  driver for the SOS test
insert into auth.users (id, phone) values
  ('00000000-0000-4000-a000-000000000021', '919000000021'),
  ('00000000-0000-4000-a000-000000000022', '919000000022'),
  ('00000000-0000-4000-a000-000000000023', '919000000023'),
  ('00000000-0000-4000-a000-000000000024', '919000000024'),
  ('00000000-0000-4000-a000-000000000025', '919000000025');

insert into profiles (id, phone, name, locale) values
  ('00000000-0000-4000-a000-000000000021', '919000000021', 'Ravi Trips', 'en'),
  ('00000000-0000-4000-a000-000000000022', '919000000022', 'Kumar Parcels', 'en'),
  ('00000000-0000-4000-a000-000000000023', '919000000023', 'Owes Hundred', 'en'),
  ('00000000-0000-4000-a000-000000000024', '919000000024', 'Owes Ninety', 'en'),
  ('00000000-0000-4000-a000-000000000025', '919000000025', 'Senthil Safety', 'en');

insert into drivers (id, status, vehicle_number, licence_number, documents, reviewed_at) values
  ('00000000-0000-4000-a000-000000000021', 'approved', 'TN 09 RT 2100', 'TN0920200000021', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000022', 'approved', 'TN 09 RT 2200', 'TN0920200000022', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000023', 'approved', 'TN 09 RT 2300', 'TN0920200000023', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000024', 'approved', 'TN 09 RT 2400', 'TN0920200000024', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000025', 'approved', 'TN 09 RT 2500', 'TN0920200000025', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now());

-- Ten unpaid ₹10 day fees for one driver, nine for the other.
insert into ledger (driver_id, day, kind, amount_paise, ref)
select '00000000-0000-4000-a000-000000000023'::uuid, ist_day() - g, 'fee', 1000, 'e2e-' || g from generate_series(1, 10) g;
insert into ledger (driver_id, day, kind, amount_paise, ref)
select '00000000-0000-4000-a000-000000000024'::uuid, ist_day() - g, 'fee', 1000, 'e2e-' || g from generate_series(1, 9) g;

-- The vehicle drivers in supabase/seed.sql read Tamil; the vehicle test reads English.
update profiles set locale = 'en' where id in (
  '00000000-0000-4000-a000-000000000013', '00000000-0000-4000-a000-000000000014', '00000000-0000-4000-a000-000000000015',
  '00000000-0000-4000-a000-000000000016', '00000000-0000-4000-a000-000000000017'
);

-- All seven papers with validity dates, as registration now requires.
update drivers set
  documents = '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo","pollution":"demo","fitness":"demo","photo":"demo"}',
  document_expiry = '{"licence":"2031-03-31","permit":"2030-12-31","insurance":"2030-12-31","pollution":"2030-12-31","fitness":"2030-12-31"}'
where documents ->> 'licence' = 'demo';
