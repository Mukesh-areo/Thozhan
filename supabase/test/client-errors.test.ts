// Error reporting: the real migrations on PGlite, called with API roles and JWT claims.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { rpcSender, scrubErrorText, type ErrorReport } from '@thozhan/shared';
import { createDatabase, type Caller, type Database } from '../dev/db.ts';
import { ANON_KEY, createApp, signJwt } from '../dev/server.ts';

const BASE = 'http://backend.test';
const REPORT_ARGS = '(text, text, text, text, text, text, text, text, timestamptz)';
let db: Database;
let app: (req: Request) => Promise<Response>;
let phones = 9200000000;

before(async () => {
  db = await createDatabase();
  app = createApp(db, { storageDir: mkdtempSync(join(tmpdir(), 'thozhan-storage-')), publicUrl: BASE });
});

const ANON: Caller = { role: 'anon' };
interface Row {
  id: number;
  userId: string;
  app: string;
  kind: string;
  message: string;
  stack: string | null;
  code: string | null;
  screen: string | null;
  platform: string | null;
  appVersion: string | null;
  occurredAt: string;
}

async function user(staffRole?: 'admin' | 'gov') {
  const phone = '91' + phones++;
  const { rows } = await db.pg.query<{ id: string }>(`insert into auth.users (phone) values ($1) returning id`, [phone]);
  const id = rows[0]!.id;
  const as: Caller = { role: 'authenticated', claims: { sub: id, role: 'authenticated', phone } };
  const rpc = <T = any>(fn: string, args: Record<string, unknown> = {}) => db.rpc<T>(fn, args, as);
  await rpc('sign_in_profile', { p_locale: 'en' });
  if (staffRole) await db.pg.query(`update profiles set staff_role = $2 where id = $1`, [id, staffRole]);
  return { id, phone, as, rpc };
}

const report = (message: string, extra: Record<string, unknown> = {}) => ({ p_app: 'mobile', p_kind: 'uncaught', p_message: message, ...extra });

async function rejects(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: Error) => {
    assert.equal(e.message, code);
    return true;
  });
}

const denied = (e: Error & { status?: number }) => {
  assert.match(e.message, /permission denied/);
  return true;
};

test('a signed-in user can report an error and an admin can read it', async () => {
  const rider = await user();
  const admin = await user('admin');
  const stored = await rider.rpc<boolean>(
    'report_client_error',
    report('TypeError: x is not a function', {
      p_kind: 'boundary',
      p_stack: 'at Book (bundle:1:234)',
      p_code: 'network',
      p_screen: '(rider)/book',
      p_platform: 'android 34',
      p_app_version: '0.1.0',
      p_occurred_at: '2026-11-09T01:00:00Z',
    }),
  );
  assert.equal(stored, true);

  const rows = await admin.rpc<Row[]>('admin_client_errors', { p_limit: 500 });
  const row = rows.find((r) => r.userId === rider.id)!;
  assert.equal(row.app, 'mobile');
  assert.equal(row.kind, 'boundary');
  assert.equal(row.message, 'TypeError: x is not a function');
  assert.equal(row.stack, 'at Book (bundle:1:234)');
  assert.equal(row.code, 'network');
  assert.equal(row.screen, '(rider)/book');
  assert.equal(row.platform, 'android 34');
  assert.equal(row.appVersion, '0.1.0');
  assert.equal(new Date(row.occurredAt).toISOString(), '2026-11-09T01:00:00.000Z');
  assert.ok(!JSON.stringify(row).includes(rider.phone), 'the admin list does not expose phone numbers');
});

test('the table is closed and only the intended functions are callable', async () => {
  const rider = await user();
  for (const sql of ['select * from client_errors', `insert into client_errors (app, kind, message, occurred_at) values ('mobile', 'uncaught', 'x', now())`]) {
    await assert.rejects(
      db.pg.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(rider.as.claims)]);
        await tx.exec('set local role authenticated');
        await tx.query(sql);
      }),
      denied,
    );
  }
  await assert.rejects(db.rpc('report_client_error', report('x'), ANON), denied);
  await assert.rejects(db.rpc('admin_client_errors', {}, ANON), denied);
  await assert.rejects(rider.rpc('scrub_client_text', { input: 'x' }), denied);

  const { rows } = await db.pg.query<{ fn: string; definer: boolean; anon: boolean; pub: boolean; auth: boolean }>(`
    select p.oid::regprocedure::text as fn, p.prosecdef as definer,
      has_function_privilege('anon', p.oid, 'execute') as anon,
      exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a where a.grantee = 0 and a.privilege_type = 'EXECUTE') as pub,
      has_function_privilege('authenticated', p.oid, 'execute') as auth
    from pg_proc p where p.oid in ('report_client_error${REPORT_ARGS}'::regprocedure, 'admin_client_errors(integer, text)'::regprocedure, 'scrub_client_text(text)'::regprocedure)`);
  assert.equal(rows.length, 3);
  for (const row of rows) {
    assert.equal(row.anon, false, `${row.fn} is closed to anon`);
    assert.equal(row.pub, false, `${row.fn} is closed to public`);
    assert.equal(row.auth, !row.fn.startsWith('scrub_client_text'), `${row.fn} authenticated grant`);
    assert.equal(row.definer, !row.fn.startsWith('scrub_client_text'), `${row.fn} security definer`);
  }
  const rls = await db.pg.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where oid = 'client_errors'::regclass`);
  assert.equal(rls.rows[0]!.relrowsecurity, true);
});

test('only admins can read reports', async () => {
  const gov = await user('gov');
  const rider = await user();
  await rejects(gov.rpc('admin_client_errors'), 'forbidden');
  await rejects(rider.rpc('admin_client_errors'), 'forbidden');
});

test('private values never reach the table, even from a client that does not scrub', async () => {
  const rider = await user();
  const admin = await user('admin');
  const jwt = signJwt({ sub: rider.id, role: 'authenticated' });
  const secrets = ['482913', '+919000012345', '9000012345', '13.08372', '80.27071', jwt, 'abc.def-token', rider.id];
  await rider.rpc(
    'report_client_error',
    report(`otp 482913 failed for +919000012345 at 13.08372,80.27071 with ${jwt}`, {
      p_stack: `refresh_token=abc.def-token phone:9000012345 Authorization: Bearer ${jwt}\nuser ${rider.id}\nat foo (bundle:1:234567)`,
      p_screen: `/track/abc.def-token/9000012345`,
      p_code: '9000012345',
      p_platform: '9000012345',
      p_app_version: '9000012345',
    }),
  );
  const row = (await admin.rpc<Row[]>('admin_client_errors', { p_limit: 500 })).find((r) => r.userId === rider.id)!;
  const { userId: _userId, ...text } = row;
  const stored = JSON.stringify(text);
  for (const secret of secrets) assert.ok(!stored.includes(secret), `${secret} was stored: ${stored}`);
  assert.match(row.stack!, /bundle:1:234567/, 'stack positions survive');
  assert.equal(row.code, null);
  assert.equal(row.platform, null);
  assert.equal(row.appVersion, null);
});

test('the device and the server scrub identically', async () => {
  const samples = [
    'OTP is 123456',
    'otp:4821',
    'pin=1234 and code: 998877',
    'Call +91 90000 00001 or 9000000002',
    'lat 13.0837 lon -80.2707 {"lat":13.083712}',
    'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl next',
    'Authorization: Bearer abc123def',
    '{"access_token":"xyz","api_key":"k1"} password=hunter2&x=1',
    'https://x.test/track/AbC_123?y=1',
    'user 3f2504e0-4f89-41d3-9a0c-0305e82c3301 done',
    'at foo (http://192.168.1.5:8081/index.bundle?platform=android:123:45)',
    'react-native@0.88.1 TN 09 AB 4821 v1.2.3',
  ];
  for (const sample of samples) {
    const { rows } = await db.pg.query<{ out: string }>(`select scrub_client_text($1) as out`, [sample]);
    assert.equal(rows[0]!.out, scrubErrorText(sample), sample);
  }
});

test('long reports are cut to the limit and bad input is refused', async () => {
  const rider = await user();
  const admin = await user('admin');
  await rider.rpc('report_client_error', report('m'.repeat(50000), { p_stack: 's'.repeat(100000), p_screen: 'x'.repeat(9000) }));
  const row = (await admin.rpc<Row[]>('admin_client_errors', { p_limit: 500 })).find((r) => r.userId === rider.id)!;
  assert.equal(row.message.length, 2000);
  assert.equal(row.stack!.length, 8000);
  assert.equal(row.screen!.length, 120);

  await rejects(rider.rpc('report_client_error', report('   ')), 'bad_request');
  await rejects(rider.rpc('report_client_error', report('x', { p_app: 'other' })), 'bad_request');
  await rejects(rider.rpc('report_client_error', report('x', { p_kind: 'other' })), 'bad_request');
});

test('reports are rate-limited per user', async () => {
  const noisy = await user();
  const other = await user();
  for (let i = 0; i < 60; i++) assert.equal(await noisy.rpc('report_client_error', report(`e${i}`)), true);
  assert.equal(await noisy.rpc('report_client_error', report('over')), false);
  assert.equal(await other.rpc('report_client_error', report('fine')), true);
  const { rows } = await db.pg.query<{ n: number }>(`select count(*)::int as n from client_errors where user_id = $1`, [noisy.id]);
  assert.equal(rows[0]!.n, 60);
});

test('the admin list is newest first and honours limit and app filter', async () => {
  const rider = await user();
  const admin = await user('admin');
  await rider.rpc('report_client_error', report('older'));
  await rider.rpc('report_client_error', report('newer', { p_app: 'admin' }));
  const latest = await admin.rpc<Row[]>('admin_client_errors', { p_limit: 1 });
  assert.equal(latest.length, 1);
  assert.equal(latest[0]!.message, 'newer');
  const onlyAdmin = await admin.rpc<Row[]>('admin_client_errors', { p_limit: 500, p_app: 'admin' });
  assert.ok(onlyAdmin.length > 0 && onlyAdmin.every((r) => r.app === 'admin'));
});

test('the shared sender works through supabase-js and the local server', async () => {
  const rider = await user();
  const admin = await user('admin');
  const token = signJwt({ sub: rider.id, role: 'authenticated', phone: rider.phone, exp: Math.floor(Date.now() / 1000) + 600 });
  const client = createClient(BASE, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: ((input: RequestInfo | URL, init?: RequestInit) => app(new Request(input, init))) as typeof fetch, headers: { authorization: `Bearer ${token}` } },
  });
  const send = rpcSender({
    app: 'admin',
    appVersion: '0.1.0',
    platform: 'web',
    hasSession: async () => true,
    rpc: (args) => client.rpc('report_client_error', args),
  });
  const entry: ErrorReport = { kind: 'rejection', message: 'through http', stack: null, code: 'network', screen: 'overview', occurredAt: new Date().toISOString() };
  assert.equal(await send(entry), 'sent');
  const row = (await admin.rpc<Row[]>('admin_client_errors', { p_limit: 500 })).find((r) => r.userId === rider.id)!;
  assert.equal(row.message, 'through http');
  assert.equal(row.app, 'admin');
});
