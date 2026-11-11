-- Backend for the UX handoff (docs/UX_HANDOFF_IMPLEMENTATION.md):
--   * one account type per mobile number (passenger or driver), chosen at first sign-in
--   * booking options: pickup note, bike safety checks, cab preferences, parcel details
--   * two-way ratings, payment confirmation, "passenger not found" cancellation
--   * parcel pickup and delivery photos
--   * trusted contacts, support tickets, data download and account deletion requests
--   * document expiry dates that keep a driver offline, and a performance summary

-- ---------------------------------------------------------------- account type

alter table profiles add column account_type text check (account_type in ('passenger', 'driver'));

-- Anyone who already applied to drive is a driver; anyone else with a name is a passenger.
update profiles p set account_type = case when exists (select 1 from drivers d where d.id = p.id) then 'driver' else 'passenger' end
where p.name is not null and p.staff_role is null;

-- A driver row always means a driver account (seed data and admin tools insert drivers directly).
create function drivers_mark_account() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update profiles set account_type = 'driver' where id = new.id and account_type is distinct from 'driver';
  return new;
end $$;
create trigger drivers_mark_account after insert on drivers for each row execute function drivers_mark_account();

-- Chosen once on the sign-in screen. Changing it later is a support request, not an app switch.
create function set_account_type(p_type text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  current_type text;
begin
  if p_type not in ('passenger', 'driver') then perform app_error('bad_account_type'); end if;
  select account_type into current_type from profiles where id = uid;
  if current_type is null then
    update profiles set account_type = p_type where id = uid;
  elsif current_type <> p_type then
    perform app_error('account_type_locked');
  end if;
  return me();
end $$;

-- Support can move a number between account types once nothing is open on it.
create function admin_set_account_type(p_user uuid, p_type text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  staff uuid := require_staff(array['admin', 'support']);
begin
  if p_type not in ('passenger', 'driver') then perform app_error('bad_account_type'); end if;
  if exists (select 1 from trips where (rider_id = p_user or driver_id = p_user) and is_open(status)) then perform app_error('active_trip'); end if;
  if p_type = 'passenger' then update drivers set online = false, status = 'suspended', review_note = 'account_type_changed' where id = p_user; end if;
  update profiles set account_type = p_type where id = p_user;
  perform audit(staff, 'profile.account_type', p_user::text, jsonb_build_object('type', p_type));
  return jsonb_build_object('id', p_user, 'accountType', p_type);
end $$;

-- ---------------------------------------------------------------- trips: options, payment, proof

alter table trips add column options jsonb not null default '{}';
alter table trips add column paid_via text check (paid_via in ('cash', 'upi'));
alter table trips add column paid_at timestamptz;
alter table trips add column proof jsonb not null default '{}'; -- { pickupPhoto, deliveryPhoto } storage paths
alter table trips add column cancel_detail text;

create table ratings (
  trip_id uuid not null references trips (id) on delete cascade,
  by_role text not null check (by_role in ('rider', 'driver')),
  rater_id uuid not null references profiles (id),
  ratee_id uuid not null references profiles (id),
  stars smallint not null check (stars between 1 and 5),
  tags text[] not null default '{}',
  comment text,
  created_at timestamptz not null default now(),
  primary key (trip_id, by_role)
);
create index ratings_ratee on ratings (ratee_id);
alter table ratings enable row level security;

create function rating_summary(p_person uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select case when count(*) = 0 then null
    else jsonb_build_object('average', round(avg(stars)::numeric, 2), 'count', count(*)) end
  from ratings where ratee_id = p_person
$$;

-- What a viewer may see of a trip. OTPs go only to the rider; drivers must ask for them.
-- Phone numbers are never shown to the other party (masked calling is not built yet).
create or replace function trip_json(t trips, viewer text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', t.id, 'code', t.code, 'flow', t.flow, 'category', t.category, 'status', t.status,
    'pickup', t.pickup, 'dropoff', t.dropoff, 'estimateMeters', t.estimate_meters, 'quote', t.quote,
    'parcel', case when viewer = 'rider' or viewer = 'staff' then t.parcel
                   else t.parcel - 'receiverPhone' end,
    'options', t.options,
    'startOtp', case when viewer = 'rider' then t.start_otp end,
    'dropOtp', case when viewer = 'rider' then t.drop_otp end,
    'vehicleNumber', t.vehicle_number, 'terrain', t.terrain,
    'distanceMeters', t.distance_meters, 'waitingSeconds', t.waiting_seconds,
    'fare', t.fare, 'totalPaise', t.total_paise, 'fareFlags', to_jsonb(t.fare_flags),
    'paidVia', t.paid_via, 'paidAt', t.paid_at,
    'proof', jsonb_build_object('pickupPhoto', (t.proof ->> 'pickupPhoto') is not null, 'deliveryPhoto', (t.proof ->> 'deliveryPhoto') is not null),
    'createdAt', t.created_at, 'acceptedAt', t.accepted_at, 'arrivedAt', t.arrived_at,
    'startedAt', t.started_at, 'endedAt', t.ended_at, 'cancelReason', t.cancel_reason, 'cancelDetail', t.cancel_detail,
    'myRating', (select jsonb_build_object('stars', r.stars, 'tags', to_jsonb(r.tags)) from ratings r
                 where r.trip_id = t.id and r.by_role = case viewer when 'driver' then 'driver' else 'rider' end),
    'rider', case when viewer in ('driver', 'staff') then
      (select jsonb_build_object('name', coalesce(p.name, ''), 'phone', case when viewer = 'staff' then p.phone end,
                                 'rating', rating_summary(p.id))
       from profiles p where p.id = t.rider_id) end,
    'driver', (select jsonb_build_object(
        'name', coalesce(p.name, ''), 'vehicleNumber', d.vehicle_number, 'vehicle', d.vehicle,
        'lat', d.lat, 'lon', d.lon, 'locationAt', d.location_at, 'rating', rating_summary(d.id),
        'phone', case when viewer = 'staff' then p.phone end)
      from drivers d join profiles p on p.id = d.id where d.id = t.driver_id)
  )
$$;

-- Item categories a parcel may carry; anything else is refused.
create function parcel_item_ok(item text) returns boolean language sql immutable as $$
  select item in ('documents', 'clothes', 'food', 'electronics', 'household', 'other')
$$;

-- Heaviest parcel each vehicle may carry, in grams (UX handoff §7: 5 kg on two wheels).
create function parcel_max_grams(category text) returns integer language sql immutable as $$
  select case category when 'parcel-auto' then 50000 when 'parcel-bike' then 5000 when 'parcel-scooter' then 5000 else 0 end
$$;

drop function request_trip(text, jsonb, jsonb, integer, jsonb, jsonb, text);

create function request_trip(
  p_category text, p_pickup jsonb, p_dropoff jsonb, p_estimate_meters integer, p_quote jsonb,
  p_parcel jsonb default null, p_client_key text default null, p_options jsonb default '{}'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  existing trips;
  t trips;
  v_flow text := case when p_category like 'parcel-%' then 'delivery' else 'ride' end;
  v_start text := random_digits(4);
  v_drop text;
  v_options jsonb := coalesce(p_options, '{}');
begin
  if p_client_key is not null then
    select * into existing from trips where rider_id = uid and client_key = p_client_key;
    if found then return trip_json(existing, 'rider'); end if;
  end if;
  if exists (select 1 from drivers where id = uid) or (select account_type from profiles where id = uid) = 'driver' then
    perform app_error('driver_account');
  end if;
  if not coalesce((select enabled from service_flags where category = p_category), false) then perform app_error('service_off'); end if;
  if exists (select 1 from trips where rider_id = uid and flow <> 'meter' and is_open(status)) then perform app_error('active_trip'); end if;
  if (p_pickup ->> 'lat') is null or (p_pickup ->> 'lon') is null or (p_dropoff ->> 'lat') is null or (p_dropoff ->> 'lon') is null then
    perform app_error('bad_location');
  end if;
  if p_estimate_meters is null or p_estimate_meters <= 0 or p_estimate_meters > 100000 then perform app_error('bad_location'); end if;
  if length(coalesce(v_options ->> 'pickupNote', '')) > 140 then perform app_error('note_too_long'); end if;
  -- Two-wheeler rides: the passenger confirms the bike safety checks before booking.
  if p_category in ('bike', 'scooter') and not (
    coalesce((v_options #>> '{safety,onePassenger}')::boolean, false) and coalesce((v_options #>> '{safety,helmet}')::boolean, false)
    and coalesce((v_options #>> '{safety,noLuggage}')::boolean, false) and coalesce((v_options #>> '{safety,conditions}')::boolean, false)
  ) then
    perform app_error('safety_checks_required');
  end if;
  if v_flow = 'delivery' then
    if coalesce(trim(p_parcel ->> 'receiverName'), '') = '' or coalesce(p_parcel ->> 'receiverPhone', '') !~ '^\+?[0-9 ]{10,14}$' then
      perform app_error('receiver_required');
    end if;
    if coalesce((p_parcel ->> 'weightGrams')::integer, 0) not between 1 and 50000 then perform app_error('bad_weight'); end if;
    if (p_parcel ->> 'weightGrams')::integer > parcel_max_grams(p_category) then perform app_error('too_heavy_for_vehicle'); end if;
    if (p_parcel ->> 'category') is not null and not parcel_item_ok(p_parcel ->> 'category') then perform app_error('bad_item'); end if;
    if not coalesce((p_parcel ->> 'prohibitedAck')::boolean, false) then perform app_error('prohibited_ack_required'); end if;
    loop
      v_drop := random_digits(4);
      exit when v_drop <> v_start;
    end loop;
  end if;
  insert into trips (code, flow, category, status, rider_id, pickup, dropoff, estimate_meters, quote, start_otp, drop_otp, parcel, client_key, options)
  values ('TZ-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), v_flow, p_category, 'REQUESTED', uid,
          p_pickup, p_dropoff, p_estimate_meters, p_quote, v_start, v_drop, p_parcel, p_client_key, v_options)
  returning * into t;
  perform dispatch(t.id);
  return trip_json(t, 'rider');
end $$;

-- Cancelling with a reason. A driver may cancel as "passenger not found" only after waiting
-- five minutes at the pickup.
create function cancel_trip(p_trip uuid, p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
  actor text;
begin
  select * into t from trips where id = p_trip;
  if not found then perform app_error('not_found'); end if;
  actor := case when t.driver_id = uid then 'driver' when t.rider_id = uid then 'rider' end;
  if actor is null then perform app_error('not_found'); end if;
  if p_reason is not null and p_reason not in ('no_show', 'changed_plans', 'driver_late', 'wrong_pickup', 'vehicle_issue', 'safety', 'other') then
    perform app_error('bad_reason');
  end if;
  if p_reason = 'no_show' and (actor <> 'driver' or t.status not in ('ARRIVED', 'AT_PICKUP')
      or t.arrived_at > now() - interval '5 minutes') then
    perform app_error('wait_for_passenger');
  end if;
  t := apply_transition(p_trip, 'cancel', actor, null, uid);
  update trips set cancel_detail = p_reason where id = p_trip returning * into t;
  return trip_json(t, actor);
end $$;

create function rate_trip(p_trip uuid, p_stars integer, p_tags text[] default '{}', p_comment text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
  role text;
  ratee uuid;
begin
  select * into t from trips where id = p_trip;
  if not found then perform app_error('not_found'); end if;
  if t.rider_id = uid then role := 'rider'; ratee := t.driver_id;
  elsif t.driver_id = uid then role := 'driver'; ratee := t.rider_id;
  else perform app_error('not_found'); end if;
  if t.status not in ('COMPLETED', 'DELIVERED') or ratee is null then perform app_error('wrong_state'); end if;
  if p_stars is null or p_stars not between 1 and 5 then perform app_error('bad_rating'); end if;
  insert into ratings (trip_id, by_role, rater_id, ratee_id, stars, tags, comment)
  values (p_trip, role, uid, ratee, p_stars, coalesce(p_tags[1:6], '{}'), left(nullif(trim(p_comment), ''), 500))
  on conflict (trip_id, by_role) do update set stars = excluded.stars, tags = excluded.tags, comment = excluded.comment;
  return trip_json(t, role);
end $$;

-- The driver confirms how the passenger paid (cash or direct UPI). Thozhan holds no fares.
create function confirm_payment(p_trip uuid, p_method text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
begin
  if p_method not in ('cash', 'upi') then perform app_error('bad_payment_method'); end if;
  update trips set paid_via = p_method, paid_at = now()
  where id = p_trip and driver_id = uid and status in ('COMPLETED', 'DELIVERED')
  returning * into t;
  if not found then perform app_error('not_found'); end if;
  return trip_json(t, 'driver');
end $$;

-- Parcel proof photos, stored by the driver under <driver id>/parcel/ in the private bucket.
create function set_parcel_proof(p_trip uuid, p_stage text, p_path text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
begin
  if p_stage not in ('pickup', 'delivery') then perform app_error('invalid_action'); end if;
  if coalesce(p_path, '') !~ ('^' || uid::text || '/parcel/[A-Za-z0-9._-]+$') then perform app_error('bad_path'); end if;
  update trips set proof = proof || jsonb_build_object(case p_stage when 'pickup' then 'pickupPhoto' else 'deliveryPhoto' end, p_path)
  where id = p_trip and driver_id = uid and flow = 'delivery'
    and status = any (case p_stage when 'pickup' then array['AT_PICKUP'] else array['AT_DROP'] end)
  returning * into t;
  if not found then perform app_error('wrong_state'); end if;
  return trip_json(t, 'driver');
end $$;

-- Picking up a parcel needs the sealed-package photo first.
create or replace function trip_action(p_trip uuid, p_action text, p_otp text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
  actor text;
begin
  if p_action in ('complete', 'deliver', 'return', 'accept') then perform app_error('invalid_action'); end if;
  select * into t from trips where id = p_trip;
  if not found then perform app_error('not_found'); end if;
  actor := case
    when t.driver_id = uid then 'driver'
    when t.rider_id = uid then 'rider'
    when exists (select 1 from profiles where id = uid and staff_role = 'admin') then 'ops'
  end;
  if actor is null then perform app_error('not_found'); end if;
  if p_action = 'pickup' and actor = 'driver' and (t.proof ->> 'pickupPhoto') is null then perform app_error('photo_required'); end if;
  t := apply_transition(p_trip, p_action, actor, p_otp, uid);
  return trip_json(t, case actor when 'ops' then 'staff' else actor end);
end $$;

-- Delivering needs the delivery photo as well as the receiver's OTP.
create or replace function finish_trip_internal(p_trip uuid, p_driver uuid, p_action text, p_otp text,
  p_distance integer, p_waiting integer, p_fare jsonb, p_flags text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t trips;
begin
  if p_action not in ('complete', 'deliver', 'return') then perform app_error('invalid_action'); end if;
  select * into t from trips where id = p_trip and driver_id = p_driver;
  if not found then perform app_error('not_found'); end if;
  if p_action = 'deliver' and (t.proof ->> 'deliveryPhoto') is null then perform app_error('photo_required'); end if;
  t := apply_transition(p_trip, p_action, 'driver', p_otp, p_driver);
  update trips set distance_meters = p_distance, waiting_seconds = p_waiting, fare = p_fare,
    total_paise = (p_fare ->> 'totalPaise')::integer, fare_flags = coalesce(p_flags, '{}')
  where id = p_trip returning * into t;
  if t.status in ('COMPLETED', 'DELIVERED') then
    insert into ledger (driver_id, day, kind, amount_paise, ref)
    values (p_driver, ist_day(t.ended_at), 'fee', 1000, t.code)
    on conflict (driver_id, day) where kind = 'fee' do nothing;
  end if;
  return trip_json(t, 'driver');
end $$;

-- ---------------------------------------------------------------- driver documents

alter table drivers add column document_expiry jsonb not null default '{}'; -- { licence: 'YYYY-MM-DD', ... }

-- Documents a driver must keep valid, by vehicle (UX handoff §20). Fitness certificates apply
-- to transport vehicles (autos and cabs) only.
create function required_documents(vehicle text) returns text[] language sql immutable as $$
  select case when vehicle in ('bike', 'scooter')
    then array['licence', 'rc', 'permit', 'insurance', 'pollution', 'photo']
    else array['licence', 'rc', 'permit', 'insurance', 'fitness', 'pollution', 'photo'] end
$$;

-- Documents that carry an expiry date the driver must enter.
create function expiring_documents(vehicle text) returns text[] language sql immutable as $$
  select array_remove(array_remove(required_documents(vehicle), 'rc'), 'photo')
$$;

create function expired_documents(d drivers) returns text[] language sql stable as $$
  select coalesce(array_agg(k order by k), '{}') from jsonb_each_text(d.document_expiry) e(k, v)
  where v ~ '^\d{4}-\d{2}-\d{2}$' and v::date < ist_day()
$$;

drop function register_driver(text, text, jsonb, text);

create function register_driver(p_vehicle_number text, p_licence_number text, p_documents jsonb, p_vehicle text default 'auto',
  p_expiry jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  plate text := upper(regexp_replace(coalesce(p_vehicle_number, ''), '\s+', ' ', 'g'));
  doc text;
begin
  if (select account_type from profiles where id = uid) = 'passenger' then perform app_error('passenger_account'); end if;
  if p_vehicle is null or p_vehicle not in ('auto', 'bike', 'scooter', 'cab-mini', 'cab-sedan', 'cab-suv') then perform app_error('bad_vehicle'); end if;
  if plate !~ '^TN ?[0-9]{1,2} ?[A-Z]{0,3} ?[0-9]{1,4}$' then perform app_error('bad_vehicle_number'); end if;
  if length(trim(coalesce(p_licence_number, ''))) < 6 then perform app_error('bad_licence_number'); end if;
  if not (coalesce(p_documents, '{}') ?& required_documents(p_vehicle)) then perform app_error('documents_missing'); end if;
  foreach doc in array expiring_documents(p_vehicle) loop
    if coalesce(p_expiry ->> doc, '') !~ '^\d{4}-\d{2}-\d{2}$' then perform app_error('expiry_required'); end if;
    if (p_expiry ->> doc)::date < ist_day() then perform app_error('document_expired'); end if;
  end loop;
  if (select name from profiles where id = uid) is null then perform app_error('name_required'); end if;
  insert into drivers (id, vehicle, vehicle_number, licence_number, documents, document_expiry)
  values (uid, p_vehicle, plate, upper(trim(p_licence_number)), p_documents, coalesce(p_expiry, '{}'))
  on conflict (id) do update
    set vehicle = excluded.vehicle, vehicle_number = excluded.vehicle_number, licence_number = excluded.licence_number,
        documents = excluded.documents, document_expiry = excluded.document_expiry, status = 'pending', review_note = null
    where drivers.status in ('pending', 'rejected');
  if not found then perform app_error('already_approved'); end if;
  update profiles set account_type = 'driver' where id = uid;
  return me();
end $$;

-- An approved driver replaces one document (for example a renewed permit) without losing
-- approval; operations sees the change in the audit log.
create function renew_document(p_doc text, p_path text, p_expiry date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  d drivers;
begin
  select * into d from drivers where id = uid;
  if not found then perform app_error('not_a_driver'); end if;
  if not (p_doc = any (required_documents(d.vehicle))) then perform app_error('bad_document'); end if;
  if coalesce(p_path, '') !~ ('^' || uid::text || '/') then perform app_error('bad_path'); end if;
  if p_doc = any (expiring_documents(d.vehicle)) and (p_expiry is null or p_expiry < ist_day()) then perform app_error('expiry_required'); end if;
  update drivers set documents = documents || jsonb_build_object(p_doc, p_path),
    document_expiry = case when p_expiry is null then document_expiry else document_expiry || jsonb_build_object(p_doc, p_expiry::text) end
  where id = uid;
  perform audit(uid, 'driver.document_renewed', uid::text, jsonb_build_object('doc', p_doc, 'expiry', p_expiry));
  return me();
end $$;

create or replace function driver_set_online(p_online boolean, p_lat float8 default null, p_lon float8 default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  d drivers;
begin
  select * into d from drivers where id = uid;
  if not found then perform app_error('not_a_driver'); end if;
  if p_online then
    if d.status <> 'approved' then perform app_error('not_approved'); end if;
    -- A mandatory document past its expiry date keeps the driver offline (UX handoff §20).
    if cardinality(expired_documents(d)) > 0 then perform app_error('document_expired'); end if;
    -- Ten unpaid days block going online; the driver can pay by UPI from the app.
    if coalesce((select sum(amount_paise) from ledger where driver_id = uid), 0) >= 10000 then perform app_error('fees_due'); end if;
  elsif exists (select 1 from trips where driver_id = uid and is_open(status)) then
    perform app_error('finish_trip_first');
  end if;
  update drivers set online = p_online,
    lat = coalesce(p_lat, lat), lon = coalesce(p_lon, lon),
    location_at = case when p_lat is not null then now() else location_at end
  where id = uid;
  if not p_online then update offers set status = 'declined' where driver_id = uid and status = 'offered'; end if;
  return me();
end $$;

create or replace function me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'phone', p.phone, 'name', p.name, 'locale', p.locale, 'staffRole', p.staff_role,
    'accountType', coalesce(p.account_type, case when exists (select 1 from drivers where id = p.id) then 'driver' end),
    'rating', rating_summary(p.id),
    'driver', (select jsonb_build_object(
        'status', d.status, 'vehicle', d.vehicle, 'vehicleNumber', d.vehicle_number,
        'licenceNumber', d.licence_number, 'documents', d.documents, 'reviewNote', d.review_note,
        'reviewedAt', d.reviewed_at, 'createdAt', d.created_at,
        'documentExpiry', d.document_expiry, 'expiredDocuments', to_jsonb(expired_documents(d)),
        'requiredDocuments', to_jsonb(required_documents(d.vehicle)),
        'online', d.online)
      from drivers d where d.id = p.id))
  from profiles p where p.id = auth.uid()
$$;

-- Ratings, acceptance and cancellations over the last 30 days (UX handoff §21).
create function driver_performance() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'rating', rating_summary(auth.uid()),
    'offers', (select count(*) from offers where driver_id = auth.uid() and created_at > now() - interval '30 days'),
    'accepted', (select count(*) from offers where driver_id = auth.uid() and status = 'accepted' and created_at > now() - interval '30 days'),
    'completed', (select count(*) from trips where driver_id = auth.uid() and status in ('COMPLETED', 'DELIVERED') and created_at > now() - interval '30 days'),
    'cancelledByDriver', (select count(*) from trips where driver_id = auth.uid() and status = 'CANCELLED' and cancel_reason = 'driver' and created_at > now() - interval '30 days'),
    'compliments', coalesce((select jsonb_object_agg(tag, n) from (
        select unnest(tags) tag, count(*) n from ratings where ratee_id = auth.uid() group by 1) x), '{}'))
$$;

-- ---------------------------------------------------------------- trusted contacts

create table trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, phone)
);
alter table trusted_contacts enable row level security;

create function my_contacts() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'phone', phone) order by created_at), '[]')
  from trusted_contacts where owner_id = auth.uid()
$$;

create function add_contact(p_name text, p_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if coalesce(trim(p_name), '') = '' then perform app_error('name_required'); end if;
  if digits ~ '^91[0-9]{10}$' then digits := substr(digits, 3); end if;
  if digits !~ '^[6-9][0-9]{9}$' then perform app_error('bad_phone'); end if;
  if (select count(*) from trusted_contacts where owner_id = uid) >= 5 then perform app_error('too_many_contacts'); end if;
  insert into trusted_contacts (owner_id, name, phone) values (uid, left(trim(p_name), 60), digits)
  on conflict (owner_id, phone) do update set name = excluded.name;
  return my_contacts();
end $$;

create function remove_contact(p_id uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  delete from trusted_contacts where id = p_id and owner_id = require_user();
  return my_contacts();
end $$;

-- ---------------------------------------------------------------- support tickets

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  reporter_id uuid not null references profiles (id),
  category text not null check (category in (
    'fare', 'safety', 'driver_behaviour', 'passenger_behaviour', 'lost_item', 'parcel_damage', 'parcel_missing',
    'payment', 'documents', 'account_review', 'account_type', 'insurance', 'app_problem', 'account_deletion', 'other')),
  trip_id uuid references trips (id),
  body text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  reply text,
  replied_by uuid references profiles (id),
  replied_at timestamptz,
  created_at timestamptz not null default now()
);
create index support_tickets_reporter on support_tickets (reporter_id, created_at desc);
create index support_tickets_open on support_tickets (created_at) where status = 'open';
alter table support_tickets enable row level security;

create function ticket_json(s support_tickets) returns jsonb language sql stable as $$
  select jsonb_build_object('id', s.id, 'code', s.code, 'category', s.category, 'status', s.status, 'body', s.body,
    'reply', s.reply, 'repliedAt', s.replied_at, 'createdAt', s.created_at,
    'trip', (select jsonb_build_object('id', t.id, 'code', t.code) from trips t where t.id = s.trip_id))
$$;

create function create_ticket(p_category text, p_body text, p_trip uuid default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  s support_tickets;
begin
  if length(trim(coalesce(p_body, ''))) < 10 then perform app_error('describe_more'); end if;
  if p_trip is not null and not exists (select 1 from trips where id = p_trip and (rider_id = uid or driver_id = uid)) then
    perform app_error('not_found');
  end if;
  -- One open deletion request at a time.
  if p_category = 'account_deletion' and exists (select 1 from support_tickets where reporter_id = uid and category = 'account_deletion' and status <> 'closed') then
    perform app_error('already_requested');
  end if;
  insert into support_tickets (code, reporter_id, category, trip_id, body)
  values ('TZ-S-' || upper(substr(md5(gen_random_uuid()::text), 1, 5)), uid, p_category, p_trip, left(trim(p_body), 2000))
  returning * into s;
  return ticket_json(s);
end $$;

create function my_tickets() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(ticket_json(s) order by s.created_at desc), '[]')
  from (select * from support_tickets where reporter_id = auth.uid() order by created_at desc limit 50) s
$$;

-- Deleting an account starts a request: operations checks open trips, complaints and records
-- that must be kept by law before the account is removed (UX handoff §12).
create function request_account_deletion(p_reason text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  if exists (select 1 from trips where (rider_id = uid or driver_id = uid) and is_open(status)) then perform app_error('active_trip'); end if;
  return create_ticket('account_deletion', coalesce(nullif(trim(p_reason), ''), 'Please delete my Thozhan account.'), null);
end $$;

-- Everything Thozhan keeps about the caller, for "Download my data".
create function export_my_data() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exportedAt', now(), 'profile', me(),
    'trips', my_trips(200),
    'contacts', my_contacts(),
    'tickets', my_tickets(),
    'ratingsGiven', coalesce((select jsonb_agg(jsonb_build_object('trip', trip_id, 'stars', stars, 'tags', tags, 'comment', comment))
      from ratings where rater_id = auth.uid()), '[]'))
$$;

create function admin_tickets(p_status text default 'open') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin', 'support']);
  return coalesce((select jsonb_agg(ticket_json(s) || jsonb_build_object(
      'reporter', (select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'accountType', p.account_type)
                   from profiles p where p.id = s.reporter_id)) order by s.created_at)
    from support_tickets s where p_status is null or s.status = p_status), '[]');
end $$;

create function admin_reply_ticket(p_ticket uuid, p_reply text, p_close boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  staff uuid := require_staff(array['admin', 'support']);
  s support_tickets;
begin
  if length(trim(coalesce(p_reply, ''))) < 2 then perform app_error('describe_more'); end if;
  update support_tickets set reply = left(trim(p_reply), 2000), replied_by = staff, replied_at = now(),
    status = case when p_close then 'closed' else 'answered' end
  where id = p_ticket returning * into s;
  if not found then perform app_error('not_found'); end if;
  perform audit(staff, 'ticket.reply', s.code);
  return ticket_json(s);
end $$;

-- Reviewers see every paper the vehicle needs and its validity date.
create or replace function admin_drivers(p_status text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin', 'reviewer']);
  can_see_fees boolean := exists (select 1 from profiles where id = uid and staff_role = 'admin');
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'name', p.name, 'phone', p.phone, 'status', d.status, 'vehicle', d.vehicle,
      'vehicleNumber', d.vehicle_number, 'licenceNumber', d.licence_number, 'documents', d.documents,
      'documentExpiry', d.document_expiry, 'requiredDocuments', to_jsonb(required_documents(d.vehicle)),
      'expiredDocuments', to_jsonb(expired_documents(d)),
      'reviewNote', d.review_note, 'online', d.online, 'createdAt', d.created_at,
      'trips', (select count(*) from trips t where t.driver_id = d.id and t.status in ('COMPLETED', 'DELIVERED')),
      'balancePaise', case when can_see_fees then (select coalesce(sum(amount_paise), 0) from ledger l where l.driver_id = d.id) end)
    order by d.status = 'pending' desc, d.created_at desc), '[]')
    from drivers d join profiles p on p.id = d.id where p_status is null or d.status = p_status);
end $$;

-- ---------------------------------------------------------------- grants

revoke execute on all functions in schema public from public, anon;
grant execute on function
  set_account_type(text), request_trip(text, jsonb, jsonb, integer, jsonb, jsonb, text, jsonb),
  cancel_trip(uuid, text), rate_trip(uuid, integer, text[], text), confirm_payment(uuid, text),
  set_parcel_proof(uuid, text, text), trip_action(uuid, text, text),
  register_driver(text, text, jsonb, text, jsonb), renew_document(text, text, date),
  driver_set_online(boolean, float8, float8), me(), driver_performance(),
  my_contacts(), add_contact(text, text), remove_contact(uuid),
  create_ticket(text, text, uuid), my_tickets(), request_account_deletion(text), export_my_data(),
  admin_tickets(text), admin_reply_ticket(uuid, text, boolean), admin_set_account_type(uuid, text)
to authenticated;
grant execute on function service_flags(), shared_trip(text) to anon, authenticated;
revoke execute on function finish_trip_internal(uuid, uuid, text, text, integer, integer, jsonb, text[]) from authenticated;
grant execute on function finish_trip_internal(uuid, uuid, text, text, integer, integer, jsonb, text[]) to service_role;
