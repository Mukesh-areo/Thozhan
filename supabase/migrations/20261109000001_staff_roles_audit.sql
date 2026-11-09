-- Finer staff roles, the audit-log reader and staff role assignment.
--
--   admin     everything; the only role that sees the audit log, changes services,
--             records payments or assigns roles
--   support   trips and incidents; can resolve incidents
--   reviewer  driver review only, including the driver documents
--   gov       aggregates only (compliance_report)

alter table profiles drop constraint profiles_staff_role_check;
alter table profiles add constraint profiles_staff_role_check check (staff_role in ('admin', 'gov', 'support', 'reviewer'));

create index audit_log_at on audit_log (at desc, id desc);

-- ---------------------------------------------------------------- existing functions, new roles

-- `create or replace` keeps each function's grants from the core migration.

-- Reviewers see the drivers they review, but not what the drivers owe.
create or replace function admin_drivers(p_status text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin', 'reviewer']);
  can_see_fees boolean := exists (select 1 from profiles where id = uid and staff_role = 'admin');
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'name', p.name, 'phone', p.phone, 'status', d.status, 'vehicle', d.vehicle,
      'vehicleNumber', d.vehicle_number, 'licenceNumber', d.licence_number, 'documents', d.documents,
      'reviewNote', d.review_note, 'online', d.online, 'createdAt', d.created_at,
      'trips', (select count(*) from trips t where t.driver_id = d.id and t.status in ('COMPLETED', 'DELIVERED')),
      'balancePaise', case when can_see_fees then (select coalesce(sum(amount_paise), 0) from ledger l where l.driver_id = d.id) end)
    order by d.status = 'pending' desc, d.created_at desc), '[]')
    from drivers d join profiles p on p.id = d.id where p_status is null or d.status = p_status);
end $$;

create or replace function admin_review_driver(p_driver uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin', 'reviewer']);
begin
  if p_status not in ('approved', 'rejected', 'suspended') then perform app_error('invalid_action'); end if;
  if p_status <> 'approved' and coalesce(trim(p_note), '') = '' then perform app_error('note_required'); end if;
  update drivers set status = p_status, review_note = p_note, reviewed_by = uid, reviewed_at = now(),
    online = case when p_status = 'approved' then online else false end
  where id = p_driver;
  if not found then perform app_error('not_found'); end if;
  perform audit(uid, 'driver.' || p_status, p_driver::text, jsonb_build_object('note', p_note));
end $$;

create or replace function admin_trips(p_limit integer default 200, p_flow text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin', 'support']);
  return (select coalesce(jsonb_agg(trip_json(t, 'staff') order by t.created_at desc), '[]')
    from (select * from trips where p_flow is null or flow = p_flow order by created_at desc limit least(p_limit, 1000)) t);
end $$;

create or replace function admin_incidents(p_status text default 'open') returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin', 'support']);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'kind', i.kind, 'status', i.status, 'message', i.message, 'askedPaise', i.asked_paise,
      'lat', i.lat, 'lon', i.lon, 'createdAt', i.created_at, 'resolution', i.resolution,
      'reporter', jsonb_build_object('name', p.name, 'phone', p.phone),
      'trip', case when t.id is not null then trip_json(t, 'staff') end)
    order by i.kind = 'sos' desc, i.created_at desc), '[]')
    from incidents i join profiles p on p.id = i.reporter_id left join trips t on t.id = i.trip_id
    where p_status is null or i.status = p_status);
end $$;

create or replace function admin_resolve_incident(p_incident uuid, p_resolution text) returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin', 'support']);
begin
  if coalesce(trim(p_resolution), '') = '' then perform app_error('note_required'); end if;
  update incidents set status = 'resolved', resolution = p_resolution, resolved_by = uid, resolved_at = now()
  where id = p_incident and status = 'open';
  if not found then perform app_error('not_found'); end if;
  perform audit(uid, 'incident.resolve', p_incident::text, jsonb_build_object('resolution', p_resolution));
end $$;

-- ---------------------------------------------------------------- audit log

-- Newest first. Dates are IST days, inclusive, to match what the dashboard displays.
create function admin_audit_log(p_action text default null, p_from date default null, p_to date default null, p_limit integer default 500) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  lim integer := least(greatest(coalesce(p_limit, 500), 1), 10000);
begin
  perform require_staff(array['admin']);
  return jsonb_build_object(
    'actions', (select coalesce(jsonb_agg(a.action order by a.action), '[]') from (select distinct action from audit_log) a),
    'total', (select count(*) from audit_log l
      where (p_action is null or l.action = p_action)
        and (p_from is null or ist_day(l.at) >= p_from)
        and (p_to is null or ist_day(l.at) <= p_to)),
    'entries', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', l.id, 'at', l.at, 'action', l.action, 'target', l.target, 'detail', l.detail,
        'actor', case when l.actor is not null then jsonb_build_object('id', l.actor, 'name', who.name, 'phone', who.phone) end,
        'targetName', case
          when l.action like 'driver.%' or l.action like 'ledger.%' or l.action like 'staff.%' then
            (select coalesce(nullif(p.name, ''), p.phone) from profiles p where p.id::text = l.target)
          when l.action like 'incident.%' then
            (select coalesce(nullif(p.name, ''), p.phone) from incidents i join profiles p on p.id = i.reporter_id where i.id::text = l.target)
        end)
      order by l.at desc, l.id desc), '[]')
      from (select * from audit_log x
        where (p_action is null or x.action = p_action)
          and (p_from is null or ist_day(x.at) >= p_from)
          and (p_to is null or ist_day(x.at) <= p_to)
        order by x.at desc, x.id desc limit lim) l
      left join profiles who on who.id = l.actor));
end $$;

-- ---------------------------------------------------------------- staff roles

create function admin_staff() returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_staff(array['admin']);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'role', p.staff_role, 'self', p.id = uid)
    order by p.staff_role, p.name, p.phone), '[]')
    from profiles p where p.staff_role is not null);
end $$;

-- Looks a person up by phone before they are given a role. Accepts 10 digits or a full number.
create function admin_find_person(p_phone text) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  found_person jsonb;
begin
  perform require_staff(array['admin']);
  if length(digits) = 10 then digits := '91' || digits; end if;
  select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'role', p.staff_role) into found_person
  from profiles p where p.phone = digits order by p.created_at limit 1;
  if found_person is null then perform app_error('not_found'); end if;
  return found_person;
end $$;

-- p_role null removes staff access. An admin cannot remove their own admin role, and the lock
-- stops two admins from demoting each other at the same moment and leaving no admin at all.
create function admin_set_staff_role(p_user uuid, p_role text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
  old_role text;
begin
  perform pg_advisory_xact_lock(hashtext('thozhan.staff_roles'));
  uid := require_staff(array['admin']);
  if p_role is not null and p_role not in ('admin', 'gov', 'support', 'reviewer') then perform app_error('invalid_action'); end if;
  if p_user = uid and p_role is distinct from 'admin' then perform app_error('cannot_remove_own_admin'); end if;
  select staff_role into old_role from profiles where id = p_user for update;
  if not found then perform app_error('not_found'); end if;
  if old_role is distinct from p_role then
    update profiles set staff_role = p_role where id = p_user;
    perform audit(uid, 'staff.role', p_user::text, jsonb_build_object('from', old_role, 'to', p_role));
  end if;
  return admin_staff();
end $$;

-- ---------------------------------------------------------------- driver documents

-- The storage policy runs as the signed-in user, who cannot read profiles, so the check has
-- to be a SECURITY DEFINER function. It says only whether the caller may read every folder.
create function can_read_driver_documents() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and staff_role in ('admin', 'reviewer'))
$$;

-- ---------------------------------------------------------------- grants

revoke execute on function
  admin_audit_log(text, date, date, integer), admin_staff(), admin_find_person(text),
  admin_set_staff_role(uuid, text), can_read_driver_documents()
from public, anon, authenticated;

grant execute on function
  admin_audit_log(text, date, date, integer), admin_staff(), admin_find_person(text),
  admin_set_staff_role(uuid, text), can_read_driver_documents()
to authenticated;
