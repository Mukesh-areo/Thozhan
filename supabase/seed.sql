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

-- One demo driver for every other vehicle, and every service on, so each can be tried locally.
-- A real project leaves these services off until an admin switches them on under Services.
insert into auth.users (id, phone) values
  ('00000000-0000-4000-a000-000000000013', '919000000013'),
  ('00000000-0000-4000-a000-000000000014', '919000000014'),
  ('00000000-0000-4000-a000-000000000015', '919000000015'),
  ('00000000-0000-4000-a000-000000000016', '919000000016'),
  ('00000000-0000-4000-a000-000000000017', '919000000017')
on conflict do nothing;

insert into profiles (id, phone, name, locale, staff_role) values
  ('00000000-0000-4000-a000-000000000013', '919000000013', 'Karthik B', 'ta', null),
  ('00000000-0000-4000-a000-000000000014', '919000000014', 'Revathi S', 'ta', null),
  ('00000000-0000-4000-a000-000000000015', '919000000015', 'Anand M', 'ta', null),
  ('00000000-0000-4000-a000-000000000016', '919000000016', 'Joseph P', 'ta', null),
  ('00000000-0000-4000-a000-000000000017', '919000000017', 'Farook A', 'ta', null)
on conflict do nothing;

insert into drivers (id, status, vehicle, vehicle_number, licence_number, documents, reviewed_at) values
  ('00000000-0000-4000-a000-000000000013', 'approved', 'bike', 'TN 09 BK 3301', 'TN0920200011111', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000014', 'approved', 'scooter', 'TN 10 SC 7742', 'TN1020210022222', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000015', 'approved', 'cab-mini', 'TN 22 CM 5120', 'TN2220170033333', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000016', 'approved', 'cab-sedan', 'TN 01 CS 8008', 'TN0120160044444', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now()),
  ('00000000-0000-4000-a000-000000000017', 'approved', 'cab-suv', 'TN 04 SV 6161', 'TN0420150055555', '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo"}', now())
on conflict do nothing;

update service_flags set enabled = true;

-- Every demo driver has all the papers their vehicle needs, with validity dates (UX handoff §14).
-- Murugan's pollution certificate runs out in 20 days, so the renewal reminder can be seen.
update drivers set
  documents = '{"licence":"demo","rc":"demo","permit":"demo","insurance":"demo","pollution":"demo","fitness":"demo","photo":"demo"}',
  document_expiry = jsonb_build_object('licence', '2031-03-31', 'permit', '2027-12-31', 'insurance', '2027-06-30',
    'pollution', case when id = '00000000-0000-4000-a000-000000000011' then (current_date + 20)::text else '2027-03-31' end,
    'fitness', '2028-01-31')
where documents ->> 'licence' = 'demo';
