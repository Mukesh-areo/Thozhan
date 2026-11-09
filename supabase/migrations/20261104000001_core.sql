-- Thozhan core schema for Supabase (Postgres 15+).
--
-- Access model: every table has row-level security on and no policies, so the anon and
-- authenticated roles cannot read or write tables directly. Apps call the SECURITY DEFINER
-- functions below, which check who is calling (auth.uid()) and what they may see.
-- Functions named *_internal are for edge functions using the service role only.
--
-- Errors are raised with a short code as the message (for example 'already_taken'); the
-- apps translate them with the i18n key `error.<code>`.

-- ---------------------------------------------------------------- tables

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  phone text not null,
  name text,
  locale text not null default 'ta' check (locale in ('ta', 'en')),
  staff_role text check (staff_role in ('admin', 'gov')),
  created_at timestamptz not null default now()
);

create table drivers (
  id uuid primary key references profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  vehicle text not null default 'auto' check (vehicle in ('auto', 'bike', 'cab-mini', 'cab-sedan', 'cab-suv')),
  vehicle_number text not null,
  licence_number text not null,
  -- Storage paths in the private `driver-documents` bucket: licence, rc, permit, insurance, photo.
  documents jsonb not null default '{}',
  review_note text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  online boolean not null default false,
  lat double precision,
  lon double precision,
  location_at timestamptz,
  created_at timestamptz not null default now()
);
create index drivers_available on drivers (vehicle, lat, lon) where online and status = 'approved';

create table service_flags (
  category text primary key,
  enabled boolean not null,
  updated_by uuid references profiles (id),
  updated_at timestamptz not null default now()
);
insert into service_flags (category, enabled) values
  ('auto', true), ('bike', false), ('cab-mini', false), ('cab-sedan', false), ('cab-suv', false),
  ('parcel-bike', false), ('parcel-auto', false);

-- Mirrors MACHINES in packages/shared/src/trip-machine.ts; a test keeps the two equal.
create table trip_transitions (
  flow text not null,
  action text not null,
  from_status text[] not null,
  to_status text not null,
  actors text[] not null,
  guards text[] not null default '{}',
  primary key (flow, action)
);
insert into trip_transitions (flow, action, from_status, to_status, actors, guards) values
  ('ride', 'accept', '{REQUESTED}', 'ACCEPTED', '{driver}', '{}'),
  ('ride', 'arrive', '{ACCEPTED}', 'ARRIVED', '{driver}', '{}'),
  ('ride', 'start', '{ARRIVED}', 'IN_PROGRESS', '{driver}', '{start-otp}'),
  ('ride', 'complete', '{IN_PROGRESS}', 'COMPLETED', '{driver,ops}', '{}'),
  ('ride', 'cancel', '{REQUESTED,ACCEPTED,ARRIVED}', 'CANCELLED', '{rider,driver,ops,system}', '{}'),
  ('meter', 'pause', '{METER_RUNNING}', 'METER_PAUSED', '{rider,driver}', '{}'),
  ('meter', 'resume', '{METER_PAUSED}', 'METER_RUNNING', '{rider,driver}', '{}'),
  ('meter', 'complete', '{METER_RUNNING,METER_PAUSED}', 'COMPLETED', '{rider,driver}', '{}'),
  ('meter', 'cancel', '{METER_RUNNING,METER_PAUSED}', 'CANCELLED', '{rider,driver}', '{}'),
  ('delivery', 'accept', '{REQUESTED}', 'ACCEPTED', '{driver}', '{}'),
  ('delivery', 'arrive', '{ACCEPTED}', 'AT_PICKUP', '{driver}', '{}'),
  ('delivery', 'pickup', '{AT_PICKUP}', 'PICKED_UP', '{driver}', '{start-otp}'),
  ('delivery', 'depart', '{PICKED_UP}', 'IN_TRANSIT', '{driver}', '{}'),
  ('delivery', 'reach-drop', '{IN_TRANSIT}', 'AT_DROP', '{driver}', '{}'),
  ('delivery', 'deliver', '{AT_DROP}', 'DELIVERED', '{driver}', '{drop-otp}'),
  ('delivery', 'return', '{PICKED_UP,IN_TRANSIT,AT_DROP}', 'RETURNED', '{driver,ops}', '{}'),
  ('delivery', 'cancel', '{REQUESTED,ACCEPTED,AT_PICKUP}', 'CANCELLED', '{rider,driver,ops,system}', '{}');

create table trips (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  flow text not null check (flow in ('ride', 'meter', 'delivery')),
  category text not null,
  status text not null,
  rider_id uuid references profiles (id),
  driver_id uuid references drivers (id),
  pickup jsonb, -- { name, lat, lon }
  dropoff jsonb,
  estimate_meters integer,
  quote jsonb, -- fare breakdown shown at booking (an estimate)
  start_otp text,
  drop_otp text,
  parcel jsonb, -- { receiverName, receiverPhone, weightGrams, item }
  vehicle_number text,
  terrain text not null default 'plain' check (terrain in ('plain', 'ghat')),
  distance_meters integer,
  waiting_seconds integer,
  fare jsonb, -- final breakdown, computed on the server by packages/tariff
  total_paise integer,
  fare_flags text[] not null default '{}',
  client_key text, -- idempotency key from the app
  dispatch_wave integer not null default 0,
  dispatched_at timestamptz,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  ended_at timestamptz,
  cancel_reason text,
  unique (rider_id, client_key)
);
create index trips_rider on trips (rider_id, created_at desc);
create index trips_driver on trips (driver_id, created_at desc);
create index trips_open on trips (status) where status not in ('COMPLETED', 'CANCELLED', 'DELIVERED', 'RETURNED');

create table offers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references trips (id) on delete cascade,
  driver_id uuid not null references drivers (id) on delete cascade,
  status text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'expired', 'lost')),
  pickup_meters integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique (trip_id, driver_id)
);
create index offers_live on offers (driver_id) where status = 'offered';

create table track_points (
  trip_id uuid not null references trips (id) on delete cascade,
  at timestamptz not null,
  lat double precision not null,
  lon double precision not null,
  accuracy real not null,
  primary key (trip_id, at)
);

create table incidents (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('sos', 'overcharge', 'complaint')),
  trip_id uuid references trips (id),
  reporter_id uuid not null references profiles (id),
  message text,
  asked_paise integer,
  lat double precision,
  lon double precision,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution text,
  resolved_by uuid references profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Driver fee ledger in paise: fees are positive (owed), payments negative.
create table ledger (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers (id),
  day date not null,
  kind text not null check (kind in ('fee', 'payment', 'waiver')),
  amount_paise integer not null,
  ref text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);
create unique index ledger_one_fee_per_day on ledger (driver_id, day) where kind = 'fee';
create unique index ledger_payment_ref on ledger (ref) where kind = 'payment';

create table payments (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references drivers (id),
  amount_paise integer not null check (amount_paise > 0),
  provider text not null default 'razorpay',
  link_id text,
  link_url text,
  status text not null default 'created' check (status in ('created', 'paid', 'expired', 'cancelled')),
  provider_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table share_links (
  token text primary key,
  trip_id uuid not null references trips (id) on delete cascade,
  created_by uuid not null references profiles (id),
  expires_at timestamptz not null
);

create table audit_log (
  id bigint generated always as identity primary key,
  actor uuid,
  action text not null,
  target text,
  detail jsonb,
  at timestamptz not null default now()
);

alter table profiles enable row level security;
alter table drivers enable row level security;
alter table service_flags enable row level security;
alter table trip_transitions enable row level security;
alter table trips enable row level security;
alter table offers enable row level security;
alter table track_points enable row level security;
alter table incidents enable row level security;
alter table ledger enable row level security;
alter table payments enable row level security;
alter table share_links enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------- helpers

create function app_error(code text) returns void language plpgsql as $$
begin
  raise exception '%', code using errcode = 'P0001';
end $$;

create function require_user() returns uuid language plpgsql stable as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then perform app_error('not_signed_in'); end if;
  if not exists (select 1 from profiles where id = uid) then perform app_error('no_profile'); end if;
  return uid;
end $$;

create function require_staff(roles text[]) returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  if not exists (select 1 from profiles where id = uid and staff_role = any (roles)) then perform app_error('forbidden'); end if;
  return uid;
end $$;

create function ist_day(at timestamptz default now()) returns date language sql stable as $$
  select ((at at time zone 'UTC') + interval '330 minutes')::date
$$;

create function distance_m(lat1 float8, lon1 float8, lat2 float8, lon2 float8) returns float8 language sql immutable as $$
  select 2 * 6371008.8 * asin(least(1, sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2))))
$$;

create function random_digits(n integer) returns text language sql volatile as $$
  select lpad(((('x' || substr(md5(gen_random_uuid()::text), 1, 8))::bit(32)::bigint) % (10 ^ n)::bigint)::text, n, '0')
$$;

create function is_open(status text) returns boolean language sql immutable as $$
  select status not in ('COMPLETED', 'CANCELLED', 'DELIVERED', 'RETURNED')
$$;

-- Which vehicle serves a category: parcels ride on autos or bikes.
create function vehicle_for(category text) returns text language sql immutable as $$
  select case category when 'parcel-auto' then 'auto' when 'parcel-bike' then 'bike' else category end
$$;

create function audit(actor uuid, action text, target text, detail jsonb default null) returns void language sql as $$
  insert into audit_log (actor, action, target, detail) values (actor, action, target, detail)
$$;

-- What a viewer may see of a trip. OTPs go only to the rider; drivers must ask for them.
create function trip_json(t trips, viewer text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', t.id, 'code', t.code, 'flow', t.flow, 'category', t.category, 'status', t.status,
    'pickup', t.pickup, 'dropoff', t.dropoff, 'estimateMeters', t.estimate_meters, 'quote', t.quote,
    'parcel', case when viewer = 'rider' or viewer = 'staff' then t.parcel
                   else t.parcel - 'receiverPhone' end,
    'startOtp', case when viewer = 'rider' then t.start_otp end,
    'dropOtp', case when viewer = 'rider' then t.drop_otp end,
    'vehicleNumber', t.vehicle_number, 'terrain', t.terrain,
    'distanceMeters', t.distance_meters, 'waitingSeconds', t.waiting_seconds,
    'fare', t.fare, 'totalPaise', t.total_paise, 'fareFlags', to_jsonb(t.fare_flags),
    'createdAt', t.created_at, 'acceptedAt', t.accepted_at, 'arrivedAt', t.arrived_at,
    'startedAt', t.started_at, 'endedAt', t.ended_at, 'cancelReason', t.cancel_reason,
    'rider', case when viewer in ('driver', 'staff') then
      (select jsonb_build_object('name', coalesce(p.name, ''), 'phone', case when viewer = 'staff' then p.phone end)
       from profiles p where p.id = t.rider_id) end,
    'driver', (select jsonb_build_object(
        'name', coalesce(p.name, ''), 'vehicleNumber', d.vehicle_number, 'vehicle', d.vehicle,
        'lat', d.lat, 'lon', d.lon, 'locationAt', d.location_at,
        'phone', case when viewer = 'staff' then p.phone end)
      from drivers d join profiles p on p.id = d.id where d.id = t.driver_id)
  )
$$;

-- ---------------------------------------------------------------- accounts

-- Called right after sign-in; creates the profile on first login.
create function sign_in_profile(p_locale text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  -- A token can outlive its account (deleted user, reset database): treat it as signed out.
  if uid is null or not exists (select 1 from auth.users where id = uid) then perform app_error('not_signed_in'); end if;
  insert into profiles (id, phone, locale)
  values (uid, coalesce(auth.jwt() ->> 'phone', ''), coalesce(p_locale, 'ta'))
  on conflict (id) do nothing;
  return me();
end $$;

create function me() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'phone', p.phone, 'name', p.name, 'locale', p.locale, 'staffRole', p.staff_role,
    'driver', (select jsonb_build_object(
        'status', d.status, 'vehicle', d.vehicle, 'vehicleNumber', d.vehicle_number,
        'licenceNumber', d.licence_number, 'documents', d.documents, 'reviewNote', d.review_note,
        'online', d.online)
      from drivers d where d.id = p.id))
  from profiles p where p.id = auth.uid()
$$;

create function update_profile(p_name text, p_locale text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
begin
  if p_locale is not null and p_locale not in ('ta', 'en') then perform app_error('bad_locale'); end if;
  update profiles set name = coalesce(nullif(trim(p_name), ''), name), locale = coalesce(p_locale, locale) where id = uid;
  return me();
end $$;

-- A driver applies, or re-applies after a rejection. Approval is manual in the admin dashboard.
create function register_driver(p_vehicle_number text, p_licence_number text, p_documents jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  plate text := upper(regexp_replace(coalesce(p_vehicle_number, ''), '\s+', ' ', 'g'));
begin
  if plate !~ '^TN ?[0-9]{1,2} ?[A-Z]{0,3} ?[0-9]{1,4}$' then perform app_error('bad_vehicle_number'); end if;
  if length(trim(coalesce(p_licence_number, ''))) < 6 then perform app_error('bad_licence_number'); end if;
  if not (coalesce(p_documents, '{}') ?& array['licence', 'rc', 'permit', 'insurance']) then perform app_error('documents_missing'); end if;
  if (select name from profiles where id = uid) is null then perform app_error('name_required'); end if;
  insert into drivers (id, vehicle_number, licence_number, documents)
  values (uid, plate, upper(trim(p_licence_number)), p_documents)
  on conflict (id) do update
    set vehicle_number = excluded.vehicle_number, licence_number = excluded.licence_number,
        documents = excluded.documents, status = 'pending', review_note = null
    where drivers.status in ('pending', 'rejected');
  if not found then perform app_error('already_approved'); end if;
  return me();
end $$;

-- ---------------------------------------------------------------- dispatch

-- Offers a requested trip to up to three nearby free drivers. A new wave goes out only when
-- the last one has no live offers left and 15 s have passed; the radius doubles each wave
-- (3, 6, 12, 24 km). After four waves with nobody accepting, the trip is cancelled.
create function dispatch(p_trip uuid) returns integer language plpgsql security definer set search_path = public as $$
declare
  t trips;
  made integer;
begin
  select * into t from trips where id = p_trip for update;
  if t.status <> 'REQUESTED' or t.driver_id is not null then return 0; end if;
  if exists (select 1 from offers where trip_id = p_trip and status = 'offered' and expires_at > now()) then return 0; end if;
  if t.dispatched_at is not null and t.dispatched_at > now() - interval '15 seconds' then return 0; end if;
  if t.dispatch_wave >= 4 then
    update trips set status = 'CANCELLED', cancel_reason = 'no_driver', ended_at = now() where id = p_trip;
    return 0;
  end if;
  insert into offers (trip_id, driver_id, pickup_meters, expires_at)
  select p_trip, c.id, c.meters, now() + interval '30 seconds'
  from (
    select d.id, round(distance_m(d.lat, d.lon, (t.pickup ->> 'lat')::float8, (t.pickup ->> 'lon')::float8))::integer as meters
    from drivers d
    where d.online and d.status = 'approved' and d.vehicle = vehicle_for(t.category)
      and d.location_at > now() - interval '2 minutes'
      and not exists (select 1 from trips x where x.driver_id = d.id and is_open(x.status))
      and not exists (select 1 from offers o where o.trip_id = p_trip and o.driver_id = d.id)
      and not exists (select 1 from offers o where o.driver_id = d.id and o.status = 'offered' and o.expires_at > now())
  ) c
  where c.meters <= 3000 * power(2, t.dispatch_wave)
  order by c.meters
  limit 3;
  get diagnostics made = row_count;
  update trips set dispatch_wave = dispatch_wave + 1, dispatched_at = now() where id = p_trip;
  return made;
end $$;

-- Housekeeping run on every poll: expire stale offers and send the next dispatch wave.
create function tick() returns void language plpgsql security definer set search_path = public as $$
declare
  r record;
begin
  update offers set status = 'expired' where status = 'offered' and expires_at <= now();
  for r in select id from trips where status = 'REQUESTED' and driver_id is null loop
    perform dispatch(r.id);
  end loop;
end $$;

-- ---------------------------------------------------------------- rider

create function service_flags() returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(category, enabled), '{}') from service_flags
$$;

create function request_trip(
  p_category text, p_pickup jsonb, p_dropoff jsonb, p_estimate_meters integer, p_quote jsonb,
  p_parcel jsonb default null, p_client_key text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  existing trips;
  t trips;
  v_flow text := case when p_category like 'parcel-%' then 'delivery' else 'ride' end;
  v_start text := random_digits(4);
  v_drop text;
begin
  if p_client_key is not null then
    select * into existing from trips where rider_id = uid and client_key = p_client_key;
    if found then return trip_json(existing, 'rider'); end if;
  end if;
  if not coalesce((select enabled from service_flags where category = p_category), false) then perform app_error('service_off'); end if;
  if exists (select 1 from trips where rider_id = uid and flow <> 'meter' and is_open(status)) then perform app_error('active_trip'); end if;
  if (p_pickup ->> 'lat') is null or (p_pickup ->> 'lon') is null or (p_dropoff ->> 'lat') is null or (p_dropoff ->> 'lon') is null then
    perform app_error('bad_location');
  end if;
  if p_estimate_meters is null or p_estimate_meters <= 0 or p_estimate_meters > 100000 then perform app_error('bad_location'); end if;
  if v_flow = 'delivery' then
    if coalesce(trim(p_parcel ->> 'receiverName'), '') = '' or coalesce(p_parcel ->> 'receiverPhone', '') !~ '^\+?[0-9 ]{10,14}$' then
      perform app_error('receiver_required');
    end if;
    if coalesce((p_parcel ->> 'weightGrams')::integer, 0) not between 1 and 50000 then perform app_error('bad_weight'); end if;
    loop
      v_drop := random_digits(4);
      exit when v_drop <> v_start;
    end loop;
  end if;
  insert into trips (code, flow, category, status, rider_id, pickup, dropoff, estimate_meters, quote, start_otp, drop_otp, parcel, client_key)
  values ('TZ-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), v_flow, p_category, 'REQUESTED', uid,
          p_pickup, p_dropoff, p_estimate_meters, p_quote, v_start, v_drop, p_parcel, p_client_key)
  returning * into t;
  perform dispatch(t.id);
  return trip_json(t, 'rider');
end $$;

-- The rider's open trip, or null. Also runs dispatch housekeeping.
create function rider_state() returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
begin
  perform tick();
  select * into t from trips where rider_id = uid and flow <> 'meter' and is_open(status) order by created_at desc limit 1;
  if not found then return jsonb_build_object('trip', null); end if;
  return jsonb_build_object('trip', trip_json(t, 'rider'));
end $$;

create function get_trip(p_trip uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
begin
  select * into t from trips where id = p_trip;
  if not found then perform app_error('not_found'); end if;
  if t.rider_id = uid then return trip_json(t, 'rider'); end if;
  if t.driver_id = uid then return trip_json(t, 'driver'); end if;
  if exists (select 1 from profiles where id = uid and staff_role = 'admin') then return trip_json(t, 'staff'); end if;
  perform app_error('not_found');
end $$;

create function my_trips(p_limit integer default 50) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(trip_json(t, case when t.driver_id = auth.uid() then 'driver' else 'rider' end) order by t.created_at desc), '[]')
  from (select * from trips where rider_id = auth.uid() or driver_id = auth.uid() order by created_at desc limit least(p_limit, 200)) t
$$;

-- ---------------------------------------------------------------- driver

create function driver_set_online(p_online boolean, p_lat float8 default null, p_lon float8 default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  d drivers;
begin
  select * into d from drivers where id = uid;
  if not found then perform app_error('not_a_driver'); end if;
  if p_online then
    if d.status <> 'approved' then perform app_error('not_approved'); end if;
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

-- Location heartbeat, every few seconds while online. Points are stored as the trip track
-- once the passenger is on board; the server bills from that track.
create function driver_ping(p_lat float8, p_lon float8, p_accuracy real default 10, p_at timestamptz default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  at timestamptz := least(coalesce(p_at, now()), now());
  trip uuid;
begin
  if p_lat not between -90 and 90 or p_lon not between -180 and 180 then perform app_error('bad_location'); end if;
  update drivers set lat = p_lat, lon = p_lon, location_at = now() where id = uid;
  if not found then perform app_error('not_a_driver'); end if;
  select id into trip from trips where driver_id = uid and status in ('IN_PROGRESS', 'PICKED_UP', 'IN_TRANSIT', 'AT_DROP') limit 1;
  if trip is not null then
    insert into track_points (trip_id, at, lat, lon, accuracy) values (trip, at, p_lat, p_lon, p_accuracy) on conflict do nothing;
  end if;
end $$;

create function driver_inbox() returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  t trips;
begin
  if not exists (select 1 from drivers where id = uid) then perform app_error('not_a_driver'); end if;
  perform tick();
  select * into t from trips where driver_id = uid and is_open(status) order by created_at desc limit 1;
  return jsonb_build_object(
    'trip', case when t.id is not null then trip_json(t, 'driver') end,
    'offers', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', o.id, 'expiresAt', o.expires_at, 'pickupMeters', o.pickup_meters,
        'trip', trip_json(x, 'driver')) order by o.created_at), '[]')
      from offers o join trips x on x.id = o.trip_id
      where o.driver_id = uid and o.status = 'offered' and o.expires_at > now()),
    'today', (select jsonb_build_object('trips', count(*), 'earningsPaise', coalesce(sum(total_paise), 0))
      from trips where driver_id = uid and status in ('COMPLETED', 'DELIVERED') and ist_day(ended_at) = ist_day()),
    'balancePaise', (select coalesce(sum(amount_paise), 0) from ledger where driver_id = uid));
end $$;

-- First accept wins. The trip row update is conditional, so a second driver racing for the
-- same trip finds it no longer REQUESTED and gets 'already_taken'.
create function accept_offer(p_offer uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  tid uuid;
  t trips;
begin
  if exists (select 1 from trips where driver_id = uid and is_open(status)) then perform app_error('finish_trip_first'); end if;
  update offers set status = 'accepted' where id = p_offer and driver_id = uid and status = 'offered' and expires_at > now()
  returning trip_id into tid;
  if tid is null then perform app_error('offer_gone'); end if;
  update trips set driver_id = uid, status = 'ACCEPTED', accepted_at = now(),
    vehicle_number = (select vehicle_number from drivers where id = uid)
  where id = tid and status = 'REQUESTED' and driver_id is null
  returning * into t;
  if t.id is null then perform app_error('already_taken'); end if;
  update offers set status = 'lost' where trip_id = tid and id <> p_offer and status = 'offered';
  return trip_json(t, 'driver');
end $$;

create function decline_offer(p_offer uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update offers set status = 'declined' where id = p_offer and driver_id = require_user() and status = 'offered';
end $$;

-- Applies one transition from trip_transitions. Ending a trip (complete, deliver, return)
-- needs the fare, so it goes through the finish-trip edge function instead.
create function apply_transition(p_trip uuid, p_action text, p_actor text, p_otp text, p_by uuid) returns trips
language plpgsql security definer set search_path = public as $$
declare
  t trips;
  tr trip_transitions;
begin
  select * into t from trips where id = p_trip for update;
  if not found then perform app_error('not_found'); end if;
  select * into tr from trip_transitions where flow = t.flow and action = p_action;
  if not found then perform app_error('invalid_action'); end if;
  if not (t.status = any (tr.from_status)) then perform app_error('wrong_state'); end if;
  if not (p_actor = any (tr.actors)) then perform app_error('not_allowed'); end if;
  if 'start-otp' = any (tr.guards) and coalesce(p_otp, '') <> t.start_otp then perform app_error('wrong_otp'); end if;
  if 'drop-otp' = any (tr.guards) and coalesce(p_otp, '') <> t.drop_otp then perform app_error('wrong_otp'); end if;
  update trips set status = tr.to_status,
    arrived_at = case when p_action = 'arrive' then now() else arrived_at end,
    started_at = case when p_action in ('start', 'pickup') then now() else started_at end,
    ended_at = case when not is_open(tr.to_status) then now() else ended_at end,
    cancel_reason = case when p_action = 'cancel' then p_actor else cancel_reason end
  where id = p_trip returning * into t;
  if p_actor = 'ops' then perform audit(p_by, 'trip.' || p_action, t.code); end if;
  return t;
end $$;

create function trip_action(p_trip uuid, p_action text, p_otp text default null) returns jsonb
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
  t := apply_transition(p_trip, p_action, actor, p_otp, uid);
  return trip_json(t, case actor when 'ops' then 'staff' else actor end);
end $$;

-- ---------------------------------------------------------------- safety

create function report_incident(p_kind text, p_trip uuid default null, p_message text default null,
  p_asked_paise integer default null, p_lat float8 default null, p_lon float8 default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  iid uuid;
begin
  if p_kind not in ('sos', 'overcharge', 'complaint') then perform app_error('invalid_action'); end if;
  if p_trip is not null and not exists (select 1 from trips where id = p_trip and (rider_id = uid or driver_id = uid)) then
    perform app_error('not_found');
  end if;
  if p_kind = 'overcharge' and (p_trip is null or coalesce(p_asked_paise, 0) <= coalesce((select total_paise from trips where id = p_trip), 0)) then
    perform app_error('not_overcharged');
  end if;
  insert into incidents (kind, trip_id, reporter_id, message, asked_paise, lat, lon)
  values (p_kind, p_trip, uid, left(p_message, 2000), p_asked_paise, p_lat, p_lon) returning id into iid;
  return jsonb_build_object('id', iid);
end $$;

create function create_share_link(p_trip uuid) returns text language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  tok text := replace(gen_random_uuid()::text, '-', '');
begin
  if not exists (select 1 from trips where id = p_trip and rider_id = uid and is_open(status)) then perform app_error('not_found'); end if;
  insert into share_links (token, trip_id, created_by, expires_at) values (tok, p_trip, uid, now() + interval '12 hours');
  return tok;
end $$;

-- Public view for a share link: no phone numbers, no OTPs.
create function shared_trip(p_token text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', t.code, 'status', t.status, 'category', t.category,
    'pickup', t.pickup ->> 'name', 'dropoff', t.dropoff ->> 'name', 'vehicleNumber', t.vehicle_number,
    'driver', (select jsonb_build_object('name', coalesce(p.name, ''), 'lat', d.lat, 'lon', d.lon, 'locationAt', d.location_at)
      from drivers d join profiles p on p.id = d.id where d.id = t.driver_id and is_open(t.status)))
  from share_links s join trips t on t.id = s.trip_id
  where s.token = p_token and s.expires_at > now()
$$;

-- ---------------------------------------------------------------- fee ledger

create function driver_ledger() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'balancePaise', coalesce((select sum(amount_paise) from ledger where driver_id = auth.uid()), 0),
    'entries', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'kind', kind, 'amountPaise', amount_paise, 'ref', ref) order by created_at desc)
      from (select * from ledger where driver_id = auth.uid() order by created_at desc limit 60) l), '[]'),
    'days', coalesce((select jsonb_agg(x order by x ->> 'day' desc) from (
      select jsonb_build_object('day', ist_day(ended_at), 'trips', count(*), 'earningsPaise', sum(total_paise)) x
      from trips where driver_id = auth.uid() and status in ('COMPLETED', 'DELIVERED') and ended_at > now() - interval '14 days'
      group by ist_day(ended_at)) d), '[]'))
$$;

-- ---------------------------------------------------------------- edge-function internals

create function trip_for_finish_internal(p_trip uuid, p_driver uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t trips;
begin
  select * into t from trips where id = p_trip;
  if not found or t.driver_id is distinct from p_driver then perform app_error('not_found'); end if;
  return jsonb_build_object('trip', to_jsonb(t) - 'start_otp' - 'drop_otp',
    'fixes', coalesce((select jsonb_agg(jsonb_build_object('lat', lat, 'lon', lon, 'accuracyMeters', accuracy,
        'timestamp', (extract(epoch from at) * 1000)::bigint) order by at) from track_points where trip_id = p_trip), '[]'));
end $$;

-- Ends a ride or delivery with the fare the edge function computed, and charges the driver's
-- ₹10 fee once per IST day on their first completed trip.
create function finish_trip_internal(p_trip uuid, p_driver uuid, p_action text, p_otp text,
  p_distance integer, p_waiting integer, p_fare jsonb, p_flags text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t trips;
begin
  if p_action not in ('complete', 'deliver', 'return') then perform app_error('invalid_action'); end if;
  if not exists (select 1 from trips where id = p_trip and driver_id = p_driver) then perform app_error('not_found'); end if;
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

-- A street-hail meter trip recorded on the rider's phone, with the fare recomputed on the
-- server from the uploaded GPS fixes. Idempotent on the app's client key.
create function record_meter_trip_internal(p_rider uuid, p_client_key text, p_vehicle_number text, p_terrain text,
  p_started_at timestamptz, p_ended_at timestamptz, p_distance integer, p_waiting integer, p_fare jsonb, p_flags text[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t trips;
begin
  select * into t from trips where rider_id = p_rider and client_key = p_client_key;
  if found then return trip_json(t, 'rider'); end if;
  insert into trips (code, flow, category, status, rider_id, vehicle_number, terrain, distance_meters, waiting_seconds,
    fare, total_paise, fare_flags, client_key, created_at, started_at, ended_at)
  values ('TM-' || upper(substr(md5(gen_random_uuid()::text), 1, 6)), 'meter', 'auto', 'COMPLETED', p_rider,
    upper(nullif(trim(p_vehicle_number), '')), coalesce(p_terrain, 'plain'), p_distance, p_waiting,
    p_fare, (p_fare ->> 'totalPaise')::integer, coalesce(p_flags, '{}'), p_client_key, p_started_at, p_started_at, p_ended_at)
  returning * into t;
  return trip_json(t, 'rider');
end $$;

create function fee_payment_create_internal(p_driver uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  owed integer := coalesce((select sum(amount_paise) from ledger where driver_id = p_driver), 0);
  pid uuid;
begin
  if owed <= 0 then perform app_error('nothing_due'); end if;
  insert into payments (driver_id, amount_paise) values (p_driver, owed) returning id into pid;
  return jsonb_build_object('id', pid, 'amountPaise', owed,
    'phone', (select phone from profiles where id = p_driver), 'name', (select name from profiles where id = p_driver));
end $$;

create function fee_payment_link_internal(p_payment uuid, p_link_id text, p_url text) returns void language sql security definer set search_path = public as $$
  update payments set link_id = p_link_id, link_url = p_url where id = p_payment
$$;

-- Webhook: marks a payment paid once and credits the ledger. Repeated webhooks are no-ops.
create function fee_payment_paid_internal(p_payment uuid, p_provider_payment_id text, p_amount integer) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  p payments;
begin
  update payments set status = 'paid', paid_at = now(), provider_payment_id = p_provider_payment_id
  where id = p_payment and status = 'created' returning * into p;
  if p.id is null then return jsonb_build_object('ok', true, 'duplicate', true); end if;
  if p_amount <> p.amount_paise then perform audit(null, 'payment.amount_mismatch', p.id::text, jsonb_build_object('paid', p_amount)); end if;
  insert into ledger (driver_id, day, kind, amount_paise, ref) values (p.driver_id, ist_day(), 'payment', -p_amount, p.id::text)
  on conflict (ref) where kind = 'payment' do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- admin and department

create function admin_overview() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin']);
  perform tick();
  return jsonb_build_object(
    'counts', jsonb_build_object(
      'driversPending', (select count(*) from drivers where status = 'pending'),
      'driversOnline', (select count(*) from drivers where online and status = 'approved'),
      'tripsOpen', (select count(*) from trips where is_open(status) and flow <> 'meter'),
      'incidentsOpen', (select count(*) from incidents where status = 'open'),
      'sosOpen', (select count(*) from incidents where status = 'open' and kind = 'sos'),
      'tripsToday', (select count(*) from trips where ist_day(created_at) = ist_day()),
      'completedToday', (select count(*) from trips where status in ('COMPLETED', 'DELIVERED') and ist_day(ended_at) = ist_day()),
      'feesOutstandingPaise', (select coalesce(sum(amount_paise), 0) from ledger)),
    'openTrips', (select coalesce(jsonb_agg(trip_json(t, 'staff') order by t.created_at desc), '[]')
      from trips t where is_open(t.status) and t.flow <> 'meter'),
    'drivers', (select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', p.name, 'vehicleNumber', d.vehicle_number,
        'lat', d.lat, 'lon', d.lon, 'locationAt', d.location_at,
        'busy', exists (select 1 from trips x where x.driver_id = d.id and is_open(x.status)))), '[]')
      from drivers d join profiles p on p.id = d.id where d.online and d.status = 'approved'));
end $$;

create function admin_drivers(p_status text default null) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin']);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'name', p.name, 'phone', p.phone, 'status', d.status, 'vehicle', d.vehicle,
      'vehicleNumber', d.vehicle_number, 'licenceNumber', d.licence_number, 'documents', d.documents,
      'reviewNote', d.review_note, 'online', d.online, 'createdAt', d.created_at,
      'trips', (select count(*) from trips t where t.driver_id = d.id and t.status in ('COMPLETED', 'DELIVERED')),
      'balancePaise', (select coalesce(sum(amount_paise), 0) from ledger l where l.driver_id = d.id))
    order by d.status = 'pending' desc, d.created_at desc), '[]')
    from drivers d join profiles p on p.id = d.id where p_status is null or d.status = p_status);
end $$;

create function admin_review_driver(p_driver uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin']);
begin
  if p_status not in ('approved', 'rejected', 'suspended') then perform app_error('invalid_action'); end if;
  if p_status <> 'approved' and coalesce(trim(p_note), '') = '' then perform app_error('note_required'); end if;
  update drivers set status = p_status, review_note = p_note, reviewed_by = uid, reviewed_at = now(),
    online = case when p_status = 'approved' then online else false end
  where id = p_driver;
  if not found then perform app_error('not_found'); end if;
  perform audit(uid, 'driver.' || p_status, p_driver::text, jsonb_build_object('note', p_note));
end $$;

create function admin_trips(p_limit integer default 200, p_flow text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin']);
  return (select coalesce(jsonb_agg(trip_json(t, 'staff') order by t.created_at desc), '[]')
    from (select * from trips where p_flow is null or flow = p_flow order by created_at desc limit least(p_limit, 1000)) t);
end $$;

create function admin_incidents(p_status text default 'open') returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin']);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'kind', i.kind, 'status', i.status, 'message', i.message, 'askedPaise', i.asked_paise,
      'lat', i.lat, 'lon', i.lon, 'createdAt', i.created_at, 'resolution', i.resolution,
      'reporter', jsonb_build_object('name', p.name, 'phone', p.phone),
      'trip', case when t.id is not null then trip_json(t, 'staff') end)
    order by i.kind = 'sos' desc, i.created_at desc), '[]')
    from incidents i join profiles p on p.id = i.reporter_id left join trips t on t.id = i.trip_id
    where p_status is null or i.status = p_status);
end $$;

create function admin_resolve_incident(p_incident uuid, p_resolution text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin']);
begin
  if coalesce(trim(p_resolution), '') = '' then perform app_error('note_required'); end if;
  update incidents set status = 'resolved', resolution = p_resolution, resolved_by = uid, resolved_at = now()
  where id = p_incident and status = 'open';
  if not found then perform app_error('not_found'); end if;
  perform audit(uid, 'incident.resolve', p_incident::text);
end $$;

create function admin_set_flag(p_category text, p_enabled boolean) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin']);
begin
  update service_flags set enabled = p_enabled, updated_by = uid, updated_at = now() where category = p_category;
  if not found then perform app_error('not_found'); end if;
  perform audit(uid, 'flag.set', p_category, jsonb_build_object('enabled', p_enabled));
  return service_flags();
end $$;

-- Cash or bank payments of the day fee received outside the app.
create function admin_record_payment(p_driver uuid, p_amount_paise integer, p_ref text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin']);
begin
  if p_amount_paise <= 0 or coalesce(trim(p_ref), '') = '' then perform app_error('invalid_action'); end if;
  insert into ledger (driver_id, day, kind, amount_paise, ref, created_by) values (p_driver, ist_day(), 'payment', -p_amount_paise, 'manual:' || p_ref, uid);
  perform audit(uid, 'ledger.payment', p_driver::text, jsonb_build_object('amount', p_amount_paise, 'ref', p_ref));
end $$;

-- Aggregates only, for admin and department viewers. No names, phones or trip ids.
create function compliance_report(p_days integer default 30) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 366));
begin
  perform require_staff(array['admin', 'gov']);
  return jsonb_build_object(
    'days', p_days,
    'byCategory', (select coalesce(jsonb_agg(jsonb_build_object('category', category, 'flow', flow, 'trips', n, 'completed', done,
        'cancelled', cancelled, 'noDriver', no_driver, 'avgFarePaise', avg_fare, 'avgMeters', avg_m)), '[]')
      from (select category, flow, count(*) n,
              count(*) filter (where status in ('COMPLETED', 'DELIVERED')) done,
              count(*) filter (where status = 'CANCELLED') cancelled,
              count(*) filter (where cancel_reason = 'no_driver') no_driver,
              round(avg(total_paise) filter (where total_paise is not null)) avg_fare,
              round(avg(distance_meters) filter (where distance_meters is not null)) avg_m
            from trips where created_at >= since group by category, flow) c),
    'overcharge', (select jsonb_build_object('reports', count(*),
        'avgAskedAbovePct', round(avg(100.0 * (i.asked_paise - t.total_paise) / nullif(t.total_paise, 0))))
      from incidents i join trips t on t.id = i.trip_id where i.kind = 'overcharge' and i.created_at >= since),
    'sos', (select count(*) from incidents where kind = 'sos' and created_at >= since),
    'complaints', (select count(*) from incidents where kind = 'complaint' and created_at >= since),
    'meterFlags', (select coalesce(jsonb_object_agg(flag, n), '{}') from (
        select unnest(fare_flags) flag, count(*) n from trips where flow = 'meter' and created_at >= since group by 1) f),
    'daily', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'trips', n, 'meterTrips', m) order by day), '[]')
      from (select ist_day(created_at) as day, count(*) as n, count(*) filter (where flow = 'meter') as m
            from trips where created_at >= since group by 1) d),
    'drivers', jsonb_build_object('approved', (select count(*) from drivers where status = 'approved'),
      'pending', (select count(*) from drivers where status = 'pending')));
end $$;

-- ---------------------------------------------------------------- grants

-- Supabase grants EXECUTE on new functions to anon and authenticated by default; take it
-- back and grant only the client API. Later migrations must do the same for new functions.
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  sign_in_profile(text), me(), update_profile(text, text), register_driver(text, text, jsonb),
  request_trip(text, jsonb, jsonb, integer, jsonb, jsonb, text), rider_state(), get_trip(uuid), my_trips(integer),
  driver_set_online(boolean, float8, float8), driver_ping(float8, float8, real, timestamptz), driver_inbox(),
  accept_offer(uuid), decline_offer(uuid), trip_action(uuid, text, text),
  report_incident(text, uuid, text, integer, float8, float8), create_share_link(uuid), driver_ledger(),
  admin_overview(), admin_drivers(text), admin_review_driver(uuid, text, text), admin_trips(integer, text),
  admin_incidents(text), admin_resolve_incident(uuid, text), admin_set_flag(text, boolean),
  admin_record_payment(uuid, integer, text), compliance_report(integer)
to authenticated;
grant execute on function service_flags(), shared_trip(text) to anon, authenticated;

grant execute on function
  trip_for_finish_internal(uuid, uuid),
  finish_trip_internal(uuid, uuid, text, text, integer, integer, jsonb, text[]),
  record_meter_trip_internal(uuid, text, text, text, timestamptz, timestamptz, integer, integer, jsonb, text[]),
  fee_payment_create_internal(uuid), fee_payment_link_internal(uuid, text, text),
  fee_payment_paid_internal(uuid, text, integer)
to service_role;
