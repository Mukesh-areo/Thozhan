// Backend tests: the real migrations on PGlite, called the way Supabase calls them (API role
// plus JWT claims), and the edge functions run in-process.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { simulatedFixes } from '@thozhan/meter';
import { MACHINES, SIMULATION_ROUTE } from '@thozhan/shared';
import { calculateFare, getActiveRule } from '@thozhan/tariff';
import { createDatabase, type Caller, type Database } from '../dev/db.ts';
import { ANON_KEY, DEV_OTP, createApp, signJwt } from '../dev/server.ts';
import { signature } from '../functions/razorpay-webhook/handler.ts';

const BASE = 'http://backend.test';
let db: Database;
let app: (req: Request) => Promise<Response>;

before(async () => {
  db = await createDatabase();
  await db.pg.exec(`update service_flags set enabled = true where category = 'parcel-auto'`);
  app = createApp(db, {
    storageDir: mkdtempSync(join(tmpdir(), 'thozhan-storage-')),
    publicUrl: BASE,
  });
});

// ---------------------------------------------------------------- helpers

let phones = 9100000000;
interface User {
  id: string;
  phone: string;
  as: Caller;
  rpc<T = any>(fn: string, args?: Record<string, unknown>): Promise<T>;
  fn<T = any>(name: string, body: unknown): Promise<{ status: number; body: T }>;
}

async function user(name: string, staffRole?: 'admin' | 'gov'): Promise<User> {
  const phone = '91' + phones++;
  const { rows } = await db.pg.query<{ id: string }>(`insert into auth.users (phone) values ($1) returning id`, [phone]);
  const id = rows[0]!.id;
  const as: Caller = {
    role: 'authenticated',
    claims: { sub: id, role: 'authenticated', phone },
  };
  const u: User = {
    id,
    phone,
    as,
    rpc: (fn, args = {}) => db.rpc(fn, args, as),
    async fn(fnName, body) {
      const token = signJwt({
        sub: id,
        role: 'authenticated',
        phone,
        exp: Math.floor(Date.now() / 1000) + 600,
      });
      const res = await app(
        new Request(`${BASE}/functions/v1/${fnName}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        }),
      );
      return { status: res.status, body: await res.json() };
    },
  };
  await u.rpc('sign_in_profile', { p_locale: 'en' });
  await u.rpc('update_profile', { p_name: name, p_locale: null });
  if (staffRole) await db.pg.query(`update profiles set staff_role = $2 where id = $1`, [id, staffRole]);
  return u;
}

const DOCS = {
  licence: 'x/l.jpg',
  rc: 'x/rc.jpg',
  permit: 'x/p.jpg',
  insurance: 'x/i.jpg',
};
let plates = 1000;
async function driver(name: string, at: [number, number], admin: User): Promise<User> {
  const d = await user(name);
  await d.rpc('register_driver', {
    p_vehicle_number: `TN 09 AB ${plates++}`,
    p_licence_number: 'TN0920190012345',
    p_documents: DOCS,
  });
  await admin.rpc('admin_review_driver', {
    p_driver: d.id,
    p_status: 'approved',
    p_note: null,
  });
  await d.rpc('driver_set_online', {
    p_online: true,
    p_lat: at[0],
    p_lon: at[1],
  });
  return d;
}

const CENTRAL = { name: 'Chennai Central', lat: 13.0837, lon: 80.2707 };
const TNAGAR = { name: 'T. Nagar', lat: 13.0418, lon: 80.2341 };

async function rejects(p: Promise<unknown>, code: string) {
  await assert.rejects(p, (e: Error) => {
    assert.equal(e.message, code);
    return true;
  });
}

/** Ends all open trips so each test starts with free drivers. */
async function clearTrips() {
  await db.pg.exec(`update trips set status = 'CANCELLED', ended_at = now() where is_open(status); update drivers set online = false;`);
}

// ---------------------------------------------------------------- tests

test('trip_transitions mirrors the shared trip machines', async () => {
  const { rows } = await db.pg.query<{
    flow: string;
    action: string;
    from_status: string[];
    to_status: string;
    actors: string[];
    guards: string[];
  }>(`select * from trip_transitions`);
  const fromSql = Object.fromEntries(rows.map((r) => [`${r.flow}.${r.action}`, { from: r.from_status, to: r.to_status, by: r.actors, guards: r.guards }]));
  const fromTs = Object.fromEntries(
    Object.entries(MACHINES).flatMap(([flow, m]) =>
      Object.entries(m.transitions).map(([action, t]) => [`${flow}.${action}`, { from: t!.from, to: t!.to, by: t!.by, guards: t!.guards ?? [] }]),
    ),
  );
  assert.deepEqual(fromSql, fromTs);
});

test('tables are closed to app roles; internal functions are service-role only', async () => {
  const rider = await user('Rider');
  for (const role of ['anon', 'authenticated'] as const) {
    await assert.rejects(
      db.pg.transaction(async (tx) => {
        await tx.exec(`set local role ${role}`);
        await tx.query(`select * from trips`);
      }),
      /permission denied/,
    );
  }
  await assert.rejects(
    rider.rpc('finish_trip_internal', {
      p_trip: rider.id,
      p_driver: rider.id,
      p_action: 'complete',
      p_otp: null,
      p_distance: 1,
      p_waiting: 0,
      p_fare: {},
      p_flags: [],
    }),
    /permission denied/,
  );
  await assert.rejects(db.rpc('me', {}, { role: 'anon' }), /permission denied/);
  assert.equal((await db.rpc<Record<string, boolean>>('service_flags', {}, { role: 'anon' })).auto, true);
});

test('booked ride: dispatch, one winner, OTP, server fare from the GPS track, daily fee once', async () => {
  await clearTrips();
  const admin = await user('Admin', 'admin');
  const near = await driver('Near', [13.084, 80.271], admin);
  const far = await driver('Far', [13.09, 80.28], admin);
  const rider = await user('Rider');

  const quote = calculateFare(getActiveRule('auto'), {
    distanceMeters: 7600,
    startedAt: Date.now(),
  });
  const trip = await rider.rpc('request_trip', {
    p_category: 'auto',
    p_pickup: CENTRAL,
    p_dropoff: TNAGAR,
    p_estimate_meters: 7600,
    p_quote: quote,
    p_client_key: 'k-ride-1',
  });
  assert.equal(trip.status, 'REQUESTED');
  assert.match(trip.startOtp, /^\d{4}$/);
  // Same client key: same trip, not a second booking.
  assert.equal(
    (
      await rider.rpc('request_trip', {
        p_category: 'auto',
        p_pickup: CENTRAL,
        p_dropoff: TNAGAR,
        p_estimate_meters: 7600,
        p_quote: quote,
        p_client_key: 'k-ride-1',
      })
    ).id,
    trip.id,
  );
  await rejects(
    rider.rpc('request_trip', {
      p_category: 'auto',
      p_pickup: CENTRAL,
      p_dropoff: TNAGAR,
      p_estimate_meters: 7600,
      p_quote: quote,
      p_client_key: 'k-ride-2',
    }),
    'active_trip',
  );

  const nearInbox = await near.rpc('driver_inbox');
  const farInbox = await far.rpc('driver_inbox');
  assert.equal(nearInbox.offers.length, 1);
  assert.equal(farInbox.offers.length, 1);
  assert.equal(nearInbox.offers[0].trip.startOtp, null, 'drivers never see the OTP');

  const accepted = await near.rpc('accept_offer', {
    p_offer: nearInbox.offers[0].id,
  });
  assert.equal(accepted.status, 'ACCEPTED');
  await rejects(far.rpc('accept_offer', { p_offer: farInbox.offers[0].id }), 'offer_gone');
  // Even with its offer forced back open, the second driver cannot take an accepted trip.
  await db.pg.query(`update offers set status = 'offered' where id = $1`, [farInbox.offers[0].id]);
  await rejects(far.rpc('accept_offer', { p_offer: farInbox.offers[0].id }), 'already_taken');

  const seen = await rider.rpc('rider_state');
  assert.equal(seen.trip.driver.name, 'Near');
  await rejects(rider.rpc('trip_action', { p_trip: trip.id, p_action: 'arrive' }), 'not_allowed');
  await near.rpc('trip_action', { p_trip: trip.id, p_action: 'arrive' });
  await rejects(
    near.rpc('trip_action', {
      p_trip: trip.id,
      p_action: 'start',
      p_otp: '0000' === trip.startOtp ? '1111' : '0000',
    }),
    'wrong_otp',
  );
  await near.rpc('trip_action', {
    p_trip: trip.id,
    p_action: 'start',
    p_otp: trip.startOtp,
  });
  await rejects(near.rpc('trip_action', { p_trip: trip.id, p_action: 'complete' }), 'invalid_action');

  // Replay a real street track as driver pings, backdated so timestamps are 1 s apart.
  const t0 = Date.now() - 800_000;
  await db.pg.query(`update trips set started_at = $2 where id = $1`, [trip.id, new Date(t0).toISOString()]);
  const fixes = simulatedFixes(SIMULATION_ROUTE, t0);
  for (const f of fixes)
    await near.rpc('driver_ping', {
      p_lat: f.lat,
      p_lon: f.lon,
      p_accuracy: f.accuracyMeters,
      p_at: new Date(f.timestamp).toISOString(),
    });

  const done = await near.fn('finish-trip', {
    tripId: trip.id,
    action: 'complete',
  });
  assert.equal(done.status, 200, JSON.stringify(done.body));
  assert.equal(done.body.status, 'COMPLETED');
  assert.ok(done.body.distanceMeters > 3000, String(done.body.distanceMeters));
  assert.ok(Math.abs(done.body.waitingSeconds - 215) <= 20);
  assert.equal(done.body.fare.ruleId, 'tn-auto-2026');
  assert.deepEqual(done.body.fareFlags, []);
  assert.equal(done.body.totalPaise, done.body.fare.totalPaise);

  const ledger = await near.rpc('driver_ledger');
  assert.equal(ledger.balancePaise, 1000);

  // A second trip the same day does not charge again.
  await near.rpc('driver_ping', { p_lat: 13.084, p_lon: 80.271 }); // back at the stand
  await far.rpc('driver_set_online', { p_online: false });
  const second = await rider.rpc('request_trip', {
    p_category: 'auto',
    p_pickup: CENTRAL,
    p_dropoff: TNAGAR,
    p_estimate_meters: 7600,
    p_quote: quote,
    p_client_key: 'k-ride-3',
  });
  const offer = (await near.rpc('driver_inbox')).offers.find((o: any) => o.trip.id === second.id);
  await near.rpc('accept_offer', { p_offer: offer.id });
  await near.rpc('trip_action', { p_trip: second.id, p_action: 'arrive' });
  await near.rpc('trip_action', {
    p_trip: second.id,
    p_action: 'start',
    p_otp: second.startOtp,
  });
  const short = await near.fn('finish-trip', {
    tripId: second.id,
    action: 'complete',
  });
  assert.deepEqual(short.body.fareFlags, ['no-gps-track'], 'no track: bills the estimate and says so');
  assert.equal(short.body.distanceMeters, 7600);
  assert.equal((await near.rpc('driver_ledger')).balancePaise, 1000);
  assert.equal((await rider.rpc('my_trips')).length, 2);
});

test('parcel: receiver required, pickup and drop OTPs differ and are both checked', async () => {
  await clearTrips();
  const admin = await user('Admin', 'admin');
  const d = await driver('Parcel driver', [13.084, 80.271], admin);
  const sender = await user('Sender');
  const base = {
    p_category: 'parcel-auto',
    p_pickup: CENTRAL,
    p_dropoff: TNAGAR,
    p_estimate_meters: 7600,
    p_quote: {},
  };
  await rejects(
    sender.rpc('request_trip', {
      ...base,
      p_parcel: {
        receiverName: '',
        receiverPhone: '9876543210',
        weightGrams: 2000,
      },
    }),
    'receiver_required',
  );
  await rejects(
    sender.rpc('request_trip', {
      ...base,
      p_parcel: {
        receiverName: 'Meena',
        receiverPhone: '9876543210',
        weightGrams: 90000,
      },
    }),
    'bad_weight',
  );
  const trip = await sender.rpc('request_trip', {
    ...base,
    p_parcel: {
      receiverName: 'Meena',
      receiverPhone: '9876543210',
      weightGrams: 3000,
    },
  });
  assert.equal(trip.flow, 'delivery');
  assert.notEqual(trip.startOtp, trip.dropOtp);

  const inbox = await d.rpc('driver_inbox');
  assert.equal(inbox.offers[0].trip.parcel.receiverPhone, undefined, 'driver sees no receiver phone before delivery');
  await d.rpc('accept_offer', { p_offer: inbox.offers[0].id });
  await d.rpc('trip_action', { p_trip: trip.id, p_action: 'arrive' });
  await rejects(
    d.rpc('trip_action', {
      p_trip: trip.id,
      p_action: 'pickup',
      p_otp: trip.dropOtp,
    }),
    'wrong_otp',
  );
  await d.rpc('trip_action', {
    p_trip: trip.id,
    p_action: 'pickup',
    p_otp: trip.startOtp,
  });
  await d.rpc('trip_action', { p_trip: trip.id, p_action: 'depart' });
  await d.rpc('trip_action', { p_trip: trip.id, p_action: 'reach-drop' });
  const wrong = await d.fn('finish-trip', {
    tripId: trip.id,
    action: 'deliver',
    otp: trip.startOtp,
  });
  assert.equal(wrong.body.error, 'wrong_otp');
  const ok = await d.fn('finish-trip', {
    tripId: trip.id,
    action: 'deliver',
    otp: trip.dropOtp,
  });
  assert.equal(ok.body.status, 'DELIVERED');
  assert.ok(ok.body.lines === undefined && ok.body.fare.lines.some((l: any) => l.code === 'weight' || l.code === 'base'));
});

test('dispatch widens in waves, then cancels when nobody accepts', async () => {
  await clearTrips();
  const rider = await user('Lonely rider');
  const trip = await rider.rpc('request_trip', {
    p_category: 'auto',
    p_pickup: CENTRAL,
    p_dropoff: TNAGAR,
    p_estimate_meters: 7600,
    p_quote: {},
  });
  for (let wave = 0; wave < 5; wave++) {
    await db.pg.query(`update trips set dispatched_at = now() - interval '20 seconds' where id = $1`, [trip.id]);
    await rider.rpc('rider_state');
  }
  const after = await rider.rpc('get_trip', { p_trip: trip.id });
  assert.equal(after.status, 'CANCELLED');
  assert.equal(after.cancelReason, 'no_driver');
});

test('street-hail meter upload is priced on the server and idempotent', async () => {
  const rider = await user('Meter rider');
  const t0 = Date.now() - 3600_000;
  const fixes = simulatedFixes(SIMULATION_ROUTE, t0);
  const body = {
    clientKey: 'meter-0001',
    vehicleNumber: 'tn 09 ab 4821',
    startedAt: t0,
    endedAt: fixes.at(-1)!.timestamp,
    fixes,
  };
  const first = await rider.fn('sync-meter', body);
  assert.equal(first.status, 200, JSON.stringify(first.body));
  assert.equal(first.body.flow, 'meter');
  assert.equal(first.body.vehicleNumber, 'TN 09 AB 4821');
  const expected = calculateFare(getActiveRule('auto', new Date(t0)), {
    distanceMeters: first.body.distanceMeters,
    waitingSeconds: first.body.waitingSeconds,
    rideSeconds: (body.endedAt - t0) / 1000,
    startedAt: t0,
  });
  assert.equal(first.body.totalPaise, expected.totalPaise);
  const again = await rider.fn('sync-meter', body);
  assert.equal(again.body.id, first.body.id);

  await rejects(
    rider.rpc('report_incident', {
      p_kind: 'overcharge',
      p_trip: first.body.id,
      p_asked_paise: first.body.totalPaise,
    }),
    'not_overcharged',
  );
  await rider.rpc('report_incident', {
    p_kind: 'overcharge',
    p_trip: first.body.id,
    p_asked_paise: Math.round(first.body.totalPaise * 1.5),
  });
});

test('department viewers get aggregates only; admin functions stay admin-only', async () => {
  const gov = await user('Department', 'gov');
  const report = await gov.rpc('compliance_report', { p_days: 30 });
  assert.ok(report.overcharge.reports >= 1);
  assert.ok(report.overcharge.avgAskedAbovePct >= 40);
  assert.ok(!JSON.stringify(report).includes('91'), 'no phone numbers in the report');
  await rejects(gov.rpc('admin_overview'), 'forbidden');
  await rejects((await user('Nobody')).rpc('compliance_report', { p_days: 7 }), 'forbidden');
});

test('driver onboarding: validation, approval gate, fees block going online', async () => {
  const admin = await user('Admin', 'admin');
  const d = await user('New driver');
  await rejects(
    d.rpc('register_driver', {
      p_vehicle_number: 'KA 01 1234',
      p_licence_number: 'TN0920190012345',
      p_documents: DOCS,
    }),
    'bad_vehicle_number',
  );
  await rejects(
    d.rpc('register_driver', {
      p_vehicle_number: 'TN 22 CK 7777',
      p_licence_number: 'TN0920190012345',
      p_documents: { licence: 'a' },
    }),
    'documents_missing',
  );
  const me = await d.rpc('register_driver', {
    p_vehicle_number: 'tn22ck7777',
    p_licence_number: 'TN0920190012345',
    p_documents: DOCS,
  });
  assert.equal(me.driver.status, 'pending');
  await rejects(d.rpc('driver_set_online', { p_online: true, p_lat: 13, p_lon: 80 }), 'not_approved');
  await rejects(
    admin.rpc('admin_review_driver', {
      p_driver: d.id,
      p_status: 'rejected',
      p_note: '',
    }),
    'note_required',
  );
  await admin.rpc('admin_review_driver', {
    p_driver: d.id,
    p_status: 'approved',
    p_note: null,
  });
  await db.pg.query(`insert into ledger (driver_id, day, kind, amount_paise) select $1, current_date - g, 'fee', 1000 from generate_series(1, 10) g`, [d.id]);
  await rejects(d.rpc('driver_set_online', { p_online: true, p_lat: 13, p_lon: 80 }), 'fees_due');
});

test('day fee: payment link, signed webhook credits the ledger once', async () => {
  const admin = await user('Admin', 'admin');
  const d = await user('Paying driver');
  await d.rpc('register_driver', {
    p_vehicle_number: 'TN 10 AA 1',
    p_licence_number: 'TN1020190012345',
    p_documents: DOCS,
  });
  await admin.rpc('admin_review_driver', {
    p_driver: d.id,
    p_status: 'approved',
    p_note: null,
  });
  await db.pg.query(`insert into ledger (driver_id, day, kind, amount_paise) values ($1, current_date - 1, 'fee', 1000), ($1, current_date, 'fee', 1000)`, [
    d.id,
  ]);

  const link = await d.fn('fee-payment-link', {});
  assert.equal(link.status, 200, JSON.stringify(link.body));
  assert.equal(link.body.amountPaise, 2000);
  assert.equal(link.body.mode, 'test');

  const raw = JSON.stringify({
    event: 'payment_link.paid',
    payload: {
      payment_link: {
        entity: { reference_id: link.body.paymentId, amount_paid: 2000 },
      },
      payment: { entity: { id: 'pay_1', amount: 2000 } },
    },
  });
  const send = async (sig: string) =>
    app(
      new Request(`${BASE}/functions/v1/razorpay-webhook`, {
        method: 'POST',
        headers: { 'x-razorpay-signature': sig },
        body: raw,
      }),
    );
  assert.equal((await send('deadbeef')).status, 401);
  const sig = await signature('thozhan-dev-webhook-secret', raw);
  assert.equal((await send(sig)).status, 200);
  assert.deepEqual(await (await send(sig)).json(), {
    ok: true,
    duplicate: true,
  });
  assert.equal((await d.rpc('driver_ledger')).balancePaise, 0);
});

test('supabase-js works against the dev backend: phone OTP, RPC, functions, storage', async () => {
  const fetchViaApp: typeof fetch = (input, init) => app(new Request(input as RequestInfo, init));
  const client = createClient(BASE, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchViaApp },
  });

  assert.equal((await client.auth.signInWithOtp({ phone: '+91 98765 43210' })).error, null);
  assert.ok(
    (
      await client.auth.verifyOtp({
        phone: '+919876543210',
        token: '000000',
        type: 'sms',
      })
    ).error,
  );
  const { data, error } = await client.auth.verifyOtp({
    phone: '+919876543210',
    token: DEV_OTP,
    type: 'sms',
  });
  assert.equal(error, null);
  assert.equal(data.user?.phone, '919876543210');

  const profile = await client.rpc('sign_in_profile', { p_locale: 'ta' });
  assert.equal(profile.error, null);
  assert.equal(profile.data.locale, 'ta');
  const failed = await client.rpc('trip_action', {
    p_trip: '00000000-0000-4000-a000-0000000000ff',
    p_action: 'arrive',
  });
  assert.equal(failed.error?.message, 'not_found');

  const id = data.user!.id;
  const up = await client.storage.from('driver-documents').upload(`${id}/licence.jpg`, new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' }));
  assert.equal(up.error, null);
  const other = await client.storage.from('driver-documents').upload(`someone-else/licence.jpg`, new Blob([new Uint8Array([1])]));
  assert.ok(other.error);
  const signed = await client.storage.from('driver-documents').createSignedUrl(`${id}/licence.jpg`, 60);
  assert.equal(signed.error, null);
  const file = await app(new Request(signed.data!.signedUrl));
  assert.deepEqual([...new Uint8Array(await file.arrayBuffer())], [1, 2, 3]);

  const fn = await client.functions.invoke('fee-payment-link', { body: {} });
  assert.ok(fn.error, 'not a driver: no payment link');
});
