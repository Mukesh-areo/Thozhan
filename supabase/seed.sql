-- Demo data for local development (`supabase db reset` locally, or the dev server).
-- Never run this on the pilot database.
--
-- Sign in with any of these numbers; the dev server accepts OTP 123456.
--   +91 90000 00001  admin          +91 90000 00002  department viewer
--   +91 90000 00003  support        +91 90000 00004  driver reviewer
--   +91 90000 00011  demo driver 1  +91 90000 00012  demo driver 2  (approved autos)
insert into auth.users (id, phone) values
  ('00000000-0000-4000-a000-000000000001', '919000000001'),
  ('00000000-0000-4000-a000-000000000002', '919000000002'),
  ('00000000-0000-4000-a000-000000000003', '919000000003'),
  ('00000000-0000-4000-a000-000000000004', '919000000004'),
  ('00000000-0000-4000-a000-000000000011', '919000000011'),
  ('00000000-0000-4000-a000-000000000012', '919000000012')
on conflict do nothing;

insert into profiles (id, phone, name, locale, staff_role) values
  ('00000000-0000-4000-a000-000000000001', '919000000001', 'Ops Admin', 'en', 'admin'),
  ('00000000-0000-4000-a000-000000000002', '919000000002', 'Transport Department', 'en', 'gov'),
  ('00000000-0000-4000-a000-000000000003', '919000000003', 'Support Desk', 'en', 'support'),
  ('00000000-0000-4000-a000-000000000004', '919000000004', 'Driver Reviewer', 'en', 'reviewer'),
  ('00000000-0000-4000-a000-000000000011', '919000000011', 'Murugan K', 'ta', null),
  ('00000000-0000-4000-a000-000000000012', '919000000012', 'Selvi R', 'ta', null)
on conflict do nothing;

insert into drivers (id, status, vehicle_number, licence_number, documents, reviewed_at) values
  ('00000000-0000-4000-a000-000000000011', 'approved', 'TN 09 AB 4821', 'TN0920190012345', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000012', 'approved', 'TN 07 CK 1290', 'TN0720180054321', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now())
on conflict do nothing;

-- Parcel by auto is part of the MVP; switch it on for demos.
update service_flags set enabled = true where category = 'parcel-auto';
