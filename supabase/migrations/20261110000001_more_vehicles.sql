-- Adds the scooter as a ride and parcel vehicle, and lets a driver say which vehicle they drive.
-- New services start switched off; an admin turns each one on from the Services page.

alter table drivers drop constraint drivers_vehicle_check;
alter table drivers add constraint drivers_vehicle_check
  check (vehicle in ('auto', 'bike', 'scooter', 'cab-mini', 'cab-sedan', 'cab-suv'));

insert into service_flags (category, enabled) values ('scooter', false), ('parcel-scooter', false);

create or replace function vehicle_for(category text) returns text language sql immutable as $$
  select case category when 'parcel-auto' then 'auto' when 'parcel-bike' then 'bike' when 'parcel-scooter' then 'scooter' else category end
$$;

drop function register_driver(text, text, jsonb);

create function register_driver(p_vehicle_number text, p_licence_number text, p_documents jsonb, p_vehicle text default 'auto') returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  plate text := upper(regexp_replace(coalesce(p_vehicle_number, ''), '\s+', ' ', 'g'));
begin
  if p_vehicle is null or p_vehicle not in ('auto', 'bike', 'scooter', 'cab-mini', 'cab-sedan', 'cab-suv') then perform app_error('bad_vehicle'); end if;
  if plate !~ '^TN ?[0-9]{1,2} ?[A-Z]{0,3} ?[0-9]{1,4}$' then perform app_error('bad_vehicle_number'); end if;
  if length(trim(coalesce(p_licence_number, ''))) < 6 then perform app_error('bad_licence_number'); end if;
  if not (coalesce(p_documents, '{}') ?& array['licence', 'rc', 'permit', 'insurance']) then perform app_error('documents_missing'); end if;
  if (select name from profiles where id = uid) is null then perform app_error('name_required'); end if;
  insert into drivers (id, vehicle, vehicle_number, licence_number, documents)
  values (uid, p_vehicle, plate, upper(trim(p_licence_number)), p_documents)
  on conflict (id) do update
    set vehicle = excluded.vehicle, vehicle_number = excluded.vehicle_number, licence_number = excluded.licence_number,
        documents = excluded.documents, status = 'pending', review_note = null
    where drivers.status in ('pending', 'rejected');
  if not found then perform app_error('already_approved'); end if;
  return me();
end $$;

revoke execute on function register_driver(text, text, jsonb, text) from public, anon;
grant execute on function register_driver(text, text, jsonb, text) to authenticated;
