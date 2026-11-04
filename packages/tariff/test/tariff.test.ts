import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TARIFF_RULES, calculateFare, getActiveRule, istMinuteOfDay, validateRule } from '../src/index.ts';

const auto = getActiveRule('auto', new Date('2026-11-03T12:00:00+05:30'));
const DAY = '2026-11-03T10:00:00+05:30';
const NIGHT = '2026-11-03T23:00:00+05:30';
const km = (n: number) => Math.round(n * 1000);
const rupees = (b: { totalPaise: number }) => b.totalPaise / 100;

test('G.O. 366 auto: minimum fare covers the first 1.8 km', () => {
  assert.equal(rupees(calculateFare(auto, { distanceMeters: 0, startedAt: DAY })), 50);
  assert.equal(rupees(calculateFare(auto, { distanceMeters: km(1), startedAt: DAY })), 50);
  assert.equal(rupees(calculateFare(auto, { distanceMeters: km(1.8), startedAt: DAY })), 50);
});

test('G.O. 366 auto: ₹25 per additional km (plan worked example 5 km = ₹130)', () => {
  const fare = calculateFare(auto, { distanceMeters: km(5), startedAt: DAY });
  assert.equal(rupees(fare), 130);
  assert.deepEqual(
    fare.lines.map((l) => [l.code, l.amountPaise]),
    [['base', 5000], ['distance', 8000]],
  );
});

test('G.O. 366 auto: ₹1 per completed waiting minute', () => {
  assert.equal(rupees(calculateFare(auto, { distanceMeters: km(5), waitingSeconds: 6 * 60, startedAt: DAY })), 136);
  assert.equal(rupees(calculateFare(auto, { distanceMeters: km(5), waitingSeconds: 59, startedAt: DAY })), 130);
  assert.equal(rupees(calculateFare(auto, { distanceMeters: km(5), waitingSeconds: 6 * 60 + 59, startedAt: DAY })), 136);
});

test('G.O. 366 auto: night 10 PM – 5 AM is 1.5x', () => {
  assert.equal(rupees(calculateFare(auto, { distanceMeters: km(5), startedAt: NIGHT })), 195);
  const withWait = calculateFare(auto, { distanceMeters: km(5), waitingSeconds: 360, startedAt: NIGHT });
  assert.equal(rupees(withWait), 204);
  assert.equal(withWait.night, true);
});

test('night window boundaries are evaluated in IST regardless of host time zone', () => {
  const night = (iso: string) => calculateFare(auto, { distanceMeters: 0, startedAt: iso }).night;
  assert.equal(night('2026-11-03T21:59:00+05:30'), false);
  assert.equal(night('2026-11-03T22:00:00+05:30'), true);
  assert.equal(night('2026-11-04T04:59:00+05:30'), true);
  assert.equal(night('2026-11-04T05:00:00+05:30'), false);
  assert.equal(istMinuteOfDay('2026-11-03T16:30:00Z'), 22 * 60);
});

test('G.O. 366 auto: ghat fare ₹60 base, ₹30 per additional km', () => {
  const fare = calculateFare(auto, { distanceMeters: km(5), startedAt: DAY, terrain: 'ghat' });
  assert.equal(rupees(fare), 156);
  assert.equal(fare.terrain, 'ghat');
});

test('partial kilometres are proportional, then rounded to the nearest rupee', () => {
  const fare = calculateFare(auto, { distanceMeters: 2370, startedAt: DAY });
  // 50 + 0.57 km × 25 = 64.25 → 64
  assert.equal(fare.totalPaise, 6400);
  assert.deepEqual(fare.lines.at(-1), { code: 'rounding', amountPaise: -25 });
});

test('auto is OFFICIAL but not verified for billing while interpretations are unconfirmed', () => {
  const fare = calculateFare(auto, { distanceMeters: km(3), startedAt: DAY });
  assert.equal(fare.status, 'OFFICIAL');
  assert.match(fare.legalReference ?? '', /G\.O\. Ms\. No\. 366/);
  assert.ok(fare.assumptions.includes('rounding-nearest-rupee'));
  assert.equal(fare.verifiedForBilling, false);

  // Only interpretations that affect this trip are listed.
  assert.deepEqual(fare.assumptions, ['rounding-nearest-rupee', 'night-by-start-time']);
  const nightGhat = calculateFare(auto, { distanceMeters: km(3), waitingSeconds: 120, startedAt: NIGHT, terrain: 'ghat' });
  assert.equal(nightGhat.assumptions.length, 5);

  const confirmed = { ...auto, assumptions: auto.assumptions.map((a) => ({ ...a, confirmed: true })) };
  assert.equal(calculateFare(confirmed, { distanceMeters: km(3), startedAt: DAY }).verifiedForBilling, true);
});

test('rejects invalid input', () => {
  assert.throws(() => calculateFare(auto, { distanceMeters: -1, startedAt: DAY }), RangeError);
  assert.throws(() => calculateFare(auto, { distanceMeters: 1, startedAt: 'not a date' }), RangeError);
  assert.throws(() => calculateFare(getActiveRule('bike'), { distanceMeters: 1, startedAt: DAY, terrain: 'ghat' }), RangeError);
});

test('cab: ride-time charge and minimum fare top-up', () => {
  const mini = getActiveRule('cab-mini');
  const short = calculateFare(mini, { distanceMeters: km(1), rideSeconds: 180, startedAt: DAY });
  assert.equal(rupees(short), 120);
  assert.equal(short.lines.find((l) => l.code === 'minimum_fare_topup')?.amountPaise, 1550);

  const long = calculateFare(mini, { distanceMeters: km(10), rideSeconds: 1500, startedAt: DAY });
  // 100 + 8 km × 20 + 25 min × 1.5 = 297.5 → 298
  assert.equal(rupees(long), 298);
  assert.equal(long.verifiedForBilling, false);
});

test('parcel: weight slabs and maximum weight', () => {
  const bike = getActiveRule('parcel-bike');
  assert.equal(rupees(calculateFare(bike, { distanceMeters: km(4), weightGrams: 2000, startedAt: DAY })), 60);
  assert.equal(rupees(calculateFare(bike, { distanceMeters: km(4), weightGrams: 6000, startedAt: DAY })), 80);
  assert.throws(() => calculateFare(bike, { distanceMeters: km(4), weightGrams: 10001, startedAt: DAY }), RangeError);

  const autoParcel = getActiveRule('parcel-auto');
  const heavy = calculateFare(autoParcel, { distanceMeters: km(2), weightGrams: 30000, startedAt: DAY });
  assert.equal(heavy.lines.find((l) => l.code === 'weight')?.amountPaise, 6000);
});

test('registry: every rule validates and only dated rules apply before their start', () => {
  assert.deepEqual(TARIFF_RULES.flatMap(validateRule), []);
  assert.throws(() => getActiveRule('auto', new Date('2026-10-26T12:00:00+05:30')), RangeError);
  assert.equal(getActiveRule('auto', new Date('2026-10-27T00:30:00+05:30')).id, 'tn-auto-2026');
  for (const category of ['bike', 'cab-mini', 'cab-sedan', 'cab-suv', 'parcel-bike', 'parcel-auto']) {
    assert.equal(getActiveRule(category).status, 'ILLUSTRATIVE', category);
  }
  assert.ok(validateRule({ ...auto, legalReference: null }).length > 0);
});
