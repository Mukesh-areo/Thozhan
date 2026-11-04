import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TARIFF_RULES } from '@thozhan/tariff';
import { CATEGORIES, MACHINES, availableActions, enabledCategories, getCategory, isTerminal, transition, type TripAction, type TripStatus } from '../src/index.ts';

test('every category has a tariff rule, and every rule a category', () => {
  const categoryIds = CATEGORIES.map((c) => c.id).sort();
  assert.deepEqual([...new Set(TARIFF_RULES.map((r) => r.category))].sort(), categoryIds);
  for (const c of CATEGORIES) {
    for (const r of TARIFF_RULES.filter((r) => r.category === c.id)) assert.equal(r.service, c.service, c.id);
  }
});

test('parcel weight limits agree with the tariff', () => {
  for (const c of CATEGORIES.filter((c) => c.parcel)) {
    const rule = TARIFF_RULES.find((r) => r.category === c.id)!;
    assert.equal(c.parcel!.maxWeightGrams, rule.maxWeightGrams, c.id);
  }
});

test('only auto is on by default; flags enable the rest', () => {
  assert.deepEqual(enabledCategories().map((c) => c.id), ['auto']);
  assert.deepEqual(enabledCategories({ 'cab-sedan': true, auto: false }).map((c) => c.id), ['cab-sedan']);
  assert.throws(() => getCategory('helicopter'), RangeError);
});

function drive(flow: 'ride' | 'meter' | 'delivery', steps: [TripAction, 'rider' | 'driver'][], satisfied: ('start-otp' | 'drop-otp')[] = ['start-otp', 'drop-otp']) {
  let status: TripStatus = MACHINES[flow].initial;
  for (const [action, actor] of steps) {
    const r = transition(flow, status, action, { actor, satisfied });
    assert.ok(r.ok, `${flow} ${status} --${action}--> ${JSON.stringify(r)}`);
    status = r.status;
  }
  return status;
}

test('ride flow happy path ends COMPLETED', () => {
  const end = drive('ride', [['accept', 'driver'], ['arrive', 'driver'], ['start', 'driver'], ['complete', 'driver']]);
  assert.equal(end, 'COMPLETED');
  assert.ok(isTerminal('ride', end));
});

test('ride start requires the OTP; rider cannot accept; no cancel once started', () => {
  assert.deepEqual(transition('ride', 'ARRIVED', 'start', { actor: 'driver' }), { ok: false, reason: 'guard', missing: ['start-otp'] });
  assert.equal(transition('ride', 'REQUESTED', 'accept', { actor: 'rider' }).ok, false);
  assert.deepEqual(transition('ride', 'IN_PROGRESS', 'cancel', { actor: 'rider' }), { ok: false, reason: 'wrong-state' });
  assert.deepEqual(transition('ride', 'REQUESTED', 'deliver', { actor: 'driver' }), { ok: false, reason: 'invalid-action' });
});

test('meter flow can pause and resume, and rider can finish it', () => {
  assert.equal(drive('meter', [['pause', 'rider'], ['resume', 'rider'], ['complete', 'rider']]), 'COMPLETED');
});

test('delivery flow needs pickup and drop OTPs', () => {
  const steps: [TripAction, 'driver'][] = [['accept', 'driver'], ['arrive', 'driver'], ['pickup', 'driver'], ['depart', 'driver'], ['reach-drop', 'driver'], ['deliver', 'driver']];
  assert.equal(drive('delivery', steps), 'DELIVERED');
  assert.deepEqual(transition('delivery', 'AT_DROP', 'deliver', { actor: 'driver', satisfied: ['start-otp'] }), { ok: false, reason: 'guard', missing: ['drop-otp'] });
  assert.deepEqual(transition('delivery', 'AT_DROP', 'deliver', { actor: 'driver', disabledGuards: ['drop-otp'] }), { ok: true, status: 'DELIVERED' });
  assert.equal(transition('delivery', 'IN_TRANSIT', 'return', { actor: 'driver' }).ok, true);
});

test('availableActions lists what each actor can do', () => {
  assert.deepEqual(availableActions('ride', 'REQUESTED', 'driver'), ['accept', 'cancel']);
  assert.deepEqual(availableActions('ride', 'REQUESTED', 'rider'), ['cancel']);
  assert.deepEqual(availableActions('ride', 'COMPLETED', 'driver'), []);
});
