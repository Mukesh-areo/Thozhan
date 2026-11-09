-- Crash and error reports from the mobile app and admin dashboard, so failures on drivers'
-- phones are visible without a third-party monitoring account.
--
-- Same model as the core schema: the table is closed and clients reach it only through
-- SECURITY DEFINER functions. Reports are scrubbed here as well as on the device, because the
-- server cannot trust an old or modified client not to send an OTP, a phone number, exact GPS
-- or an auth token.

create table client_errors (
  id bigint generated always as identity primary key,
  user_id uuid references profiles (id) on delete set null,
  app text not null check (app in ('mobile', 'admin')),
  kind text not null check (kind in ('uncaught', 'rejection', 'boundary')),
  message text not null check (char_length(message) <= 2000),
  stack text check (char_length(stack) <= 8000),
  code text check (char_length(code) <= 64),
  screen text check (char_length(screen) <= 120),
  platform text check (char_length(platform) <= 40),
  app_version text check (char_length(app_version) <= 32),
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index client_errors_recent on client_errors (created_at desc);
create index client_errors_by_user on client_errors (user_id, created_at desc);

alter table client_errors enable row level security;

-- Keep in step with scrubErrorText in packages/shared/src/error-report.ts;
-- supabase/test/client-errors.test.ts checks that both give the same result.
create function scrub_client_text(input text) returns text language plpgsql immutable as $$
declare
  v text := input;
begin
  if v is null then return null; end if;
  v := regexp_replace(v, 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)?', '[token]', 'g');
  v := regexp_replace(v, 'bearer\s+[^\s"'',;]+', 'Bearer [token]', 'gi');
  v := regexp_replace(v, '(access_token|refresh_token|id_token|token|api_?key|authorization|password|secret)(["'']?\s*[:=]\s*["'']?)[^\s"''&,;)}]+', '\1\2[redacted]', 'gi');
  v := regexp_replace(v, '/track/[^\s"''?#)]+', '/track/[token]', 'gi');
  v := regexp_replace(v, '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '[id]', 'gi');
  v := regexp_replace(v, '(?<![A-Za-z0-9_.])\+?\d(?:[ -]?\d){9,14}(?![A-Za-z0-9_])', '[phone]', 'g');
  v := regexp_replace(v, '(?<![A-Za-z0-9_.])-?\d{1,3}\.\d{3,}(?![A-Za-z0-9_.])', '[coord]', 'g');
  v := regexp_replace(v, '(otp|pin|passcode|code)[^0-9a-z]{0,4}(is[^0-9a-z]{1,3})?\d{4,8}(?![0-9])', '\1 [otp]', 'gi');
  v := regexp_replace(v, '(?<![A-Za-z0-9_.:/-])\d{4,8}(?![A-Za-z0-9_:.-])', '[num]', 'g');
  return v;
end $$;

-- Returns true if the report was stored and false if the caller is over the rate limit, so a
-- crash loop neither fills the table nor makes the client retry forever.
create function report_client_error(
  p_app text,
  p_kind text,
  p_message text,
  p_stack text default null,
  p_code text default null,
  p_screen text default null,
  p_platform text default null,
  p_app_version text default null,
  p_occurred_at timestamptz default null
) returns boolean language plpgsql security definer set search_path = public as $$
declare
  uid uuid := require_user();
  -- Scrub before cutting to length, so the cut cannot split a value and hide it from the scrub.
  v_message text := left(scrub_client_text(left(p_message, 20000)), 2000);
  v_stack text := left(scrub_client_text(left(p_stack, 40000)), 8000);
  v_code text := scrub_client_text(left(p_code, 64));
  v_screen text := left(scrub_client_text(left(p_screen, 500)), 120);
  v_platform text := scrub_client_text(left(p_platform, 40));
  v_version text := scrub_client_text(left(p_app_version, 32));
begin
  if coalesce(p_app, '') not in ('mobile', 'admin')
    or coalesce(p_kind, '') not in ('uncaught', 'rejection', 'boundary')
    or coalesce(trim(v_message), '') = '' then
    perform app_error('bad_request');
  end if;
  -- Short labels only. A scrubbed value contains brackets, so it fails these patterns too.
  if v_code !~ '^[A-Za-z][A-Za-z0-9_.-]*$' then v_code := null; end if;
  if v_platform !~ '^[A-Za-z][A-Za-z0-9_. -]*$' then v_platform := null; end if;
  if v_version !~ '^[0-9][A-Za-z0-9_.+-]*$' then v_version := null; end if;

  -- One at a time per user, so parallel requests cannot all pass the count below.
  perform pg_advisory_xact_lock(hashtextextended('client_errors:' || uid::text, 0));
  if (select count(*) from client_errors where user_id = uid and created_at > now() - interval '1 hour') >= 60 then
    return false;
  end if;

  insert into client_errors (user_id, app, kind, message, stack, code, screen, platform, app_version, occurred_at)
  values (uid, p_app, p_kind, v_message, v_stack, v_code, v_screen, v_platform, v_version,
    case when p_occurred_at between now() - interval '30 days' and now() + interval '1 day' then p_occurred_at else now() end);
  return true;
end $$;

-- The user id is enough to find someone in an investigation; phones and names stay out of this list.
create function admin_client_errors(p_limit integer default 100, p_app text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform require_staff(array['admin']);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'userId', e.user_id, 'app', e.app, 'kind', e.kind, 'message', e.message, 'stack', e.stack,
      'code', e.code, 'screen', e.screen, 'platform', e.platform, 'appVersion', e.app_version,
      'occurredAt', e.occurred_at, 'createdAt', e.created_at)
    order by e.created_at desc, e.id desc), '[]')
    from (select * from client_errors where p_app is null or app = p_app
          order by created_at desc, id desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) e);
end $$;

-- ---------------------------------------------------------------- grants

revoke all on client_errors from public, anon, authenticated;
revoke execute on function scrub_client_text(text) from public, anon, authenticated;
revoke execute on function report_client_error(text, text, text, text, text, text, text, text, timestamptz) from public, anon, authenticated;
revoke execute on function admin_client_errors(integer, text) from public, anon, authenticated;

grant execute on function
  report_client_error(text, text, text, text, text, text, text, text, timestamptz),
  admin_client_errors(integer, text)
to authenticated;
