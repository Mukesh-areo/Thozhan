// Staff roles and the audit log, on the real migrations, called the way Supabase calls them.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGS } from '@thozhan/i18n';
import { createDatabase, type Caller, type Database } from '../dev/db.ts';
import { createApp, signJwt } from '../dev/server.ts';

const BASE = 'http://backend.test';
const NOWHERE = '00000000-0000-4000-a000-0000000000ff';
const DOCS = { licence: 'x/l.jpg', rc: 'x/rc.jpg', permit: 'x/p.jpg', insurance: 'x/i.jpg' };

type Role = 'admin' | 'gov' | 'support' | 'reviewer';
interface User {
  id: string;
  phone: string;
  as: Caller;
  rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T>;
}

let db: Database;
let app: (req: Request) => Promise<Response>;
let phones = 9200000000;
let plates = 1000;

before(async () => {
  db = await createDatabase();
  app = createApp(db, { storageDir: mkdtempSync(join(tmpdir(), 'thozhan-staff-')), publicUrl: BASE });
});

async function user(name: string, staffRole?: Role): Promise<User> {
  const phone = '91' + phones++;
  const { rows } = await db.pg.query<{ id: string }>(`insert into auth.users (phone) values ($1) returning id`, [phone]);
  const id = rows[0]!.id;
  const as: Caller = { role: 'authenticated', claims: { sub: id, role: 'authenticated', phone } };
  const u: User = { id, phone, as, rpc: (fn, args = {}) => db.rpc(fn, args, as) };
  await u.rpc('sign_in_profile', { p_locale: 'en' });
  await u.rpc('update_profile', { p_name: name, p_locale: null });
  if (staffRole) await db.pg.query(`update profiles set staff_role = $2 where id = $1`, [id, staffRole]);
  return u;
}

async function pendingDriver(name = 'Driver'): Promise<User> {
  const d = await user(name);
  await d.rpc('register_driver', { p_vehicle_number: `TN 11 AB ${plates++}`, p_licence_number: 'TN1120190012345', p_documents: DOCS });
  return d;
}

async function rejects(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: Error) => {
    assert.equal(e.message, code);
    return true;
  });
}

interface AuditEntry {
  id: number;
  at: string;
  action: string;
  target: string | null;
  targetName: string | null;
  detail: Record<string, any> | null;
  actor: { id: string; name: string | null; phone: string } | null;
}
interface AuditLog {
  actions: string[];
  total: number;
  entries: AuditEntry[];
}

const ROLES: (Role | null)[] = ['admin', 'support', 'reviewer', 'gov', null];

// Each function, the staff roles that may call it, and arguments safe for any caller. Allowed
// callers may get a validation error like not_found; only refusals raise `forbidden`.
const MATRIX: [string, Role[], Record<string, unknown>][] = [
  ['admin_overview', ['admin'], {}],
  ['admin_drivers', ['admin', 'reviewer'], { p_status: 'pending' }],
  ['admin_review_driver', ['admin', 'reviewer'], { p_driver: NOWHERE, p_status: 'approved', p_note: null }],
  ['admin_trips', ['admin', 'support'], { p_limit: 5, p_flow: null }],
  ['admin_incidents', ['admin', 'support'], { p_status: 'open' }],
  ['admin_resolve_incident', ['admin', 'support'], { p_incident: NOWHERE, p_resolution: 'done' }],
  ['admin_set_flag', ['admin'], { p_category: 'no-such-service', p_enabled: true }],
  ['admin_record_payment', ['admin'], { p_driver: NOWHERE, p_amount_paise: 0, p_ref: '' }],
  ['compliance_report', ['admin', 'gov'], { p_days: 7 }],
  ['admin_audit_log', ['admin'], {}],
  ['admin_staff', ['admin'], {}],
  ['admin_find_person', ['admin'], { p_phone: '9999999999' }],
  ['admin_set_staff_role', ['admin'], { p_user: NOWHERE, p_role: 'support' }],
];

test('each role can call exactly the functions it should', async () => {
  const people = await Promise.all(ROLES.map((r) => user(`As ${r ?? 'nobody'}`, r ?? undefined)));
  for (const [fn, allowed, args] of MATRIX) {
    for (const [i, role] of ROLES.entries()) {
      const outcome = await people[i]!.rpc(fn, args).then(
        () => 'ok',
        (e: Error) => e.message,
      );
      if (role && allowed.includes(role)) assert.notEqual(outcome, 'forbidden', `${role} should reach ${fn}`);
      else assert.equal(outcome, 'forbidden', `${role ?? 'non-staff'} should be refused ${fn}`);
    }
  }
});

test('the database refuses unknown staff roles', async () => {
  const u = await user('Someone');
  await assert.rejects(db.pg.query(`update profiles set staff_role = 'owner' where id = $1`, [u.id]), /profiles_staff_role_check/);
});

test('new functions are closed to anon and direct table reads stay closed', async () => {
  const { rows } = await db.pg.query<{ proname: string }>(
    `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
  );
  assert.deepEqual(
    rows.map((r) => r.proname),
    ['service_flags', 'shared_trip'],
  );
  for (const [fn, , args] of MATRIX) await assert.rejects(db.rpc(fn, args, { role: 'anon' }), /permission denied/);
  await assert.rejects(db.rpc('can_read_driver_documents', {}, { role: 'anon' }), /permission denied/);
  const admin = await user('Admin', 'admin');
  await assert.rejects(
    db.pg.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify(admin.as.claims)]);
      await tx.exec(`set local role authenticated`);
      await tx.query(`select * from audit_log`);
    }),
    /permission denied/,
  );
});

test('reviewer reviews drivers without seeing fees; the review is audited', async () => {
  const reviewer = await user('Rani Reviewer', 'reviewer');
  const admin = await user('Admin', 'admin');
  const d = await pendingDriver('Kumar');
  await db.pg.query(`insert into ledger (driver_id, day, kind, amount_paise) values ($1, current_date, 'fee', 1000)`, [d.id]);

  const seenByReviewer = (await reviewer.rpc<any[]>('admin_drivers', { p_status: 'pending' })).find((x) => x.id === d.id);
  assert.equal(seenByReviewer.balancePaise, null);
  assert.deepEqual(seenByReviewer.documents, DOCS);
  assert.equal((await admin.rpc<any[]>('admin_drivers', { p_status: 'pending' })).find((x) => x.id === d.id).balancePaise, 1000);

  await reviewer.rpc('admin_review_driver', { p_driver: d.id, p_status: 'rejected', p_note: 'RC photo unreadable' });
  const [entry] = (await admin.rpc<AuditLog>('admin_audit_log', { p_action: 'driver.rejected' })).entries;
  assert.equal(entry!.actor!.name, 'Rani Reviewer');
  assert.equal(entry!.target, d.id);
  assert.equal(entry!.targetName, 'Kumar');
  assert.equal(entry!.detail!.note, 'RC photo unreadable');
});

test('support resolves incidents and cannot touch drivers, services, payments or trips', async () => {
  const support = await user('Sita Support', 'support');
  const admin = await user('Admin', 'admin');
  const rider = await user('Latha');
  const d = await pendingDriver();
  const incident = await rider.rpc('report_incident', { p_kind: 'complaint', p_message: 'Rude driver' });

  const open = await support.rpc<any[]>('admin_incidents', { p_status: 'open' });
  assert.ok(open.some((i) => i.id === incident.id));
  await support.rpc('admin_resolve_incident', { p_incident: incident.id, p_resolution: 'Spoke to the driver' });

  const [entry] = (await admin.rpc<AuditLog>('admin_audit_log', { p_action: 'incident.resolve' })).entries;
  assert.equal(entry!.actor!.name, 'Sita Support');
  assert.equal(entry!.target, incident.id);
  assert.equal(entry!.targetName, 'Latha');
  assert.equal(entry!.detail!.resolution, 'Spoke to the driver');

  await rejects(support.rpc('admin_review_driver', { p_driver: d.id, p_status: 'approved', p_note: null }), 'forbidden');
  await rejects(support.rpc('admin_set_flag', { p_category: 'auto', p_enabled: false }), 'forbidden');
  await rejects(support.rpc('admin_record_payment', { p_driver: d.id, p_amount_paise: 100, p_ref: 'x' }), 'forbidden');
});

test('admin actions on services and payments are audited', async () => {
  const admin = await user('Anbu Admin', 'admin');
  const d = await pendingDriver('Payer');
  await admin.rpc('admin_set_flag', { p_category: 'auto', p_enabled: true });
  await admin.rpc('admin_record_payment', { p_driver: d.id, p_amount_paise: 500, p_ref: 'R-1' });

  const log = await admin.rpc<AuditLog>('admin_audit_log');
  const payment = log.entries.find((e) => e.action === 'ledger.payment' && e.target === d.id);
  assert.deepEqual(payment!.detail, { amount: 500, ref: 'R-1' });
  assert.equal(payment!.targetName, 'Payer');
  const flag = log.entries.find((e) => e.action === 'flag.set' && e.target === 'auto');
  assert.deepEqual(flag!.detail, { enabled: true });
  assert.equal(flag!.actor!.name, 'Anbu Admin');
});

test('audit log: newest first, filters by action and IST date, caps the page, reports the total', async () => {
  const admin = await user('Admin', 'admin');
  await db.pg.exec(`delete from audit_log`);
  // 23:00 IST on the 5th is still the 5th in IST, though it is 17:30 UTC; 20:00 UTC on the 5th is already the 6th in IST.
  await db.pg.exec(`insert into audit_log (actor, action, target, at) values
    (null, 'flag.set', 'a', '2026-11-05 17:30:00+00'),
    (null, 'ledger.payment', 'b', '2026-11-05 20:00:00+00'),
    (null, 'flag.set', 'c', '2026-11-06 20:00:00+00');`);

  const all = await admin.rpc<AuditLog>('admin_audit_log');
  assert.deepEqual(all.entries.map((e) => e.target), ['c', 'b', 'a']);
  assert.equal(all.total, 3);
  assert.deepEqual(all.actions, ['flag.set', 'ledger.payment']);
  assert.equal(all.entries[0]!.actor, null, 'system entries have no actor');

  const flags = await admin.rpc<AuditLog>('admin_audit_log', { p_action: 'flag.set' });
  assert.deepEqual(flags.entries.map((e) => e.target), ['c', 'a']);

  const fifth = await admin.rpc<AuditLog>('admin_audit_log', { p_from: '2026-11-05', p_to: '2026-11-05' });
  assert.deepEqual(fifth.entries.map((e) => e.target), ['a']);
  const sixthOn = await admin.rpc<AuditLog>('admin_audit_log', { p_from: '2026-11-06' });
  assert.deepEqual(sixthOn.entries.map((e) => e.target), ['c', 'b']);

  const capped = await admin.rpc<AuditLog>('admin_audit_log', { p_limit: 1 });
  assert.deepEqual([capped.entries.length, capped.total], [1, 3]);
});

test('role assignment: lookup by phone, audited, no-op changes are not logged', async () => {
  const admin = await user('Admin', 'admin');
  const person = await user('New Hire');
  await db.pg.exec(`delete from audit_log`);

  const found = await admin.rpc('admin_find_person', { p_phone: person.phone.slice(2) });
  assert.deepEqual([found.id, found.role], [person.id, null]);
  await rejects(admin.rpc('admin_find_person', { p_phone: '98765 00000' }), 'not_found');

  const staff = await admin.rpc<any[]>('admin_set_staff_role', { p_user: person.id, p_role: 'support' });
  assert.equal(staff.find((s) => s.id === person.id).role, 'support');
  assert.equal(staff.find((s) => s.id === admin.id).self, true);
  assert.ok(Array.isArray(await person.rpc('admin_trips', { p_limit: 1 })), 'the new role applies at once');

  await admin.rpc('admin_set_staff_role', { p_user: person.id, p_role: 'support' });
  await admin.rpc('admin_set_staff_role', { p_user: person.id, p_role: null });
  await rejects(person.rpc('admin_trips', { p_limit: 1 }), 'forbidden');
  await rejects(admin.rpc('admin_set_staff_role', { p_user: person.id, p_role: 'owner' }), 'invalid_action');
  await rejects(admin.rpc('admin_set_staff_role', { p_user: NOWHERE, p_role: 'support' }), 'not_found');

  const log = await admin.rpc<AuditLog>('admin_audit_log', { p_action: 'staff.role' });
  assert.deepEqual(log.entries.map((e) => e.detail), [
    { from: 'support', to: null },
    { from: null, to: 'support' },
  ]);
  assert.equal(log.entries[0]!.actor!.id, admin.id);
  assert.equal(log.entries[0]!.targetName, 'New Hire');
});

test('an admin cannot remove their own admin role, but another admin can', async () => {
  const a = await user('First Admin', 'admin');
  const b = await user('Second Admin', 'admin');
  for (const role of ['support', 'reviewer', 'gov', null]) {
    await rejects(a.rpc('admin_set_staff_role', { p_user: a.id, p_role: role }), 'cannot_remove_own_admin');
  }
  await a.rpc('admin_set_staff_role', { p_user: a.id, p_role: 'admin' });
  assert.equal((await a.rpc('me')).staffRole, 'admin');

  await b.rpc('admin_set_staff_role', { p_user: a.id, p_role: 'support' });
  await rejects(a.rpc('admin_set_staff_role', { p_user: b.id, p_role: null }), 'forbidden');
});

test('every audit action and error code has a label in both languages', () => {
  const actions = ['driver.approved', 'driver.rejected', 'driver.suspended', 'incident.resolve', 'flag.set', 'ledger.payment', 'payment.amount_mismatch', 'staff.role'];
  const keys = [
    ...actions.map((a) => `a.audit.action.${a}`),
    ...['cancel', 'complete', 'return'].map((a) => `a.audit.action.trip.${a}`),
    ...['admin', 'support', 'reviewer', 'gov'].map((r) => `a.staff.role.${r}`),
    'm.error.cannot_remove_own_admin',
  ];
  for (const locale of ['en', 'ta'] as const) {
    assert.deepEqual(keys.filter((k) => !CATALOGS[locale][k]), []);
  }
});

async function signedUrlStatus(u: User, key: string) {
  const token = signJwt({ sub: u.id, role: 'authenticated', phone: u.phone, exp: Math.floor(Date.now() / 1000) + 600 });
  const res = await app(
    new Request(`${BASE}/storage/v1/object/sign/driver-documents/${key}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ expiresIn: 60 }),
    }),
  );
  await res.text();
  return res.status;
}

test('dev storage: documents open for admin, reviewer and the owner only', async () => {
  const owner = await user('Owner');
  const key = `${owner.id}/licence.jpg`;
  assert.equal(await signedUrlStatus(owner, key), 200);
  assert.equal(await signedUrlStatus(await user('A', 'admin'), key), 200);
  assert.equal(await signedUrlStatus(await user('R', 'reviewer'), key), 200);
  assert.equal(await signedUrlStatus(await user('S', 'support'), key), 403);
  assert.equal(await signedUrlStatus(await user('G', 'gov'), key), 403);
  assert.equal(await signedUrlStatus(await user('N'), key), 403);
});

test('storage policy: real migrations against a minimal storage schema', async () => {
  // A separate database: the policies run here exactly as written for Supabase.
  const storageDb = await createDatabase();
  await storageDb.pg.exec(`
    create schema storage;
    create table storage.buckets (id text primary key, name text, public boolean);
    create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
    alter table storage.objects enable row level security;
    create function storage.foldername(name text) returns text[] language sql immutable as $$
      select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
    $$;
    grant usage on schema storage to authenticated;
    grant select on storage.objects to authenticated;
    grant execute on all functions in schema storage to authenticated;
  `);
  const dir = fileURLToPath(new URL('../migrations/', import.meta.url));
  for (const file of readdirSync(dir).sort()) {
    const sql = readFileSync(dir + file, 'utf8');
    if (sql.startsWith('-- supabase-only')) await storageDb.pg.exec(sql);
  }

  const person = async (phone: string, role?: Role) => {
    const { rows } = await storageDb.pg.query<{ id: string }>(`insert into auth.users (phone) values ($1) returning id`, [phone]);
    await storageDb.pg.query(`insert into profiles (id, phone, staff_role) values ($1, $2, $3)`, [rows[0]!.id, phone, role ?? null]);
    return rows[0]!.id;
  };
  const owner = await person('911');
  await storageDb.pg.query(`insert into storage.objects (bucket_id, name) values ('driver-documents', $1)`, [`${owner}/licence.jpg`]);
  const visibleTo = (id: string) =>
    storageDb.pg.transaction(async (tx) => {
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: id, role: 'authenticated' })]);
      await tx.exec(`set local role authenticated`);
      return (await tx.query(`select name from storage.objects`)).rows.length;
    });

  assert.equal(await visibleTo(owner), 1);
  assert.equal(await visibleTo(await person('912', 'admin')), 1);
  assert.equal(await visibleTo(await person('913', 'reviewer')), 1);
  assert.equal(await visibleTo(await person('914', 'support')), 0);
  assert.equal(await visibleTo(await person('915', 'gov')), 0);
  assert.equal(await visibleTo(await person('916')), 0);
});
