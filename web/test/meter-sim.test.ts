import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMeter } from '@thozhan/meter';
import { simulatedFixes } from '../src/meter-session.ts';

test('the demo simulation route measures cleanly, with no tamper flags', () => {
  const meter = createMeter();
  const rejected: number[] = [];
  simulatedFixes(Date.parse('2026-11-04T11:00:00+05:30')).forEach((fix, i) => meter.addFix(fix) || rejected.push(i));
  const reading = meter.snapshot();
  assert.deepEqual(reading.flags, [], `rejected fixes at ${rejected.slice(0, 5).join(', ')}`);
  // 150 s @ 28 + 180 s @ 32 + 240 s @ 26 km/h, clamped to the route length.
  assert.ok(reading.distanceMeters > 3000, String(reading.distanceMeters));
  // Two stops of 75 s and 140 s.
  assert.ok(Math.abs(reading.waitingSeconds - 215) <= 20, String(reading.waitingSeconds));
});
