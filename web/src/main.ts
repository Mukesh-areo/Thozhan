import { formatKm, formatMoney, pickLocale, t, type Locale } from '@thozhan/i18n';
import { CATEGORIES, availableActions, getCategory, type Category, type TripAction } from '@thozhan/shared';
import { TARIFF_RULES, calculateFare, getActiveRule, type FareBreakdown, type Terrain } from '@thozhan/tariff';
import { startMeter, type FixSource, type MeterReading, type MeterSession } from './meter-session.ts';
import { PLACES, estimateRouteMeters, placeName } from './places.ts';
import {
  STORAGE_KEY,
  activeTrip,
  addCase,
  cancelActive,
  createBooking,
  driverAction,
  emptyState,
  parseState,
  quote,
  recordMeterTrip,
  summarize,
  type Payment,
  type Trip,
} from './store.ts';

const LOCALE_KEY = 'thozhan-locale';
const $ = (s: string) => document.querySelector(s) as any;
const storage = globalThis.localStorage;

let locale: Locale = (storage?.getItem(LOCALE_KEY) as Locale | null) ?? pickLocale(globalThis.navigator?.languages ?? []);
if (locale !== 'ta' && locale !== 'en') locale = 'ta';
let state = parseState(storage?.getItem(STORAGE_KEY) ?? null);

type Page = 'ride' | 'parcel' | 'meter' | 'trips' | 'driver' | 'ops' | 'verify';
let page: Page = 'ride';
let pickup = 0;
let drop = 1;
let rideCategory = 'auto';
let parcelCategory = 'parcel-bike';
let payment: Payment = 'cash';
let schedule: 'now' | 'later' = 'now';
let meterSource: FixSource = 'gps';
let meterTerrain: Terrain = 'plain';
let meterVoice = false;
let meter: MeterSession | null = null;
let lastAnnouncedKm = 0;
let lastMeterTripId: string | null = null;
let verifyInput = { category: 'auto', km: '5', waiting: '0', ride: '15', start: '', terrain: 'plain' as Terrain, weight: '2' };

const L = (key: string, params?: Record<string, string | number>) => t(locale, key, params);
const money = (paise: number) => formatMoney(paise, locale);
const km = (meters: number) => formatKm(meters, locale);
const escapeHtml = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const persist = () => storage?.setItem(STORAGE_KEY, JSON.stringify(state));
const categoryName = (id: string) => L(getCategory(id).nameKey);
const flagOn = (c: Category) => state.flags[c.id] ?? c.enabledByDefault;

function toast(message: string) {
  $('#toast').textContent = message;
  $('#toast').style.display = 'block';
  setTimeout(() => ($('#toast').style.display = 'none'), 3000);
}

function modal(title: string, body: string) {
  $('#dialog-body').innerHTML = '<h2>' + title + '</h2>' + body;
  $('#dialog').showModal();
}

function setLocale(next: Locale) {
  locale = next;
  storage?.setItem(LOCALE_KEY, next);
  render();
}

function go(p: Page) {
  page = p;
  render();
}

// ---------- shared fragments ----------

function chrome() {
  if (document.documentElement) document.documentElement.lang = locale;
  const set = (id: string, html: string) => {
    const el = $('#' + id);
    if (el) el.innerHTML = html;
  };
  set('brand-small', escapeHtml(L('ui.brandSmall')));
  set('workspace-label', escapeHtml(L('ui.workspace')));
  set('aside-title', escapeHtml(L('ui.asideTitle')));
  set('aside-body', escapeHtml(L('ui.asideBody')));
  set('pilot-dot', escapeHtml(L('ui.pilot')));
  set('profile-note', escapeHtml(L('ui.demoAccount')));
  set('location-name', escapeHtml(L('ui.location')));
  set('demo-pill', escapeHtml(L('ui.demoPill')));
  set('footer-main', escapeHtml(L('ui.footer')));
  set('footer-note', escapeHtml(L('ui.footerNote')));
  set('close-dialog', escapeHtml(L('ui.gotIt')));
  set('lang', escapeHtml(L('ui.otherLanguage')));
}

function nav() {
  const items: [Page, string][] = [
    ['ride', '↗'],
    ['meter', '⏱'],
    ['parcel', '▣'],
    ['trips', '◷'],
    ['driver', '♧'],
    ['ops', '▦'],
    ['verify', '✓'],
  ];
  $('#nav').innerHTML = items
    .map(([p, i]) => `<button class="${page === p ? 'active' : ''}" data-page="${p}"><span>${i}</span>${L('ui.nav.' + p)}</button>`)
    .join('');
  document.querySelectorAll('[data-page]').forEach((b: any) => (b.onclick = () => go(b.dataset.page)));
}

function heading(title: string, sub: string, extra = '') {
  return `<div class="page-heading"><div><h1>${title}</h1><p class="sub">${sub}</p></div>${extra || `<span class="date">${L('ui.edition')}</span>`}</div>`;
}

function statusBadge(fare: FareBreakdown) {
  const cls = fare.status === 'OFFICIAL' ? 'tag' : 'tag tag-warn';
  return `<span class="${cls}">${L('tariff.status.' + fare.status)}</span>`;
}

function fareLines(fare: FareBreakdown) {
  return fare.lines
    .map((l) => {
      const label = L('fare.line.' + l.code, {
        km: formatKm(l.detail?.meters ?? 0, locale, 2),
        minutes: l.detail?.minutes ?? 0,
      });
      return `<div class="fare"><span>${label}</span><strong>${money(l.amountPaise)}</strong></div>`;
    })
    .join('');
}

/** Itemised, bilingual-ready receipt with tariff source and open interpretations. */
function receipt(fare: FareBreakdown, extra = '') {
  return `<div class="receipt">${statusBadge(fare)}${fare.night ? ` <span class="tag">${L('ui.meter.night')}</span>` : ''}${fare.terrain === 'ghat' ? ` <span class="tag">${L('fare.ghat')}</span>` : ''}
    ${extra}${fareLines(fare)}
    <div class="fare total"><span>${L('fare.total')}</span><strong>${money(fare.totalPaise)}</strong></div>
    ${fare.legalReference ? `<p class="small-note">${escapeHtml(L('tariff.source', { reference: fare.legalReference }))}</p>` : ''}
    ${fare.assumptions.length ? `<ul class="assumptions">${fare.assumptions.map((a) => `<li>${L('tariff.assumption.' + a)}</li>`).join('')}</ul>` : ''}
    ${fare.verifiedForBilling ? '' : `<p class="small-note warn">${L('fare.notBillable')}</p>`}</div>`;
}

function placeOptions(selected: number) {
  return PLACES.map((_, i) => `<option value="${i}" ${i === selected ? 'selected' : ''}>${escapeHtml(placeName(i, locale))}</option>`).join('');
}

function map() {
  return `<div class="card map-panel"><svg viewBox="0 0 650 600" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${L('ui.map.legend')}"><defs><pattern id="blocks" width="85" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><rect width="85" height="72" fill="#edf0e7"/><rect x="7" y="8" width="65" height="53" rx="6" fill="#e4e9dc"/><path d="M0 0H85M0 0V72" stroke="#fff" stroke-width="7"/></pattern></defs><rect width="650" height="600" fill="url(#blocks)"/><path d="M550 0Q510 120 563 205T550 430L580 600H650V0" fill="#d6e8e9"/><path d="M0 260Q150 280 260 230T550 260" fill="none" stroke="#d6e8e9" stroke-width="22"/><g fill="#d6e1c5"><path d="M45 360l85-15 23 80-85 35z"/><path d="M300 70l83-10 30 70-100 15z"/><path d="M330 440l80-20 30 90-100 20z"/></g><g stroke="#fff" fill="none"><path d="M70 0L240 600M420 0L350 600M0 140L550 160M0 480L565 390" stroke-width="15"/><path d="M70 0L240 600M420 0L350 600M0 140L550 160M0 480L565 390" stroke="#e6dfc6" stroke-width="2"/><path d="M230 0L265 170L320 280L445 390L475 600" stroke-width="18"/></g><path d="M360 150L339 220L350 274L445 310L466 367" fill="none" stroke="#fff" stroke-width="11" stroke-linejoin="round"/><path d="M360 150L339 220L350 274L445 310L466 367" fill="none" stroke="#43694b" stroke-width="5" stroke-linejoin="round"/><circle cx="360" cy="150" r="11" fill="#476f48" stroke="white" stroke-width="4"/><circle cx="466" cy="367" r="11" fill="#233c2d" stroke="white" stroke-width="4"/><g fill="white"><rect x="275" y="110" width="165" height="26" rx="5"/><rect x="405" y="388" width="140" height="26" rx="5"/></g><g font-family="Arial, 'Noto Sans Tamil'" font-size="10" fill="#344d39"><text x="290" y="127">${escapeHtml(placeName(pickup, locale))}</text><text x="415" y="405">${escapeHtml(placeName(drop, locale))}</text></g><g font-size="25"><text x="270" y="340">🛺</text><text x="440" y="190">🛺</text><text x="190" y="210">🛺</text></g></svg><span class="map-label"><i></i> ${L('ui.map.area')}</span><div class="map-info"><span class="symbol">⏱</span><div><strong>${L('ui.map.title')}</strong><small><button class="text-button" id="to-meter">${L('ui.map.sub')}</button></small></div></div><span class="map-legend">${L('ui.map.legend')}</span></div>`;
}

function benefits() {
  return `<div class="benefits">${[1, 2, 3]
    .map((n) => `<div class="card benefit"><span class="symbol">${['◇', '♡', '◎'][n - 1]}</span><div><h3>${L(`ui.benefit${n}.title`)}</h3><p>${L(`ui.benefit${n}.body`)}</p></div></div>`)
    .join('')}</div><div class="green-banner"><div><h3>${L('ui.banner.title')}</h3><p>${L('ui.banner.body')}</p></div><button class="text-button" id="about">${L('ui.banner.cta')} ↗</button></div>`;
}

function categoryButton(c: Category, selected: string, distanceMeters: number, extra: { weightGrams?: number } = {}) {
  const on = flagOn(c);
  let price = '';
  if (on) {
    try {
      price = money(quote(c.id, distanceMeters, Date.now(), extra).totalPaise);
    } catch {
      price = '—';
    }
  }
  const rule = getActiveRule(c.id);
  return `<button class="vehicle ${selected === c.id ? 'selected' : ''}" data-category="${c.id}" ${on ? '' : 'disabled'}>
    <span class="vehicle-icon">${c.icon}</span>
    <span class="vehicle-info"><strong>${L(c.nameKey)}</strong> <span class="${rule.status === 'OFFICIAL' ? 'tag' : 'tag tag-warn'}">${L('tariff.status.' + rule.status)}</span>
    <small>${on ? (c.seats ? L('ui.seats', { n: c.seats }) : L('ui.parcel.max', { kg: (c.parcel?.maxWeightGrams ?? 0) / 1000 })) : L('ui.legal.' + c.legalStatus)}</small></span>
    <span class="vehicle-price">${price}<small>${on ? L('ui.estimated') : ''}</small></span></button>`;
}

function tripCard(trip: Trip) {
  const hintKey =
    trip.status === 'REQUESTED'
      ? 'ui.hint.requested'
      : trip.status === 'ACCEPTED'
        ? 'ui.hint.accepted'
        : trip.status === 'ARRIVED' || trip.status === 'AT_PICKUP'
          ? 'ui.hint.arrived'
          : trip.status === 'IN_PROGRESS'
            ? 'ui.hint.inProgress'
            : 'ui.hint.inTransit';
  return `<section class="card trip-box"><span class="badge">${L('trip.status.' + trip.status)}</span>
    <h2 style="margin-top:17px">${categoryName(trip.category)}</h2>
    <p>${escapeHtml(placeName(trip.pickup, locale))} → ${escapeHtml(placeName(trip.drop, locale))}</p>
    ${trip.departure ? `<p>${L('ui.trip.scheduled', { time: escapeHtml(new Date(trip.departure).toLocaleString(locale === 'ta' ? 'ta-IN' : 'en-IN')) })}</p>` : ''}
    ${trip.parcel ? `<p>${L('parcel.receiver')}: ${escapeHtml(trip.parcel.receiver)} · ${L('parcel.weight')}: ${trip.parcel.weightGrams / 1000} kg</p>` : ''}
    <div class="driver-card"><span class="avatar">RK</span><div><strong>${trip.status === 'REQUESTED' ? L('ui.trip.awaitingDriver') : 'Ravi Kumar'}</strong><small>TN 01 DEMO · ★ 4.9</small></div></div>
    <div class="trip-status">${L(hintKey)}</div>
    <p>${L('ui.trip.startOtp')}</p><div class="otp">${trip.startOtp}</div>
    ${trip.dropOtp ? `<p>${L('ui.trip.dropOtp')}</p><div class="otp">${trip.dropOtp}</div>` : ''}
    <div class="fare"><span>${L('ui.trip.estimatedFare')}</span><strong>${money(trip.fare.totalPaise)}</strong></div>
    <div class="fare"><span>${L('ui.trip.payment')}</span><span>${L('ui.trip.demoPayment', { method: L('ui.pay.' + trip.payment) })}</span></div>
    <div class="actions"><button class="secondary" id="share-trip">${L('safety.shareTrip')}</button><button class="secondary danger" id="safety">${L('ui.trip.safety')}</button></div>
    ${availableActions(trip.flow, trip.status, 'rider').includes('cancel') ? `<button class="text-button danger" id="cancel" style="margin-top:20px">${L('trip.action.cancel')}</button>` : ''}</section>`;
}

// ---------- pages ----------

function ridePage() {
  const trip = activeTrip(state);
  const distanceMeters = estimateRouteMeters(pickup, drop);
  const rideCats = CATEGORIES.filter((c) => c.flows.includes('ride'));
  const selected = getCategory(rideCategory);
  const bookable = flagOn(selected);
  return (
    heading(L('ui.ride.title'), L('ui.ride.sub')) +
    `<div class="booking-layout">${
      trip
        ? tripCard(trip)
        : `<section class="card booking"><div class="tabs"><button class="${schedule === 'now' ? 'selected' : ''}" id="now">↗ ${L('ui.ride.now')}</button><button class="${schedule === 'later' ? 'selected' : ''}" id="later">◷ ${L('ui.ride.later')}</button></div>
        <label class="field">${L('ui.field.pickup')}<div><span class="pickup-symbol">●</span><select id="pickup">${placeOptions(pickup)}</select></div></label>
        <label class="field">${L('ui.field.drop')}<div><span class="drop-symbol">■</span><select id="drop">${placeOptions(drop)}</select></div></label>
        ${schedule === 'later' ? `<label class="field">${L('ui.field.departure')}<div><input id="departure" type="datetime-local" required></div></label>` : ''}
        <div class="route-summary"><span>↳ ${L('ui.route.approx', { km: km(distanceMeters) })}</span><span>${L('ui.route.note')}</span></div>
        <div class="section-label">${L('ui.choose')}</div>
        ${rideCats.map((c) => categoryButton(c, rideCategory, distanceMeters)).join('')}
        <div class="payment-row"><label for="payment">▣ ${L('ui.payment')}</label><select id="payment"><option value="cash" ${payment === 'cash' ? 'selected' : ''}>${L('ui.pay.cash')}</option><option value="upi" ${payment === 'upi' ? 'selected' : ''}>${L('ui.pay.upi')}</option></select></div>
        <button class="primary" id="book" ${bookable ? '' : 'disabled'}>${L(schedule === 'later' ? 'ui.schedule' : 'ui.book', { name: L(selected.nameKey) })} <span style="float:right">${bookable ? money(quote(rideCategory, distanceMeters, Date.now()).totalPaise) : ''} →</span></button>
        <p class="small-note">${L('ui.demoOnly')} · <button class="text-button" id="breakdown">${L('ui.fareDetails')}</button></p></section>`
    }${map()}</div>` +
    benefits()
  );
}

function parcelPage() {
  const trip = activeTrip(state);
  const distanceMeters = estimateRouteMeters(pickup, drop);
  const cats = CATEGORIES.filter((c) => c.flows.includes('delivery'));
  const selected = getCategory(parcelCategory);
  const weightGrams = Math.round(Number($('#weight')?.value || 2) * 1000);
  const restricted = selected.parcel?.restrictedItemKeys ?? [];
  return (
    heading(L('ui.parcel.title'), L('ui.parcel.sub')) +
    `<div class="booking-layout">${
      trip
        ? tripCard(trip)
        : `<section class="card booking">
        <label class="field">${L('parcel.sender')} · ${L('ui.field.pickup')}<div><span class="pickup-symbol">●</span><select id="pickup">${placeOptions(pickup)}</select></div></label>
        <label class="field">${L('parcel.receiver')} · ${L('ui.field.drop')}<div><span class="drop-symbol">■</span><select id="drop">${placeOptions(drop)}</select></div></label>
        <label class="field">${L('ui.parcel.receiverName')}<div><input id="receiver" maxlength="40" autocomplete="off"></div></label>
        <label class="field">${L('ui.parcel.weightKg')}<div><input id="weight" type="number" min="0.1" step="0.1" max="${(selected.parcel?.maxWeightGrams ?? 0) / 1000}" value="${weightGrams / 1000}"></div></label>
        <div class="section-label">${L('ui.parcel.vehicle')}</div>
        ${cats.map((c) => categoryButton(c, parcelCategory, distanceMeters, { weightGrams: Math.min(weightGrams, c.parcel?.maxWeightGrams ?? 0) })).join('')}
        <p class="small-note">${L('ui.parcel.restricted')} ${restricted.map((k) => L(k)).join(', ')}</p>
        <button class="primary" id="book-parcel" ${flagOn(selected) ? '' : 'disabled'}>${L('ui.parcel.book', { name: L(selected.nameKey) })} →</button>
        <p class="small-note">${L('ui.demoOnly')}</p></section>`
    }${map()}</div>`
  );
}

function meterLive(reading: MeterReading) {
  const s = reading.snapshot;
  const mm = String(Math.floor(s.elapsedSeconds / 60)).padStart(2, '0');
  const ss = String(Math.floor(s.elapsedSeconds % 60)).padStart(2, '0');
  return `<div class="meter-fare" id="meter-fare">${reading.fare ? money(reading.fare.totalPaise) : '—'}</div>
    <p class="meter-caption">${reading.fare ? L('meter.liveFare') : L('ui.meter.waitingGps')}</p>
    <div class="meter-stats">
      <div><small>${L('meter.distance')}</small><strong>${km(s.distanceMeters)} ${L('ui.unit.km')}</strong></div>
      <div><small>${L('meter.waiting')}</small><strong>${Math.floor(s.waitingSeconds / 60)} ${L('ui.unit.min')}</strong></div>
      <div><small>${L('meter.elapsed')}</small><strong>${mm}:${ss}</strong></div>
    </div>
    ${reading.fare?.night ? `<p><span class="tag">${L('ui.meter.night')}</span></p>` : ''}
    ${s.flags.length ? `<ul class="assumptions">${s.flags.map((f) => `<li>${L('meter.flag.' + f)}</li>`).join('')}</ul>` : ''}`;
}

function meterPage() {
  const rule = getActiveRule('auto');
  const body = meter
    ? `<section class="card booking meter-card"><span class="badge">${L('trip.status.METER_RUNNING')}</span>
        <div id="meter-live">${meterLive(meter.read())}</div>
        <p class="small-note">${L('ui.meter.keepOpen')}</p>
        <button class="primary danger-bg" id="meter-stop">${L('meter.stop')}</button>
        <div class="actions"><button class="secondary danger" id="safety">${L('safety.sos')}</button></div></section>`
    : `<section class="card booking"><p>${L('meter.hint')}</p>
        <label class="field">${L('meter.vehicleNumber')} (${L('ui.meter.optional')})<div><input id="vehicle-number" maxlength="13" placeholder="TN 01 AB 1234" autocomplete="off" style="text-transform:uppercase"></div></label>
        <div class="section-label">${L('ui.meter.terrain')}</div>
        <div class="tabs"><button class="${meterTerrain === 'plain' ? 'selected' : ''}" id="terrain-plain">${L('ui.meter.plain')}</button><button class="${meterTerrain === 'ghat' ? 'selected' : ''}" id="terrain-ghat">${L('ui.meter.ghat')}</button></div>
        <div class="section-label">${L('ui.meter.source')}</div>
        <div class="tabs"><button class="${meterSource === 'gps' ? 'selected' : ''}" id="source-gps">${L('ui.meter.gps')}</button><button class="${meterSource === 'simulation' ? 'selected' : ''}" id="source-sim">${L('ui.meter.sim')}</button></div>
        <label class="check"><input type="checkbox" id="meter-voice" ${meterVoice ? 'checked' : ''}> ${L('ui.meter.voice')}</label>
        <button class="primary" id="meter-start">⏱ ${L('meter.start')}</button></section>`;
  const tariff = `<section class="card pad"><h2>${L('ui.verify.official')}</h2>${goTable()}<p class="small-note">${escapeHtml(L('tariff.source', { reference: rule.legalReference ?? '' }))}</p></section>`;
  return heading(L('meter.title'), L('ui.meter.sub')) + `<div class="booking-layout">${body}${tariff}</div>`;
}

function goTable() {
  return [
    ['ui.go.minDist', 'ui.go.minDistVal'],
    ['ui.go.minFare', 'ui.go.minFareVal'],
    ['ui.go.perKm', 'ui.go.perKmVal'],
    ['ui.go.waiting', 'ui.go.waitingVal'],
    ['ui.go.night', 'ui.go.nightVal'],
    ['ui.go.ghat', 'ui.go.ghatVal'],
  ]
    .map(([k, v]) => `<div class="fare"><span>${L(k!)}</span><strong>${L(v!)}</strong></div>`)
    .join('');
}

function tripsTable(trips: Trip[]) {
  if (!trips.length) return `<div class="empty">${L('ui.empty')}</div>`;
  const dateLocale = locale === 'ta' ? 'ta-IN' : 'en-IN';
  return `<div class="table-wrap"><table><thead><tr><th>${L('ui.th.trip')}</th><th>${L('ui.th.journey')}</th><th>${L('ui.th.service')}</th><th>${L('ui.th.fare')}</th><th>${L('ui.th.status')}</th><th></th></tr></thead><tbody>${trips
    .map(
      (tr) =>
        `<tr><td>${tr.id}<br><small>${new Date(tr.created).toLocaleDateString(dateLocale)}</small></td><td>${
          tr.flow === 'meter'
            ? `${L('ui.trips.streetHail')}<br><small>${escapeHtml(tr.vehicleNumber ?? '—')}</small>`
            : `${escapeHtml(placeName(tr.pickup, locale))}<br><small>→ ${escapeHtml(placeName(tr.drop, locale))}</small>`
        }</td><td>${categoryName(tr.category)}</td><td>${money(tr.fare.totalPaise)}</td><td><span class="badge">${L('trip.status.' + tr.status)}</span></td><td><button class="text-button" data-detail="${tr.id}">${L('ui.details')} ↗</button></td></tr>`,
    )
    .join('')}</tbody></table></div>`;
}

function metrics() {
  const s = summarize(state);
  return `<div class="metrics">${[
    ['ui.m.completed', String(s.completed), 'ui.m.completedNote'],
    ['ui.m.earnings', money(s.grossPaise), 'ui.m.earningsNote'],
    ['ui.m.fees', money(s.feesPaise), 'ui.m.feesNote'],
    ['ui.m.net', money(s.grossPaise - s.feesPaise), 'ui.m.netNote'],
  ]
    .map(([label, value, note]) => `<div class="card metric"><small>${L(label!)}</small><strong>${value}</strong><p>${L(note!)}</p></div>`)
    .join('')}</div>`;
}

/** The driver's single forward action for the active trip (cancel/return are not offered here). */
function nextDriverAction(): TripAction | undefined {
  const trip = activeTrip(state);
  return trip ? availableActions(trip.flow, trip.status, 'driver').find((a) => a !== 'cancel' && a !== 'return') : undefined;
}

function driverPage() {
  const trip = activeTrip(state);
  const action = nextDriverAction();
  const needsOtp = action === 'start' || action === 'pickup' ? 'start' : action === 'deliver' ? 'drop' : null;
  return (
    heading(L('ui.driver.title'), L('ui.driver.sub'), `<button class="online" id="online">● ${L(state.online ? 'ui.online' : 'ui.offline')}</button>`) +
    metrics() +
    `<div class="driver-grid"><div class="card"><div class="card-head"><h2>${L('ui.driver.workspace')}</h2><span class="badge">${L('ui.driver.demo')}</span></div><div class="pad">${
      trip && action
        ? `<h3>${escapeHtml(placeName(trip.pickup, locale))} → ${escapeHtml(placeName(trip.drop, locale))}</h3>
          <p class="sub" style="margin:15px 0">${categoryName(trip.category)} · ${km(trip.distanceMeters)} ${L('ui.unit.km')} · ${money(trip.fare.totalPaise)} · ${L('trip.status.' + trip.status)}</p>
          ${needsOtp ? `<label class="field">${L(needsOtp === 'start' ? 'ui.driver.enterOtp' : 'ui.driver.enterDropOtp')}<div><input id="otp-input" inputmode="numeric" maxlength="4" placeholder="${L('ui.driver.otpPlaceholder')}"></div></label>` : ''}
          <button class="primary" id="advance" ${!state.online && action === 'accept' ? 'disabled' : ''}>${L('trip.action.' + action)}</button>
          <p class="small-note">${L('ui.driver.note')}</p>`
        : `<div class="empty">${L('ui.driver.ready')}</div>`
    }</div></div>
    <div class="card pad"><h2>${L('ui.driver.plan')}</h2><p class="sub" style="margin:15px 0">${L('ui.driver.planBody')}</p>
      <div class="fare"><span>${L('ui.driver.commission')}</span><strong>0%</strong></div>
      <div class="fare"><span>${L('ui.driver.dailyFee')}</span><strong>${money(1000)}</strong></div>
      <div class="fare"><span>${L('ui.driver.chargedDays')}</span><strong>${state.charges.length}</strong></div>
      <p class="small-note">${L('ui.driver.ledgerNote')}</p></div></div>
    <div class="card" style="margin-top:22px"><div class="card-head"><h2>${L('ui.driver.history')}</h2></div>${tripsTable(state.trips.filter((tr) => tr.flow !== 'meter'))}</div>`
  );
}

function opsPage() {
  const s = summarize(state);
  return (
    heading(L('ui.ops.title'), L('ui.ops.sub')) +
    `<div class="metrics">${[
      ['ui.ops.requests', s.requests],
      ['ui.ops.active', s.active],
      ['ui.ops.completed', s.completed],
      ['ui.ops.cases', state.cases.length],
    ]
      .map(([label, n]) => `<div class="card metric"><small>${L(label as string)}</small><strong>${n}</strong><p>${L('ui.ops.local')}</p></div>`)
      .join('')}</div>
    <div class="driver-grid" style="margin-bottom:22px"><div class="card pad"><h2>${L('ui.ops.compliance')}</h2>
      <div class="fare"><span>${L('ui.ops.meterTrips')}</span><strong>${s.meterTrips}</strong></div>
      <div class="fare"><span>${L('ui.ops.overcharge')}</span><strong>${s.overchargeReports}</strong></div>
      <div class="fare"><span>${L('ui.ops.avgOver')}</span><strong>${s.averageOverchargePercent === null ? '—' : s.averageOverchargePercent + '%'}</strong></div>
      <p class="small-note">${L('ui.ops.complianceNote')}</p></div>
    <div class="card pad"><h2>${L('ui.ops.controls')}</h2><p class="sub" style="margin:10px 0">${L('ui.ops.controlsSub')}</p>
      ${CATEGORIES.map(
        (c) =>
          `<div class="fare"><span>${c.icon} ${L(c.nameKey)}<br><small>${L('ui.legal.' + c.legalStatus)} · ${L('tariff.status.' + getActiveRule(c.id).status)}</small></span><button class="secondary" data-flag="${c.id}">${L(flagOn(c) ? 'ui.on' : 'ui.off')}</button></div>`,
      ).join('')}</div></div>
    <div class="card"><div class="card-head"><div><h2>${L('ui.ops.activity')}</h2><p class="sub">${L('ui.ops.activitySub')}</p></div><button class="secondary" id="export">${L('ui.ops.export')} ↓</button></div>${tripsTable(state.trips)}</div>
    <div class="driver-grid" style="margin-top:22px"><div class="card pad"><h2>${L('ui.ops.casesTitle')}</h2>${
      state.cases.length
        ? state.cases
            .map(
              (c) =>
                `<div class="fare"><span>${c.id} · ${c.trip}</span><span class="badge">${
                  c.kind === 'overcharge'
                    ? L('ui.case.overcharge', { asked: money(c.askedPaise ?? 0), meter: money(c.meterPaise ?? 0) })
                    : L('ui.case.safety')
                }</span></div>`,
            )
            .join('')
        : `<p class="sub" style="margin-top:15px">${L('ui.ops.noCases')}</p>`
    }</div>
    <div class="card pad"><h2>${L('ui.ops.demoData')}</h2><p class="sub" style="margin:15px 0">${L('ui.ops.demoDataSub')}</p><button class="secondary" id="reset">${L('ui.ops.reset')}</button></div></div>`
  );
}

function verifyResult(): string {
  try {
    const startedAt = verifyInput.start ? Date.parse(verifyInput.start + ':00+05:30') : Date.now();
    const rule = getActiveRule(verifyInput.category, new Date(startedAt));
    const fare = calculateFare(rule, {
      distanceMeters: Math.round(Number(verifyInput.km) * 1000),
      waitingSeconds: Math.round(Number(verifyInput.waiting) * 60),
      rideSeconds: Math.round(Number(verifyInput.ride) * 60),
      startedAt,
      terrain: verifyInput.terrain,
      weightGrams: getCategory(verifyInput.category).service === 'parcel' ? Math.round(Number(verifyInput.weight) * 1000) : undefined,
    });
    return receipt(fare, `<p class="small-note">${escapeHtml(rule.id)} · v${rule.version}</p>`);
  } catch (e) {
    return `<p class="warn">${escapeHtml((e as Error).message)}</p>`;
  }
}

function verifyPage() {
  const v = verifyInput;
  const cat = getCategory(v.category);
  const ghatAllowed = !!getActiveRule(v.category).ghat;
  return (
    heading(L('ui.verify.title'), L('ui.verify.sub')) +
    `<div class="booking-layout"><section class="card booking">
      <label class="field">${L('ui.verify.category')}<div><select id="v-category">${CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === v.category ? 'selected' : ''}>${L(c.nameKey)}</option>`).join('')}</select></div></label>
      <label class="field">${L('ui.verify.distance')}<div><input id="v-km" type="number" min="0" step="0.1" value="${escapeHtml(v.km)}"></div></label>
      <label class="field">${L('ui.verify.waiting')}<div><input id="v-waiting" type="number" min="0" step="1" value="${escapeHtml(v.waiting)}"></div></label>
      ${TARIFF_RULES.some((r) => r.category === v.category && r.perRideMinutePaise) ? `<label class="field">${L('ui.verify.ride')}<div><input id="v-ride" type="number" min="0" step="1" value="${escapeHtml(v.ride)}"></div></label>` : ''}
      ${cat.service === 'parcel' ? `<label class="field">${L('ui.parcel.weightKg')}<div><input id="v-weight" type="number" min="0" step="0.1" value="${escapeHtml(v.weight)}"></div></label>` : ''}
      <label class="field">${L('ui.verify.start')}<div><input id="v-start" type="datetime-local" value="${escapeHtml(v.start)}"></div></label>
      ${ghatAllowed ? `<div class="tabs"><button class="${v.terrain === 'plain' ? 'selected' : ''}" id="v-plain">${L('ui.meter.plain')}</button><button class="${v.terrain === 'ghat' ? 'selected' : ''}" id="v-ghat">${L('ui.meter.ghat')}</button></div>` : ''}
      <div id="v-result">${verifyResult()}</div></section>
      <section class="card pad"><h2>${L('ui.verify.official')}</h2>${goTable()}<p class="small-note">${L('ui.verify.note')}</p></section></div>`
  );
}

function render() {
  chrome();
  nav();
  const pages: Record<Page, () => string> = {
    ride: ridePage,
    parcel: parcelPage,
    meter: meterPage,
    trips: () => heading(L('ui.trips.title'), L('ui.trips.sub')) + `<div class="card">${tripsTable(state.trips)}</div>`,
    driver: driverPage,
    ops: opsPage,
    verify: verifyPage,
  };
  $('#app').innerHTML = pages[page]();
  bind();
}

// ---------- events ----------

function on(id: string, fn: () => void) {
  const el = $('#' + id);
  if (el) el.onclick = fn;
}

function speak(text: string) {
  const synth = globalThis.speechSynthesis;
  if (!synth) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = locale === 'ta' ? 'ta-IN' : 'en-IN';
  synth.speak(u);
}

function onMeterUpdate(reading: MeterReading) {
  const whole = Math.floor(reading.snapshot.distanceMeters / 1000);
  if (meterVoice && reading.fare && whole > lastAnnouncedKm) speak(L('meter.announce', { amount: money(reading.fare.totalPaise) }));
  lastAnnouncedKm = Math.max(lastAnnouncedKm, whole);
  const live = $('#meter-live');
  if (page === 'meter' && live) live.innerHTML = meterLive(reading);
}

function stopMeter() {
  if (!meter) return;
  const session = meter;
  meter = null;
  const result = session.stop();
  render();
  if (!result.fare) return toast(L('ui.meter.noFix'));
  const trip = recordMeterTrip(state, {
    fare: result.fare,
    distanceMeters: result.snapshot.distanceMeters,
    startedAt: result.snapshot.startedAt!,
    endedAt: result.endedAt,
    vehicleNumber: session.vehicleNumber,
    flags: result.snapshot.flags,
  });
  lastMeterTripId = trip.id;
  persist();
  modal(
    L('ui.meter.receipt'),
    `<p>${km(trip.distanceMeters)} ${L('ui.unit.km')} · ${L('meter.waiting')} ${Math.floor(result.snapshot.waitingSeconds / 60)} ${L('ui.unit.min')}${trip.vehicleNumber ? ' · ' + escapeHtml(trip.vehicleNumber) : ''}</p>${receipt(trip.fare)}
    ${trip.meterFlags.length ? `<ul class="assumptions">${trip.meterFlags.map((f) => `<li>${L('meter.flag.' + f)}</li>`).join('')}</ul>` : ''}
    <label class="field">${L('ui.meter.asked')}<div><input id="asked" type="number" min="0" step="1" inputmode="numeric"></div></label>
    <button class="secondary danger" id="report-overcharge">${L('meter.reportOvercharge')}</button>`,
  );
}

function bind() {
  on('about', () => modal(L('ui.about.title'), `<p>${L('ui.about.body')}</p>`));
  on('to-meter', () => go('meter'));
  ['pickup', 'drop'].forEach((id) => {
    const el = $('#' + id);
    if (el)
      el.onchange = () => {
        if (id === 'pickup') pickup = +el.value;
        else drop = +el.value;
        render();
      };
  });
  const weight = $('#weight');
  if (weight) weight.onchange = () => render();
  document.querySelectorAll('[data-category]').forEach(
    (b: any) =>
      (b.onclick = () => {
        if (page === 'parcel') parcelCategory = b.dataset.category;
        else rideCategory = b.dataset.category;
        render();
      }),
  );
  const pay = $('#payment');
  if (pay) pay.onchange = (e: any) => (payment = e.target.value);
  on('now', () => ((schedule = 'now'), render()));
  on('later', () => ((schedule = 'later'), render()));
  on('breakdown', () => {
    const distanceMeters = estimateRouteMeters(pickup, drop);
    modal(L('ui.fare.title'), `<p>${categoryName(rideCategory)} · ${L('ui.route.approx', { km: km(distanceMeters) })}</p>${receipt(quote(rideCategory, distanceMeters, Date.now()))}<p class="small-note">${L('ui.fare.estimateNote')}</p>`);
  });

  const book = (category: string, parcel: { weightGrams: number; receiver: string } | null) => {
    const result = createBooking(state, { category, pickup, drop, payment, departure: $('#departure')?.value || null, parcel }, Date.now());
    if (!result.ok) return toast(L('ui.err.' + result.error));
    persist();
    render();
    toast(L('ui.booked'));
  };
  on('book', () => book(rideCategory, null));
  on('book-parcel', () =>
    book(parcelCategory, { weightGrams: Math.round(Number($('#weight')?.value || 0) * 1000), receiver: String($('#receiver')?.value || '').trim() || '—' }),
  );
  on('cancel', () => modal(L('ui.cancel.title'), `<p>${L('ui.cancel.body')}</p><button class="secondary danger" id="confirm-cancel">${L('ui.cancel.confirm')}</button>`));
  on('share-trip', async () => {
    const trip = activeTrip(state);
    const text = trip
      ? L('ui.trip.shareText', { id: trip.id, from: placeName(trip.pickup, locale), to: placeName(trip.drop, locale), status: L('trip.status.' + trip.status) })
      : L('ui.meter.shareText');
    try {
      await navigator.clipboard.writeText(text);
      toast(L('ui.copied'));
    } catch {
      modal(L('ui.trip.summary'), `<p>${escapeHtml(text)}</p>`);
    }
  });
  on('safety', () => modal(L('ui.safety.title'), `<p>${L('ui.safety.body')}</p><button class="secondary" id="report">${L('ui.safety.report')}</button>`));
  on('online', () => {
    state.online = !state.online;
    persist();
    render();
  });
  on('advance', () => {
    const action = nextDriverAction();
    if (!action) return;
    const code = $('#otp-input') ? String($('#otp-input').value) : null;
    const result = driverAction(state, action, code, Date.now());
    if (!result.ok) return toast(L('ui.err.' + result.error));
    persist();
    render();
    toast(L(result.trip.completed ? 'ui.completedToast' : 'ui.updated'));
  });
  document.querySelectorAll('[data-detail]').forEach(
    (b: any) =>
      (b.onclick = () => {
        const trip = state.trips.find((tr) => tr.id === b.dataset.detail);
        if (!trip) return;
        modal(
          trip.id,
          `<p>${trip.flow === 'meter' ? L('ui.trips.streetHail') : `${escapeHtml(placeName(trip.pickup, locale))} → ${escapeHtml(placeName(trip.drop, locale))}`}<br>${categoryName(trip.category)} · ${L('trip.status.' + trip.status)} · ${km(trip.distanceMeters)} ${L('ui.unit.km')}</p>${trip.status === 'CANCELLED' ? '' : receipt(trip.fare)}<p class="small-note">${L('ui.notInvoice')}</p>`,
        );
      }),
  );
  on('export', () => {
    const rows = [
      ['Trip', 'Flow', 'Category', 'Pickup', 'Destination', 'Distance km', 'Fare INR', 'Tariff', 'Tariff status', 'Status'],
      ...state.trips.map((tr) => [tr.id, tr.flow, tr.category, placeName(tr.pickup, 'en'), placeName(tr.drop, 'en'), tr.distanceMeters / 1000, tr.fare.totalPaise / 100, tr.fare.ruleId, tr.fare.status, tr.status]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'thozhan-demo-trips.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
  on('reset', () => modal(L('ui.reset.title'), `<p>${L('ui.reset.body')}</p><button class="secondary danger" id="confirm-reset">${L('ui.reset.confirm')}</button>`));
  document.querySelectorAll('[data-flag]').forEach(
    (b: any) =>
      (b.onclick = () => {
        const c = getCategory(b.dataset.flag);
        state.flags[c.id] = !flagOn(c);
        persist();
        render();
      }),
  );

  // meter
  on('terrain-plain', () => ((meterTerrain = 'plain'), render()));
  on('terrain-ghat', () => ((meterTerrain = 'ghat'), render()));
  on('source-gps', () => ((meterSource = 'gps'), render()));
  on('source-sim', () => ((meterSource = 'simulation'), render()));
  const voice = $('#meter-voice');
  if (voice) voice.onchange = () => (meterVoice = !!voice.checked);
  on('meter-start', () => {
    const vehicleNumber = String($('#vehicle-number')?.value || '').trim().toUpperCase() || null;
    lastAnnouncedKm = 0;
    meter = startMeter({
      source: meterSource,
      terrain: meterTerrain,
      vehicleNumber,
      onUpdate: onMeterUpdate,
      onError: (error) => {
        meter?.stop();
        meter = null;
        render();
        toast(L('ui.meter.err.' + error));
      },
    });
    render();
  });
  on('meter-stop', stopMeter);

  // verifier
  const bindInput = (id: string, key: keyof typeof verifyInput) => {
    const el = $('#' + id);
    if (el)
      el.oninput = () => {
        (verifyInput as Record<string, string>)[key] = el.value;
        $('#v-result').innerHTML = verifyResult();
      };
  };
  bindInput('v-km', 'km');
  bindInput('v-waiting', 'waiting');
  bindInput('v-ride', 'ride');
  bindInput('v-weight', 'weight');
  bindInput('v-start', 'start');
  const vc = $('#v-category');
  if (vc)
    vc.onchange = () => {
      verifyInput.category = vc.value;
      if (!getActiveRule(vc.value).ghat) verifyInput.terrain = 'plain';
      render();
    };
  on('v-plain', () => ((verifyInput.terrain = 'plain'), render()));
  on('v-ghat', () => ((verifyInput.terrain = 'ghat'), render()));
}

$('#close-dialog').onclick = () => $('#dialog').close();
$('#help').onclick = () => modal(L('ui.help.title'), `<p>${L('ui.help.body1')}</p><p>${L('ui.help.body2')}</p>`);
const langButton = $('#lang');
if (langButton) langButton.onclick = () => setLocale(locale === 'ta' ? 'en' : 'ta');

$('#dialog').addEventListener('click', (e: any) => {
  const id = e.target.id;
  if (id === 'confirm-cancel') {
    cancelActive(state);
    persist();
    $('#dialog').close();
    render();
  }
  if (id === 'report') {
    const trip = activeTrip(state);
    addCase(state, { trip: trip?.id ?? (meter ? 'METER' : '—'), kind: 'safety', askedPaise: null, meterPaise: null, created: Date.now() });
    persist();
    $('#dialog').close();
    toast(L('ui.safety.saved'));
  }
  if (id === 'report-overcharge') {
    const trip = state.trips.find((tr) => tr.id === lastMeterTripId);
    const asked = Math.round(Number($('#asked')?.value || 0) * 100);
    if (!trip || !(asked > 0)) return toast(L('ui.meter.askedMissing'));
    addCase(state, { trip: trip.id, kind: 'overcharge', askedPaise: asked, meterPaise: trip.fare.totalPaise, created: Date.now() });
    persist();
    $('#dialog').close();
    toast(L('ui.meter.reported'));
  }
  if (id === 'confirm-reset') {
    state = emptyState();
    persist();
    $('#dialog').close();
    render();
    toast(L('ui.reset.done'));
  }
});

// Hooks for the scripted demo video and the DOM-stub test; not an API.
(globalThis as any).thozhanDemo = {
  go,
  render,
  setLocale,
  active: () => activeTrip(state),
  get state() {
    return state;
  },
};

render();
