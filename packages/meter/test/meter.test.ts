import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getActiveRule } from '@thozhan/tariff';
import { createMeter, haversineMeters, meterFare, type GpsFix } from '../src/index.ts';

// Chennai Central, at 10:00 IST on 3 Nov 2026.
const ORIGIN = { lat: 13.0827, lon: 80.2707 };
const T0 = Date.parse('2026-11-03T10:00:00+05:30');
const M_PER_DEG_LAT = 111195;

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

/** Build a 1 Hz track from legs of [seconds, speed km/h], heading north, with GPS noise. */
function track(legs: [number, number][], noiseMeters = 4, seed = 7): GpsFix[] {
  const rand = rng(seed);
  const fixes: GpsFix[] = [];
  let north = 0;
  let t = 0;
  for (const [seconds, kmh] of legs) {
    for (let i = 0; i < seconds; i++) {
      fixes.push({
        lat: ORIGIN.lat + (north + (rand() - 0.5) * 2 * noiseMeters) / M_PER_DEG_LAT,
        lon: ORIGIN.lon + ((rand() - 0.5) * 2 * noiseMeters) / (M_PER_DEG_LAT * Math.cos((ORIGIN.lat * Math.PI) / 180)),
        accuracyMeters: 8,
        timestamp: T0 + t * 1000,
      });
      north += kmh / 3.6;
      t++;
    }
  }
  return fixes;
}

function run(fixes: GpsFix[]) {
  const meter = createMeter();
  fixes.forEach((f) => meter.addFix(f));
  return meter.snapshot();
}

test('haversine: 0.01° latitude is about 1.11 km', () => {
  const d = haversineMeters(ORIGIN, { lat: ORIGIN.lat + 0.01, lon: ORIGIN.lon });
  assert.ok(Math.abs(d - 1112) < 2, String(d));
});

test('5 km at 30 km/h with GPS noise measures within 2%', () => {
  const reading = run(track([[600, 30]]));
  assert.ok(Math.abs(reading.distanceMeters - 5000) / 5000 < 0.02, String(reading.distanceMeters));
  assert.equal(reading.waitingSeconds, 0);
});

test('stationary jitter does not add distance; a 5-minute stop is waiting', () => {
  const reading = run(track([[300, 0]], 6));
  assert.ok(reading.distanceMeters < 40, String(reading.distanceMeters));
  assert.ok(Math.abs(reading.waitingSeconds - 299) <= 2, String(reading.waitingSeconds));
});

test('stops shorter than 60 s are not charged as waiting', () => {
  const reading = run(track([[120, 30], [45, 0], [120, 30]]));
  assert.equal(reading.waitingSeconds, 0);
});

test('low-accuracy, mock and teleport fixes are rejected and flagged', () => {
  const meter = createMeter();
  const fixes = track([[60, 20]]);
  fixes.forEach((f) => meter.addFix(f));
  const before = meter.snapshot().distanceMeters;
  const last = fixes.at(-1)!;
  assert.equal(meter.addFix({ ...last, timestamp: last.timestamp + 1000, accuracyMeters: 80 }), false);
  assert.equal(meter.addFix({ ...last, timestamp: last.timestamp + 2000, isMock: true }), false);
  assert.equal(meter.addFix({ ...last, lat: last.lat + 0.05, timestamp: last.timestamp + 3000 }), false);
  assert.equal(meter.addFix({ ...last, timestamp: last.timestamp - 5000 }), false);
  const after = meter.snapshot();
  assert.equal(after.distanceMeters, before);
  assert.deepEqual(after.flags, ['clock-skew', 'low-accuracy', 'mock-location', 'speed-jump']);
  assert.equal(after.rejectedFixes, 4);
});

test('a long GPS gap is flagged but distance is kept', () => {
  const meter = createMeter();
  meter.addFix({ ...ORIGIN, accuracyMeters: 5, timestamp: T0 });
  meter.addFix({ lat: ORIGIN.lat + 1000 / M_PER_DEG_LAT, lon: ORIGIN.lon, accuracyMeters: 5, timestamp: T0 + 120_000 });
  const reading = meter.snapshot();
  // The smoothed position trails the last fix slightly; within GPS accuracy.
  assert.ok(Math.abs(reading.distanceMeters - 1000) < 25, String(reading.distanceMeters));
  assert.deepEqual(reading.flags, ['gps-gap']);
});

test('street-hail auto trip: 5 km plus a 6-minute stop ≈ ₹136 under G.O. 366', () => {
  const reading = run(track([[300, 30], [360, 0], [300, 30]]));
  const fare = meterFare(getActiveRule('auto', new Date(T0)), reading);
  assert.ok(Math.abs(fare.totalPaise - 13600) <= 200, `${fare.totalPaise} paise, ${reading.distanceMeters} m, ${reading.waitingSeconds} s`);
  // Smoothing lag around the stop can trim a few seconds of waiting.
  assert.ok(Math.abs(reading.waitingSeconds - 360) <= 15, String(reading.waitingSeconds));
  assert.equal(fare.night, false);
});

test('meterFare refuses a meter with no usable fix', () => {
  assert.throws(() => meterFare(getActiveRule('auto', new Date(T0)), createMeter().snapshot()), RangeError);
});
