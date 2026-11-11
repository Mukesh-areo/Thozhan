// Smoke test: runs the built web/app.js against DOM stubs and drives a ride and a parcel
// delivery end to end. Logic is unit tested in web/test/store.test.ts.
const vm = require('node:vm'),
  fs = require('node:fs'),
  assert = require('node:assert/strict');
const nodes = new Map();
const node = (s) => {
  if (!nodes.has(s))
    nodes.set(s, {
      innerHTML: '',
      textContent: '',
      value: '',
      style: {},
      dataset: {},
      addEventListener() {},
      showModal() {},
      close() {},
    });
  return nodes.get(s);
};
let saved;
const ctx = vm.createContext({
  console,
  localStorage: { getItem: () => null, setItem: (k, v) => k === 'thozhan-v2' && (saved = v) },
  document: { querySelector: node, querySelectorAll: () => [], createElement: () => ({ click() {} }) },
  setTimeout: () => {},
  navigator: { languages: ['en-IN'] },
  Blob,
  URL,
  Intl,
  Date,
  Math,
});
vm.runInContext(fs.readFileSync(__dirname + '/app.js', 'utf8'), ctx);
const demo = vm.runInContext('thozhanDemo', ctx);
// The action name documents the expected step; the app derives it from trip state.
const click = (id, _action) => node('#' + id).onclick();

assert.match(node('#app').innerHTML, /Where are we going today/);
assert.match(node('#app').innerHTML, /Government-notified tariff/);

// Ride: duplicate booking is ignored, wrong OTP rejected, completion charges the day once.
for (let i = 0; i < 2; i++) {
  demo.go('ride');
  click('book');
  click('book');
  assert.equal(demo.state.trips.length, i + 1);
  demo.go('driver');
  click('advance', 'accept');
  assert.equal(demo.active().status, 'ACCEPTED');
  click('advance', 'arrive');
  assert.equal(demo.active().status, 'ARRIVED');
  node('#otp-input').value = 'wrong';
  click('advance', 'start');
  assert.equal(demo.active().status, 'ARRIVED');
  node('#otp-input').value = demo.active().startOtp;
  click('advance', 'start');
  assert.equal(demo.active().status, 'IN_PROGRESS');
  click('advance', 'complete');
  assert.equal(demo.state.trips[0].status, 'COMPLETED');
  assert.equal(demo.state.charges.length, 1);
}
assert.equal(JSON.parse(saved).trips.length, 2);

// Parcel: pickup and drop OTPs.
demo.go('parcel');
node('#weight').value = '3';
node('#receiver').value = 'Meena';
click('book-parcel');
const parcel = demo.active();
assert.equal(parcel.flow, 'delivery');
assert.equal(parcel.parcel.weightGrams, 3000);
demo.go('driver');
click('advance', 'accept');
click('advance', 'arrive');
node('#otp-input').value = parcel.startOtp;
click('advance', 'pickup');
click('advance', 'depart');
click('advance', 'reach-drop');
node('#otp-input').value = parcel.startOtp;
click('advance', 'deliver');
assert.equal(demo.active().status, 'AT_DROP');
node('#otp-input').value = parcel.dropOtp;
click('advance', 'deliver');
assert.equal(demo.state.trips[0].status, 'DELIVERED');

// Tamil switch re-renders the UI.
demo.setLocale('ta');
demo.go('verify');
assert.match(node('#app').innerHTML, /கட்டணச் சரிபார்ப்பு/);
// Default check is 5 km starting now: ₹130 by day, ₹195 at night.
assert.match(node('#app').innerHTML, /மொத்தக் கட்டணம்<\/span><strong>₹(130|195)</);

console.log('PASS: ride and parcel flows, OTP guards, booking deduplication, daily fee, persistence, Tamil UI, fare check');
