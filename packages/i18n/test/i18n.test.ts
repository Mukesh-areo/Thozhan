import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateFare, getActiveRule, TARIFF_RULES } from '@thozhan/tariff';
import { CATEGORIES, MACHINES } from '@thozhan/shared';
import { CATALOGS, formatKm, formatMoney, missingKeys, pickLocale, t } from '../src/index.ts';

test('Tamil and English catalogues have identical keys', () => {
  assert.deepEqual(missingKeys(), { ta: [], en: [] });
});

test('Tamil strings are actually Tamil, not copied English', () => {
  const tamilScript = /[஀-௿]/;
  // The language switch is labelled in the language it switches to.
  const exempt = new Set(['ui.otherLanguage']);
  const untranslated = Object.entries(CATALOGS.ta).filter(([k, v]) => !exempt.has(k) && !tamilScript.test(v)).map(([k]) => k);
  assert.deepEqual(untranslated, []);
});

test('every code the domain packages emit has a translation', () => {
  const keys = new Set(Object.keys(CATALOGS.en));
  const needed = [
    ...CATEGORIES.map((c) => c.nameKey),
    ...CATEGORIES.flatMap((c) => c.parcel?.restrictedItemKeys ?? []),
    ...TARIFF_RULES.flatMap((r) => r.assumptions.map((a) => `tariff.assumption.${a.code}`)),
    ...TARIFF_RULES.map((r) => `tariff.status.${r.status}`),
    ...Object.values(MACHINES).flatMap((m) => [m.initial, ...m.terminal].map((s) => `trip.status.${s}`)),
    ...Object.values(MACHINES).flatMap((m) => Object.keys(m.transitions).map((a) => `trip.action.${a}`)),
    ...['base', 'distance', 'ride_time', 'waiting', 'night', 'weight', 'booking_fee', 'minimum_fare_topup', 'rounding'].map((c) => `fare.line.${c}`),
    ...['gps-gap', 'speed-jump', 'clock-skew', 'mock-location', 'low-accuracy'].map((f) => `meter.flag.${f}`),
  ];
  assert.deepEqual(needed.filter((k) => !keys.has(k)), []);
});

test('placeholders are filled, unknown keys fall back visibly', () => {
  assert.equal(t('ta', 'fare.line.waiting', { minutes: 6 }), 'காத்திருப்பு (6 நிமி.)');
  assert.equal(t('en', 'fare.line.base', { km: 1.8 }), 'Minimum fare (first 1.8 km)');
  assert.equal(t('en', 'otp.label'), 'Trip OTP: {otp}');
  assert.equal(t('ta', 'no.such.key'), 'no.such.key');
});

test('money and distance formatting', () => {
  assert.equal(formatMoney(13000, 'en'), '₹130');
  assert.equal(formatMoney(123456700, 'en'), '₹12,34,567');
  assert.equal(formatMoney(6425, 'en'), '₹64.25');
  assert.match(formatMoney(13000, 'ta'), /130/);
  assert.equal(formatKm(3200, 'en'), '3.2');
});

test('locale choice is Tamil first', () => {
  assert.equal(pickLocale(['ta-IN', 'en-US']), 'ta');
  assert.equal(pickLocale(['en-IN']), 'en');
  assert.equal(pickLocale([]), 'ta');
});

test('a full bilingual receipt can be rendered from a fare breakdown', () => {
  const fare = calculateFare(getActiveRule('auto', new Date('2026-11-03T12:00:00+05:30')), {
    distanceMeters: 5000,
    waitingSeconds: 360,
    startedAt: '2026-11-03T23:00:00+05:30',
  });
  const receipt = fare.lines.map((l) => `${t('ta', `fare.line.${l.code}`, { km: formatKm(l.detail?.meters ?? 0, 'ta'), minutes: l.detail?.minutes ?? 0 })}: ${formatMoney(l.amountPaise, 'ta')}`);
  assert.equal(receipt.length, 4);
  assert.ok(receipt[0]!.startsWith('குறைந்தபட்சக் கட்டணம் (முதல் 1.8 கி.மீ.)'));
  assert.ok(receipt[3]!.startsWith('இரவுக் கட்டணம்'));
});
