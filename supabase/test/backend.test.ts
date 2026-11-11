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
  pollution: 'x/pu.jpg',
  fitness: 'x/f.jpg',
  photo: 'x/ph.jpg',
};
const VALID = '2030-12-31';
const EXPIRY = { licence: VALID, permit: VALID, insurance: VALID, pollution: VALID, fitness: VALID };
const SAFETY = { onePassenger: true, helmet: true, noLuggage: true, conditions: true };
const PARCEL = { receiverName: 'Meena', receiverPhone: '9876543210', weightGrams: 2000, category: 'documents', prohibitedAck: true };

/** Stores a parcel photo the way the app does and records it on the trip. */
async function parcelPhoto(d: User, tripId: string, stage: 'pickup' | 'delivery') {
  return d.rpc('set_parcel_proof', { p_trip: tripId, p_stage: stage, p_path: `${d.id}/parcel/${tripId}-${stage}.jpg` });
}
let plates = 1000;
async function driver(name: string, at: [number, number], admin: User, vehicle = 'auto'): Promise<User> {
  const d = await user(name);
  await d.rpc('register_driver', {
    p_vehicle_number: `TN 09 AB ${plates++}`,
    p_licence_number: 'TN0920190012345',
    p_documents: DOCS,
    p_vehicle: vehicle,
    p_expiry: EXPIRY,
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
      p_parcel: { ...PARCEL, receiverName: '' },
    }),
    'receiver_required',
  );
  await rejects(
    sender.rpc('request_trip', {
      ...base,
      p_parcel: { ...PARCEL, weightGrams: 90000 },
    }),
    'bad_weight',
  );
  await rejects(sender.rpc('request_trip', { ...base, p_parcel: { ...PARCEL, prohibitedAck: false } }), 'prohibited_ack_required');
  await rejects(sender.rpc('request_trip', { ...base, p_parcel: { ...PARCEL, category: 'fireworks' } }), 'bad_item');
  const trip = await sender.rpc('request_trip', {
    ...base,
    p_parcel: { ...PARCEL, weightGrams: 3000 },
  });
  assert.equal(trip.flow, 'delivery');
  assert.notEqual(trip.startOtp, trip.dropOtp);

  const inbox = await d.rpc('driver_inbox');
  assert.equal(inbox.offers[0].trip.parcel.receiverPhone, undefined, 'driver sees no receiver phone before delivery');
  await d.rpc('accept_offer', { p_offer: inbox.offers[0].id });
  await d.rpc('trip_action', { p_trip: trip.id, p_action: 'arrive' });
  await rejects(d.rpc('trip_action', { p_trip: trip.id, p_action: 'pickup', p_otp: trip.startOtp }), 'photo_required');
  await parcelPhoto(d, trip.id, 'pickup');
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
  const noPhoto = await d.fn('finish-trip', { tripId: trip.id, action: 'deliver', otp: trip.dropOtp });
  assert.equal(noPhoto.body.error, 'photo_required');
  await parcelPhoto(d, trip.id, 'delivery');
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
      p_documents: DOCS, p_expiry: EXPIRY,
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
    p_documents: DOCS, p_expiry: EXPIRY,
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
    p_documents: DOCS, p_expiry: EXPIRY,
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

test('every vehicle type is offered only to drivers of that vehicle', async () => {
  await clearTrips();
  await db.pg.exec(`update service_flags set enabled = true`);
  const admin = await user('Admin', 'admin');
  const drivers = new Map<string, User>();
  for (const vehicle of ['auto', 'bike', 'scooter', 'cab-mini', 'cab-sedan', 'cab-suv']) {
    drivers.set(vehicle, await driver(`Driver ${vehicle}`, [13.084, 80.271], admin, vehicle));
  }
  const rider = await user('Rider');
  const parcel = PARCEL;

  for (const [category, vehicle] of [
    ['auto', 'auto'],
    ['bike', 'bike'],
    ['scooter', 'scooter'],
    ['cab-mini', 'cab-mini'],
    ['cab-sedan', 'cab-sedan'],
    ['cab-suv', 'cab-suv'],
    ['parcel-auto', 'auto'],
    ['parcel-bike', 'bike'],
    ['parcel-scooter', 'scooter'],
  ] as const) {
    const trip = await rider.rpc('request_trip', {
      p_category: category,
      p_pickup: CENTRAL,
      p_dropoff: TNAGAR,
      p_estimate_meters: 7600,
      p_quote: {},
      p_client_key: `k-vehicle-${category}`,
      ...(category.startsWith('parcel') ? { p_parcel: parcel } : {}),
      ...(category === 'bike' || category === 'scooter' ? { p_options: { safety: SAFETY } } : {}),
    });
    for (const [own, d] of drivers) {
      const { offers } = await d.rpc('driver_inbox');
      const got = offers.filter((o: { trip: { id: string } }) => o.trip.id === trip.id).length;
      assert.equal(got, own === vehicle ? 1 : 0, `${category} offered to the ${own} driver: ${got}`);
    }
    await db.pg.exec(`update trips set status = 'CANCELLED', ended_at = now() where is_open(status); update offers set status = 'expired' where status = 'offered'`);
  }

  const scooterOnly = await user('Unknown vehicle');
  await rejects(
    scooterOnly.rpc('register_driver', { p_vehicle_number: 'TN 09 AB 7777', p_licence_number: 'TN0920190012345', p_documents: DOCS, p_expiry: EXPIRY, p_vehicle: 'tractor' }),
    'bad_vehicle',
  );
  await clearTrips();
});

test('UX handoff rules: account type, bike safety, cancel reasons, ratings, payment, contacts, support, documents', async () => {
  await clearTrips();
  await db.pg.exec(`update service_flags set enabled = true`);
  const admin = await user('Admin', 'admin');

  // One number, one account type, chosen at login.
  const rider = await user('Kavya');
  assert.equal((await rider.rpc('set_account_type', { p_type: 'passenger' })).accountType, 'passenger');
  await rejects(rider.rpc('set_account_type', { p_type: 'driver' }), 'account_type_locked');
  await rejects(
    rider.rpc('register_driver', { p_vehicle_number: 'TN 09 AB 4242', p_licence_number: 'TN0920190012345', p_documents: DOCS, p_expiry: EXPIRY }),
    'passenger_account',
  );
  const bikeDriver = await driver('Bike driver', [13.084, 80.271], admin, 'bike');
  assert.equal((await bikeDriver.rpc('me')).accountType, 'driver');
  const trip = { p_pickup: CENTRAL, p_dropoff: TNAGAR, p_estimate_meters: 7600, p_quote: {} };
  await rejects(bikeDriver.rpc('request_trip', { ...trip, p_category: 'auto', p_client_key: 'k-ux-driver' }), 'driver_account');

  // Every paper's validity date is checked: missing or past dates are refused.
  const late = await user('Late papers');
  await rejects(
    late.rpc('register_driver', { p_vehicle_number: 'TN 09 AB 4243', p_licence_number: 'TN0920190012345', p_documents: DOCS, p_expiry: { ...EXPIRY, permit: '2020-01-01' } }),
    'document_expired',
  );
  await rejects(
    late.rpc('register_driver', { p_vehicle_number: 'TN 09 AB 4243', p_licence_number: 'TN0920190012345', p_documents: DOCS, p_expiry: { licence: VALID } }),
    'expiry_required',
  );

  // Bike rides need the passenger's safety checks; pickup notes stay short.
  await rejects(rider.rpc('request_trip', { ...trip, p_category: 'bike', p_client_key: 'k-ux-1' }), 'safety_checks_required');
  await rejects(
    rider.rpc('request_trip', { ...trip, p_category: 'bike', p_client_key: 'k-ux-2', p_options: { safety: { ...SAFETY, helmet: false } } }),
    'safety_checks_required',
  );
  await rejects(
    rider.rpc('request_trip', { ...trip, p_category: 'auto', p_client_key: 'k-ux-3', p_options: { pickupNote: 'x'.repeat(141) } }),
    'note_too_long',
  );
  const ride = await rider.rpc('request_trip', {
    ...trip,
    p_category: 'bike',
    p_client_key: 'k-ux-4',
    p_options: { safety: SAFETY, pickupNote: 'Near the temple gate' },
  });
  assert.equal(ride.options.pickupNote, 'Near the temple gate');
  const { offers } = await bikeDriver.rpc('driver_inbox');
  assert.equal(offers[0].trip.options.pickupNote, 'Near the temple gate', 'the driver sees the pickup note');
  await bikeDriver.rpc('accept_offer', { p_offer: offers[0].id });
  await bikeDriver.rpc('trip_action', { p_trip: ride.id, p_action: 'arrive' });

  // "Passenger not found" only after 5 minutes at the pickup, and only by the driver.
  await rejects(bikeDriver.rpc('cancel_trip', { p_trip: ride.id, p_reason: 'no_show' }), 'wait_for_passenger');
  await rejects(rider.rpc('cancel_trip', { p_trip: ride.id, p_reason: 'no_show' }), 'wait_for_passenger');
  await rejects(rider.rpc('cancel_trip', { p_trip: ride.id, p_reason: 'bored' }), 'bad_reason');
  await db.pg.query(`update trips set arrived_at = now() - interval '6 minutes' where id = $1`, [ride.id]);
  const cancelled = await bikeDriver.rpc('cancel_trip', { p_trip: ride.id, p_reason: 'no_show' });
  assert.equal(cancelled.status, 'CANCELLED');
  assert.equal(cancelled.cancelDetail, 'no_show');

  // Ratings both ways and the payment record, once a trip is finished.
  const done = await rider.rpc('request_trip', { ...trip, p_category: 'bike', p_client_key: 'k-ux-5', p_options: { safety: SAFETY } });
  const second = await bikeDriver.rpc('driver_inbox');
  await bikeDriver.rpc('accept_offer', { p_offer: second.offers[0].id });
  await rejects(rider.rpc('rate_trip', { p_trip: done.id, p_stars: 5 }), 'wrong_state');
  await db.pg.query(`update trips set status = 'COMPLETED', ended_at = now() where id = $1`, [done.id]);
  await rejects(rider.rpc('rate_trip', { p_trip: done.id, p_stars: 6 }), 'bad_rating');
  const rated = await rider.rpc('rate_trip', { p_trip: done.id, p_stars: 5, p_tags: ['safe_driving', 'polite'] });
  assert.deepEqual(rated.myRating, { stars: 5, tags: ['safe_driving', 'polite'] });
  await bikeDriver.rpc('rate_trip', { p_trip: done.id, p_stars: 4, p_tags: ['on_time'] });
  assert.deepEqual((await bikeDriver.rpc('me')).rating, { average: 5, count: 1 });
  assert.deepEqual((await rider.rpc('me')).rating, { average: 4, count: 1 });
  await rejects(bikeDriver.rpc('confirm_payment', { p_trip: done.id, p_method: 'card' }), 'bad_payment_method');
  assert.equal((await bikeDriver.rpc('confirm_payment', { p_trip: done.id, p_method: 'upi' })).paidVia, 'upi');
  const perf = await bikeDriver.rpc('driver_performance');
  assert.equal(perf.completed, 1);
  assert.equal(perf.compliments.safe_driving, 1);

  // Trusted contacts: valid numbers, at most five.
  await rejects(rider.rpc('add_contact', { p_name: 'Amma', p_phone: '12345' }), 'bad_phone');
  for (let i = 0; i < 5; i++) await rider.rpc('add_contact', { p_name: `Contact ${i}`, p_phone: `98765432${10 + i}` });
  await rejects(rider.rpc('add_contact', { p_name: 'Sixth', p_phone: '9876543299' }), 'too_many_contacts');
  const contacts = await rider.rpc('my_contacts');
  assert.equal(contacts.length, 5);
  assert.equal((await rider.rpc('remove_contact', { p_id: contacts[0].id })).length, 4);

  // Support tickets, account deletion and the data export.
  await rejects(rider.rpc('create_ticket', { p_category: 'fare', p_body: 'short' }), 'describe_more');
  const ticket = await rider.rpc('create_ticket', { p_category: 'lost_item', p_body: 'Left my umbrella in the bike.', p_trip: done.id });
  assert.match(ticket.code, /^TZ-S-/);
  assert.equal(ticket.trip.code, done.code);
  await rider.rpc('request_account_deletion', { p_reason: null });
  await rejects(rider.rpc('request_account_deletion', { p_reason: null }), 'already_requested');
  const replied = await admin.rpc('admin_reply_ticket', { p_ticket: ticket.id, p_reply: 'Found it. Collect it from the driver.', p_close: false });
  assert.equal(replied.status, 'answered');
  assert.equal((await rider.rpc('my_tickets')).length, 2);
  const data = await rider.rpc('export_my_data');
  assert.equal(data.contacts.length, 4);
  assert.equal(data.tickets.length, 2);
  assert.equal(data.ratingsGiven[0].stars, 5);
  await rejects(bikeDriver.rpc('admin_tickets', { p_status: null }), 'forbidden');

  // An expired paper keeps the driver offline until it is renewed.
  await db.pg.query(`update drivers set document_expiry = document_expiry || jsonb_build_object('insurance', '2020-01-01') where id = $1`, [bikeDriver.id]);
  assert.deepEqual((await bikeDriver.rpc('me')).driver.expiredDocuments, ['insurance']);
  await rejects(bikeDriver.rpc('driver_set_online', { p_online: true, p_lat: 13.084, p_lon: 80.271 }), 'document_expired');
  await rejects(bikeDriver.rpc('renew_document', { p_doc: 'insurance', p_path: `${bikeDriver.id}/insurance-2.jpg`, p_expiry: null }), 'expiry_required');
  await rejects(bikeDriver.rpc('renew_document', { p_doc: 'fitness', p_path: `${bikeDriver.id}/f.jpg`, p_expiry: VALID }), 'bad_document');
  const renewed = await bikeDriver.rpc('renew_document', { p_doc: 'insurance', p_path: `${bikeDriver.id}/insurance-2.jpg`, p_expiry: VALID });
  assert.deepEqual(renewed.driver.expiredDocuments, []);
  await bikeDriver.rpc('driver_set_online', { p_online: true, p_lat: 13.084, p_lon: 80.271 });
  await clearTrips();
});
