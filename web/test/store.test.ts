import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeTrip, addCase, cancelActive, createBooking, driverAction, emptyState, parseState, recordMeterTrip, summarize } from '../src/store.ts';
import { estimateRouteMeters } from '../src/places.ts';

const NOW = Date.parse('2026-11-03T10:00:00+05:30');
const rand = () => 0.5;
const ride = { category: 'auto', pickup: 0, drop: 2, payment: 'cash' as const };

test('booking validates places, active trip, departure time and service switches', () => {
  const s = emptyState();
  assert.deepEqual(createBooking(s, { ...ride, drop: 0 }, NOW, rand), { ok: false, error: 'same-place' });
  assert.deepEqual(createBooking(s, { ...ride, departure: '2026-11-03T09:00:00+05:30' }, NOW, rand), { ok: false, error: 'past-departure' });
  assert.deepEqual(createBooking(s, { ...ride, category: 'bike' }, NOW, rand), { ok: false, error: 'disabled' });
  assert.equal(createBooking(s, ride, NOW, rand).ok, true);
  assert.deepEqual(createBooking(s, ride, NOW, rand), { ok: false, error: 'active-trip' });
  s.flags.bike = true;
  assert.equal(s.trips.length, 1);
});

test('auto quote is the G.O. 366 fare for the estimated route', () => {
  const s = emptyState();
  const r = createBooking(s, ride, NOW, rand);
  assert.ok(r.ok);
  const meters = estimateRouteMeters(0, 2);
  const expected = Math.round((5000 + Math.max(0, meters - 1800) * 2.5) / 100) * 100;
  assert.equal(r.trip.fare.totalPaise, expected);
  assert.equal(r.trip.fare.status, 'OFFICIAL');
});

test('ride lifecycle enforces OTP and charges ₹10 once per IST day', () => {
  const s = emptyState();
  createBooking(s, ride, NOW, rand);
  s.online = false;
  assert.deepEqual(driverAction(s, 'accept', null, NOW), { ok: false, error: 'offline' });
  s.online = true;
  assert.equal(driverAction(s, 'accept', null, NOW).ok, true);
  assert.deepEqual(driverAction(s, 'start', null, NOW), { ok: false, error: 'not-allowed' });
  assert.equal(driverAction(s, 'arrive', null, NOW).ok, true);
  assert.deepEqual(driverAction(s, 'start', '0000', NOW), { ok: false, error: 'otp' });
  assert.equal(driverAction(s, 'start', activeTrip(s)!.startOtp, NOW).ok, true);
  assert.equal(driverAction(s, 'complete', null, NOW).ok, true);
  assert.equal(activeTrip(s), undefined);
  assert.deepEqual(s.charges, ['2026-11-03']);

  createBooking(s, ride, NOW + 1000, rand);
  for (const a of ['accept', 'arrive'] as const) driverAction(s, a, null, NOW);
  driverAction(s, 'start', activeTrip(s)!.startOtp, NOW);
  // 23:30 IST is still the same India day even though it is 18:00 UTC.
  driverAction(s, 'complete', null, Date.parse('2026-11-03T23:30:00+05:30'));
  assert.deepEqual(s.charges, ['2026-11-03']);
});

test('parcel needs a weight within the vehicle limit and both OTPs', () => {
  const s = emptyState();
  const parcel = { category: 'parcel-bike', pickup: 0, drop: 1, payment: 'upi' as const };
  assert.deepEqual(createBooking(s, { ...parcel, parcel: { weightGrams: 12000, receiver: 'A' } }, NOW, rand), { ok: false, error: 'weight' });
  const r = createBooking(s, { ...parcel, parcel: { weightGrams: 6000, receiver: 'A' } }, NOW, rand);
  assert.ok(r.ok);
  assert.ok(r.trip.fare.lines.some((l) => l.code === 'weight'));
  driverAction(s, 'accept', null, NOW);
  driverAction(s, 'arrive', null, NOW);
  assert.equal(driverAction(s, 'pickup', r.trip.startOtp, NOW).ok, true);
  driverAction(s, 'depart', null, NOW);
  driverAction(s, 'reach-drop', null, NOW);
  assert.deepEqual(driverAction(s, 'deliver', r.trip.startOtp, NOW), { ok: false, error: 'otp' });
  assert.equal(driverAction(s, 'deliver', r.trip.dropOtp, NOW).ok, true);
  assert.equal(r.trip.status, 'DELIVERED');
});

test('cancel only before the trip starts', () => {
  const s = emptyState();
  createBooking(s, ride, NOW, rand);
  assert.equal(cancelActive(s), true);
  assert.equal(s.trips[0]!.status, 'CANCELLED');
  assert.equal(cancelActive(s), false);
});

test('meter trips and overcharge reports feed the aggregate compliance view', () => {
  const s = emptyState();
  const trip = recordMeterTrip(s, {
    fare: { totalPaise: 13000 } as never,
    distanceMeters: 5000,
    startedAt: NOW,
    endedAt: NOW + 900_000,
    vehicleNumber: 'TN 01 AB 1234',
    flags: [],
  });
  assert.equal(activeTrip(s), undefined);
  addCase(s, { trip: trip.id, kind: 'overcharge', askedPaise: 20000, meterPaise: 13000, created: NOW });
  addCase(s, { trip: trip.id, kind: 'safety', askedPaise: null, meterPaise: null, created: NOW });
  const sum = summarize(s);
  assert.equal(sum.meterTrips, 1);
  assert.equal(sum.overchargeReports, 1);
  assert.equal(sum.averageOverchargePercent, 54);
  assert.equal(sum.grossPaise, 0);
});

test('stored state round-trips and old or corrupt data starts fresh', () => {
  const s = emptyState();
  createBooking(s, ride, NOW, rand);
  assert.equal(parseState(JSON.stringify(s)).trips.length, 1);
  assert.deepEqual(parseState('{"trips":[]}'), emptyState());
  assert.deepEqual(parseState('not json'), emptyState());
  const legacy = JSON.parse(JSON.stringify(s));
  delete legacy.flags;
  assert.equal(parseState(JSON.stringify(legacy)).flags.auto, true);
});
