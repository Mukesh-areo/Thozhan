// Browser tests for the flows that need more than one person: a separate Chrome context each
// for the passenger, the driver and the admin, against the local backend with no demo bots.
//
//   npm run test:e2e                         # all eight areas
//   node scripts/e2e.ts trip parcel          # some of them: onboarding trip parcel sos roles errors vehicles screens
//   HEADED=1 VERBOSE=1 npm run test:e2e      # watch it, and stream server output
//
// It starts and stops its own servers on 54321, 8081 and 5173 (E2E_EXPO_PORT moves Expo), and
// refuses to run if something else is listening there. A failing area leaves a screenshot of every open screen in
// test-results/e2e, next to the server logs. Needs Google Chrome.
import assert from 'node:assert/strict';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createWriteStream, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { t as translate } from '@thozhan/i18n';
import { chromium, type Browser, type BrowserContext, type Locator, type Page } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT = join(ROOT, 'test-results/e2e');
const EXPO_PORT = Number(process.env.E2E_EXPO_PORT ?? 8081);
const APP = `http://localhost:${EXPO_PORT}`;
const ADMIN = 'http://localhost:5173';
const BACKEND = 'http://localhost:54321';
const OTP = '123456';
const DOCUMENT = readFileSync(join(ROOT, 'media/Thozhan-preview.jpg'));
const DOCUMENT_PATH = join(ROOT, 'media/Thozhan-preview.jpg');

const PEOPLE = {
  admin: '9000000001',
  department: '9000000002',
  tripDriver: '9000000021',
  parcelDriver: '9000000022',
  owesHundred: '9000000023',
  owesNinety: '9000000024',
  sosDriver: '9000000025',
  newDriver: '9811100001',
  tripRider: '9811100002',
  parcelRider: '9811100003',
  sosRider: '9811100004',
  notStaff: '9811100005',
  noDriverRider: '9811100006',
  vehicleRider: '9811100007',
};
/** Chennai Central, the default pickup in the app. */
const CENTRAL = { latitude: 13.0837, longitude: 80.2707 };

/** English text from the app's own locale file; a key that does not exist is a test bug. */
function t(key: string, params?: Record<string, string | number>) {
  const text = translate('en', key, params);
  assert.notEqual(text, key, `missing translation: ${key}`);
  return text;
}
const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const step = (text: string) => console.log(`    · ${text}`);

// ---------------------------------------------------------------- servers

const servers: { name: string; child: ChildProcess }[] = [];

function start(name: string, args: string[], cwd = ROOT) {
  const log = createWriteStream(join(OUT, `${name}.log`));
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, CI: '1', BROWSER: 'none' }, stdio: ['ignore', 'pipe', 'pipe'] });
  for (const stream of [child.stdout!, child.stderr!]) {
    stream.pipe(log, { end: false });
    if (process.env.VERBOSE) stream.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  }
  servers.push({ name, child });
}

function portOpen(port: number) {
  return new Promise<boolean>((resolve) => {
    const socket = connect({ port, host: '127.0.0.1' });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
  });
}

async function waitForHttp(url: string, seconds: number) {
  for (let i = 0; i < seconds; i++) {
    try {
      if ((await fetch(url)).status < 500) return;
    } catch {}
    await pause(1000);
  }
  throw new Error(`${url} did not answer within ${seconds}s; see test-results/e2e/*.log`);
}

async function startServers() {
  for (const port of [54321, EXPO_PORT, 5173]) {
    assert.equal(await portOpen(port), false, `Port ${port} is already in use. Stop whatever is running there and try again.`);
  }
  // No --bots: every driver in these tests is a person in a browser.
  start('backend', ['supabase/dev/server.ts', '--fresh', '--seed', 'scripts/e2e-seed.sql']);
  start('expo', [join(ROOT, 'node_modules/expo/bin/cli'), 'start', '--web', '--port', String(EXPO_PORT)], join(ROOT, 'apps/mobile'));
  start('admin', [join(ROOT, 'apps/admin/node_modules/vite/bin/vite.js'), '--port', '5173', '--strictPort'], join(ROOT, 'apps/admin'));
  await waitForHttp(`${BACKEND}/health`, 90);
  await waitForHttp(ADMIN, 60);
  await waitForHttp(APP, 180);
  // The first request makes Metro build the web bundle; do it before any test clock starts.
  await fetch(`${APP}/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app`).catch(
    () => {},
  );
}

async function stopServers() {
  for (const { child } of servers) {
    if (child.pid === undefined || child.exitCode !== null) continue;
    // Expo and Vite start children of their own, so stop the whole process tree on Windows.
    if (process.platform === 'win32') {
      try {
        execFileSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      } catch {}
    } else {
      child.kill();
    }
  }
  for (const port of [54321, EXPO_PORT, 5173]) {
    for (let i = 0; i < 20 && (await portOpen(port)); i++) await pause(500);
    if (await portOpen(port)) console.error(`Warning: port ${port} is still open after the servers were stopped.`);
  }
}

// ---------------------------------------------------------------- one person, one browser context

type Text = string | RegExp;

class Person {
  readonly problems: string[] = [];
  readonly who: string;
  readonly context: BrowserContext;
  readonly page: Page;

  constructor(who: string, context: BrowserContext, page: Page) {
    this.who = who;
    this.context = context;
    this.page = page;
    page.on('pageerror', (e) => this.problems.push(`uncaught: ${e.message}`));
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const text = m.text();
      // The server answers bad requests with 4xx on purpose (a wrong OTP), and the map is
      // loaded from public CDNs that these tests do not depend on.
      if (/Failed to load resource|net::ERR|leaflet|openstreetmap/i.test(text)) return;
      this.problems.push(`console: ${text.slice(0, 400)}`);
    });
  }

  at(text: Text): Locator {
    return this.page
      .getByText(text, { exact: typeof text === 'string' })
      .filter({ visible: true })
      .first();
  }
  async see(text: Text, timeout = 20_000) {
    try {
      await this.at(text).waitFor({ state: 'visible', timeout });
    } catch {
      throw new Error(`${this.who}: expected to see "${text}" within ${timeout / 1000}s`);
    }
  }
  async notSee(text: Text) {
    const n = await this.page
      .getByText(text, { exact: typeof text === 'string' })
      .filter({ visible: true })
      .count();
    assert.equal(n, 0, `${this.who}: did not expect to see "${text}"`);
  }
  async gone(text: Text, timeout = 20_000) {
    try {
      await this.at(text).waitFor({ state: 'hidden', timeout });
    } catch {
      throw new Error(`${this.who}: expected "${text}" to go away within ${timeout / 1000}s`);
    }
  }
  async tap(text: Text, timeout = 20_000) {
    await this.see(text, timeout);
    await this.at(text).click();
  }
  box(index = 0) {
    return this.page.getByRole('textbox').filter({ visible: true }).nth(index);
  }
  async fill(index: number, value: string) {
    await this.box(index).fill(value);
  }
  /** The next browser dialog must say `message`; it is accepted, with `answer` if it is a prompt. */
  expectDialog(message: string, answer?: string) {
    return new Promise<void>((resolve, reject) => {
      this.page.once('dialog', (dialog) => {
        const said = dialog.message();
        (answer === undefined ? dialog.accept() : dialog.accept(answer)).then(() =>
          said === message ? resolve() : reject(new Error(`${this.who}: dialog said "${said}", expected "${message}"`)),
        );
      });
    });
  }
  body() {
    return this.page.evaluate(() => document.body.innerText);
  }
}

let browser: Browser;
let people: Person[] = [];
let realMapTiles = false;

async function person(who: string, geolocation = CENTRAL) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    geolocation: { ...geolocation, accuracy: 10 },
    permissions: ['geolocation'],
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });
  // Map tiles are public and rate-limited; only the screen tour needs the picture.
  if (!realMapTiles) await context.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  const p = new Person(who, context, page);
  people.push(p);
  return p;
}

// ---------------------------------------------------------------- steps shared by the areas

async function signInMobile(who: string, phone: string) {
  const p = await person(who);
  await p.page.goto(APP);
  await p.tap('English', 120_000);
  await p.fill(0, phone);
  await p.tap(t('m.login.sendOtp'));
  await p.see(t('m.login.otp', { phone: `+91${phone}` }));
  await p.fill(0, OTP);
  await p.tap(t('m.login.verify'));
  return p;
}

async function newPassenger(who: string, phone: string) {
  const p = await signInMobile(who, phone);
  await p.see(t('m.welcome.title'));
  await p.fill(0, who);
  await p.tap(new RegExp(escapeRegex(t('m.welcome.ride')) + '$'));
  await p.see(t('m.book.title'));
  return p;
}

async function approvedDriver(who: string, phone: string) {
  const p = await signInMobile(who, phone);
  await p.see(t('m.book.title'));
  await p.tap(t('m.tab.account'));
  await p.tap(t('m.account.driveMode'));
  await p.see(t('m.drive.offline'));
  return p;
}

async function goOnline(d: Person) {
  await d.tap(t('m.drive.goOnline'));
  await d.see(t('m.drive.online'));
  await d.see(t('m.drive.waiting'));
}

async function goOffline(d: Person) {
  await d.page.getByRole('switch', { name: t('m.drive.goOffline') }).click();
  await d.see(t('m.drive.offline'));
}

async function signInAdmin(who: string, phone: string) {
  const p = await person(who);
  await p.page.setViewportSize({ width: 1280, height: 900 });
  await p.page.goto(ADMIN);
  await p.page.locator('form input').first().fill(phone);
  await p.tap(t('m.login.sendOtp'));
  await p.page.locator('form input').nth(1).fill(OTP);
  await p.tap(t('m.login.verify'));
  return p;
}

/** The heading starts with the vehicle's emoji. */
const newRequest = new RegExp(escapeRegex(t('m.drive.newRequest')) + '$');
const bookButton = (service: string) => new RegExp('^' + escapeRegex(t('m.book.confirm', { service: t(service) })));

async function chooseDrop(rider: Person, place = 'Marina Beach') {
  await rider.tap(t('m.book.title'));
  await rider.see(t('m.book.myLocation'));
  await rider.tap(place);
  await rider.see(place);
  // The book button stays off until the first state poll has answered.
  await pause(1500);
}

async function bookAuto(rider: Person, place?: string) {
  await chooseDrop(rider, place);
  await rider.tap(bookButton('category.auto'));
  await rider.see(t('m.trip.searching'));
}

/** The four-digit codes on the passenger's screen; the start OTP is first, then the drop OTP. */
async function readOtp(rider: Person, index = 0) {
  const otp = await rider.page
    .getByText(/^\d{4}$/)
    .filter({ visible: true })
    .nth(index)
    .innerText();
  assert.match(otp, /^\d{4}$/);
  return otp;
}
const wrong = (otp: string) => (otp === '0000' ? '1111' : '0000');

/** Offer, accept and arrive: the driver is then at the pickup and needs the OTP. */
async function acceptAndArrive(driver: Person, rider: Person, name: string) {
  await driver.see(newRequest, 30_000);
  await driver.tap(t('m.drive.accept'));
  await rider.see(t('m.trip.onTheWay', { name }), 15_000);
  await driver.tap(t('trip.action.arrive'));
  await rider.see(t('m.trip.arrived', { name }), 15_000);
}

/** Moves the emulated phone steadily south, about 22 km/h, so the driver's GPS track is real. */
function driveAlong(driver: Person, from = CENTRAL) {
  let i = 0;
  const timer = setInterval(() => {
    i++;
    driver.context.setGeolocation({ latitude: from.latitude - i * 0.0001, longitude: from.longitude, accuracy: 8 }).catch(() => {});
  }, 1800);
  return () => clearInterval(timer);
}

async function fareTotal(p: Person) {
  await p.see(t('fare.total'));
  const match = new RegExp(`${escapeRegex(t('fare.total'))}\\s+(₹[\\d,.]+)`).exec(await p.body());
  assert.ok(match, `${p.who}: no fare total on the receipt`);
  return match[1]!;
}

const driverCard = (admin: Person, phone: string) => admin.page.locator('.card').filter({ hasText: `91${phone}` });

/** The list only refreshes every 15 s; switching tabs reloads it at once. */
async function reloadDrivers(admin: Person, tab: 'a.drivers.pending' | 'a.drivers.all') {
  await admin.tap(tab === 'a.drivers.pending' ? t('a.drivers.all') : t('a.drivers.pending'));
  await admin.tap(t(tab));
}

// ---------------------------------------------------------------- the six areas

async function onboarding() {
  step('a new number applies to drive');
  const driver = await signInMobile('Applicant', PEOPLE.newDriver);
  await driver.see(t('m.welcome.title'));
  await driver.fill(0, 'Arun New');
  await driver.tap(new RegExp(escapeRegex(t('m.welcome.drive')) + '$'));
  await driver.see(t('m.reg.title'));

  step('submit does nothing until all four documents are uploaded');
  await driver.fill(0, 'TN 09 ZZ 4321');
  await driver.fill(1, 'TN0920210099887');
  await driver.tap(t('m.reg.submit'));
  await pause(500);
  await driver.notSee(t('m.reg.status.pending'));

  step('upload licence, RC, permit and insurance through the file picker');
  const uploaded = `✓ ${t('m.reg.uploaded')}`;
  for (let i = 0; i < 4; i++) {
    const [chooser] = await Promise.all([
      driver.page.waitForEvent('filechooser'),
      driver.page.getByText(t('m.reg.gallery'), { exact: true }).filter({ visible: true }).nth(i).click(),
    ]);
    assert.equal(chooser.isMultiple(), false);
    await chooser.setFiles(DOCUMENT_PATH);
    await driver.page.waitForFunction(([text, n]) => document.body.innerText.split(text as string).length - 1 === n, [uploaded, i + 1] as const, {
      timeout: 15_000,
    });
  }

  step('a badly formed number plate is refused in the app');
  await driver.fill(0, 'KA 01 1');
  await driver.tap(t('m.reg.submit'));
  await driver.see(t('m.error.bad_vehicle_number'));
  await driver.fill(0, 'TN 09 ZZ 4321');
  await driver.tap(t('m.reg.submit'));
  await driver.see(t('m.reg.status.pending'));
  await driver.see(t('m.reg.pendingBody'));
  await driver.page.reload();
  await driver.see(t('m.reg.status.pending'), 60_000);

  step('admin opens all four documents and gets the uploaded file back');
  const admin = await signInAdmin('Admin', PEOPLE.admin);
  await admin.see(t('a.nav.overview'));
  await admin.tap(t('a.nav.drivers'));
  const card = driverCard(admin, PEOPLE.newDriver);
  await card.waitFor();
  await assertContains(card, 'TN 09 ZZ 4321');
  await assertContains(card, 'Arun New');
  for (const doc of ['licence', 'rc', 'permit', 'insurance']) {
    const [popup] = await Promise.all([
      admin.context.waitForEvent('page'),
      card.getByRole('button', { name: new RegExp(escapeRegex(t(`m.reg.doc.${doc}`))) }).click(),
    ]);
    await popup.waitForLoadState();
    const res = await admin.context.request.get(popup.url());
    assert.equal(res.status(), 200, `${doc}: signed URL returned ${res.status()}`);
    assert.match(res.headers()['content-type'] ?? '', /^image\/jpeg/, `${doc}: wrong content type`);
    assert.ok(DOCUMENT.equals(await res.body()), `${doc}: the stored file is not the one uploaded`);
    await popup.close();
  }

  step('admin asks for changes; the driver sees the note and can fix and resend');
  const note = 'Licence photo is blurred, please send a clearer one';
  const askChanges = admin.expectDialog(t('a.drivers.notePrompt'), note);
  await card.getByRole('button', { name: t('a.drivers.reject') }).click();
  await askChanges;
  await card.waitFor({ state: 'detached', timeout: 10_000 });
  await driver.tap(t('m.earn.refresh'));
  await driver.see(t('m.reg.status.rejected'));
  await driver.see(t('m.reg.note', { note }));
  const [chooser] = await Promise.all([
    driver.page.waitForEvent('filechooser'),
    driver.page.getByText(t('m.reg.gallery'), { exact: true }).filter({ visible: true }).first().click(),
  ]);
  await chooser.setFiles(DOCUMENT_PATH);
  await pause(1500);
  await driver.tap(t('m.reg.submit'));
  await driver.see(t('m.reg.status.pending'));
  await driver.notSee(t('m.reg.note', { note }));

  step('admin approves and the driver goes online');
  await reloadDrivers(admin, 'a.drivers.pending');
  await card.waitFor();
  await card.getByRole('button', { name: t('a.drivers.approve') }).click();
  await card.waitFor({ state: 'detached', timeout: 10_000 });
  await driver.tap(t('m.earn.refresh'));
  await driver.see(t('m.drive.offline'));
  await goOnline(driver);
  await admin.tap(t('a.nav.overview'));
  const online = admin.page.locator('.counter').filter({ hasText: t('a.count.driversOnline') });
  await assertContains(online, '1');

  step('admin suspends the online driver; the app stops treating them as online');
  await admin.tap(t('a.nav.drivers'));
  await admin.tap(t('a.drivers.all'));
  await card.waitFor();
  const suspendNote = 'Insurance expired';
  const suspend = admin.expectDialog(t('a.drivers.notePrompt'), suspendNote);
  await card.getByRole('button', { name: t('a.drivers.suspend') }).click();
  await suspend;
  await card.getByText(t('m.reg.status.suspended'), { exact: true }).waitFor();
  await driver.see(t('m.reg.status.suspended'), 20_000);
  await driver.see(t('m.reg.note', { note: suspendNote }));
  await driver.notSee(t('m.drive.online'));
  await driver.notSee(t('m.drive.goOnline'));
  await driver.notSee(t('m.reg.submit'));

  step('admin reinstates the driver, who can go online again');
  await card.getByRole('button', { name: t('a.drivers.reinstate') }).click();
  await card.getByText(t('m.reg.status.approved'), { exact: true }).waitFor();
  await driver.tap(t('m.earn.refresh'));
  await driver.see(t('m.drive.offline'));
  await goOnline(driver);
  await goOffline(driver);
}

async function assertContains(locator: Locator, text: string) {
  await locator.waitFor();
  assert.ok((await locator.innerText()).includes(text), `expected "${text}" in: ${await locator.innerText()}`);
}

async function trip() {
  step('a passenger books and a real driver gets the offer');
  const driver = await approvedDriver('Driver', PEOPLE.tripDriver);
  await goOnline(driver);
  const rider = await newPassenger('Priya', PEOPLE.tripRider);
  await bookAuto(rider);
  await driver.see(newRequest, 30_000);
  await driver.see('Marina Beach');
  await driver.see('Chennai Central');

  step('accept and arrive');
  await acceptAndArrive(driver, rider, 'Ravi Trips');
  await rider.see('TN 09 RT 2100');
  const otp = await readOtp(rider);

  step('a short or wrong OTP does not start the trip');
  await driver.fill(0, otp.slice(0, 3));
  await driver.tap(t('trip.action.start'));
  await pause(800);
  await driver.notSee(t('trip.action.complete'));
  await driver.fill(0, wrong(otp));
  await driver.tap(t('trip.action.start'));
  await driver.see(t('m.error.wrong_otp'));
  await driver.notSee(t('trip.action.complete'));
  await rider.see(t('m.trip.arrived', { name: 'Ravi Trips' }));

  step('the right OTP starts it; the driver moves for 30 s');
  await driver.fill(0, otp);
  await driver.tap(t('trip.action.start'));
  await driver.see(t('trip.action.complete'));
  await driver.notSee(t('m.error.wrong_otp'));
  await rider.see(t(`trip.status.IN_PROGRESS`), 15_000);
  const stop = driveAlong(driver);
  await pause(10_000);

  step('both phones survive a reload in the middle of the trip');
  await driver.page.reload();
  await driver.see(t('trip.action.complete'), 60_000);
  await driver.see(t('m.drive.online'));
  await rider.page.reload();
  await rider.see(t('trip.status.IN_PROGRESS'), 60_000);
  await pause(20_000);
  stop();

  step('end the trip; both get the same fare, measured from the GPS track');
  await driver.tap(t('trip.action.complete'));
  await driver.see(t('m.receipt.title'));
  await rider.see(t('m.receipt.title'), 15_000);
  const fare = await fareTotal(driver);
  assert.equal(await fareTotal(rider), fare);
  await rider.see(t('trip.status.COMPLETED'));
  await driver.notSee(t('meter.flag.no-gps-track'));
  // The booking estimate was 4.9 km; a fare from the track is for the few hundred metres driven.
  const distance = new RegExp(`${escapeRegex(t('m.receipt.distance'))}\\s+([\\d.]+)`).exec(await driver.body());
  assert.ok(distance && Number(distance[1]) > 0 && Number(distance[1]) < 1, `receipt distance should come from the GPS track, got ${distance?.[1]} km`);
  await driver.notSee(t('m.receipt.asked'));
  await rider.see(t('m.receipt.asked'));

  step('the driver is back online, with the trip and the day fee counted');
  await driver.tap(t('m.close'));
  await driver.see(t('m.drive.waiting'));
  await driver.see(new RegExp(`^${escapeRegex(t('m.drive.today', { trips: 1, amount: fare }))}`));
  await driver.see('₹10');
  await goOffline(driver);
}

async function parcel() {
  const driver = await approvedDriver('Driver', PEOPLE.parcelDriver);
  await goOnline(driver);
  const rider = await newPassenger('Lakshmi', PEOPLE.parcelRider);

  step('receiver details are required');
  await rider.tap(t('m.tab.parcel'));
  await rider.tap(t('m.parcel.dropSearch'));
  await rider.tap('T. Nagar');
  await rider.tap(t('m.parcel.continue'));
  await rider.see(t('m.error.receiver_required'));
  await rider.fill(0, 'Asha Receiver');
  await rider.fill(1, '9876543210');
  await rider.fill(2, '3');
  await rider.fill(3, 'Documents');
  await rider.tap(t('m.parcel.continue'));
  await pause(1500);
  await rider.tap(bookButton('category.parcel-auto'));
  await rider.see(t('m.trip.searching'));
  await rider.see('Asha Receiver');

  step('the driver accepts and needs the pickup OTP');
  await acceptAndArrive(driver, rider, 'Kumar Parcels');
  await driver.see('Asha Receiver · 3 kg');
  const pickupOtp = await readOtp(rider, 0);
  const dropOtp = await readOtp(rider, 1);
  assert.notEqual(pickupOtp, dropOtp);
  await driver.see(t('m.drive.otp'));
  await driver.fill(0, wrong(pickupOtp));
  await driver.tap(t('trip.action.pickup'));
  await driver.see(t('m.error.wrong_otp'));
  await driver.fill(0, dropOtp);
  await driver.tap(t('trip.action.pickup'));
  await driver.see(t('m.error.wrong_otp'));
  await driver.fill(0, pickupOtp);
  await driver.tap(t('trip.action.pickup'));
  await rider.see(t('trip.status.PICKED_UP'), 15_000);

  step('on the way, then the drop OTP');
  await driver.tap(t('trip.action.depart'));
  await rider.see(t('trip.status.IN_TRANSIT'), 15_000);
  await driver.tap(t('trip.action.reach-drop'));
  await rider.see(t('trip.status.AT_DROP'), 15_000);
  assert.equal(await readOtp(rider), dropOtp, 'the drop OTP stays on the sender’s screen');
  await driver.see(t('m.drive.dropOtp'));
  await driver.fill(0, wrong(dropOtp));
  await driver.tap(t('trip.action.deliver'));
  await driver.see(t('m.error.wrong_otp'));
  await driver.notSee(t('m.receipt.title'));
  await rider.notSee(t('m.receipt.title'));
  await driver.fill(0, dropOtp);
  await driver.tap(t('trip.action.deliver'));

  step('delivered, with a receipt on both phones');
  await driver.see(t('m.receipt.title'));
  await driver.see(t('trip.status.DELIVERED'));
  await rider.see(t('m.receipt.title'), 15_000);
  await rider.see(t('trip.status.DELIVERED'));
  assert.equal(await fareTotal(rider), await fareTotal(driver));
  await driver.tap(t('m.close'));
  await driver.see(t('m.drive.waiting'));
  await goOffline(driver);
}

async function sos() {
  const driver = await approvedDriver('Driver', PEOPLE.sosDriver);
  await goOnline(driver);
  const rider = await newPassenger('Meena', PEOPLE.sosRider);
  await bookAuto(rider);
  await acceptAndArrive(driver, rider, 'Senthil Safety');
  await driver.fill(0, await readOtp(rider));
  await driver.tap(t('trip.action.start'));
  await rider.see(t('trip.status.IN_PROGRESS'), 15_000);
  const code = /TZ-[0-9A-F]{6}/.exec(await rider.body())?.[0];
  assert.ok(code, 'trip code not shown to the passenger');

  step('admin overview has no banner before the alert');
  const admin = await signInAdmin('Admin', PEOPLE.admin);
  await admin.see(t('a.count.driversOnline'));
  const banner = admin.page.locator('.sos-banner');
  assert.equal(await banner.count(), 0);

  step('the passenger presses SOS');
  const alert = rider.expectDialog(t('m.trip.sosConfirm'));
  await rider.tap(new RegExp(`${escapeRegex(t('m.trip.sos'))}$`));
  await alert;
  await rider.see(t('m.trip.sosSent'));
  await rider.see(t('m.trip.call112'));

  step('the banner appears; the incident shows who and which trip');
  await banner.waitFor({ timeout: 15_000 });
  assert.match(await banner.innerText(), new RegExp(escapeRegex(t('a.sosBanner', { n: 1 }))));
  await banner.click();
  await admin.see(t('a.nav.incidents'));
  const card = admin.page.locator('.card.sos').filter({ hasText: code });
  await card.waitFor();
  await assertContains(card, `91${PEOPLE.sosRider}`);
  await assertContains(card, 'Senthil Safety');
  await card.getByRole('link', { name: new RegExp(escapeRegex(t('a.inc.location'))) }).waitFor();

  step('the incident is resolved and the banner clears');
  const resolution = 'Called the passenger, all safe';
  const resolve = admin.expectDialog(t('a.inc.resolvePrompt'), resolution);
  await card.getByRole('button', { name: t('a.inc.resolve') }).click();
  await resolve;
  await card.waitFor({ state: 'detached', timeout: 10_000 });
  await admin.tap(t('a.inc.resolved'));
  await admin.see(`✓ ${resolution}`);
  await admin.tap(t('a.nav.overview'));
  await admin.see(t('a.count.driversOnline'));
  await pause(1000);
  assert.equal(await banner.count(), 0, 'the SOS banner should clear once the incident is resolved');

  step('the trip can still be finished');
  await driver.tap(t('trip.action.complete'));
  await driver.see(t('m.receipt.title'));
  await rider.see(t('m.receipt.title'), 15_000);
  await driver.tap(t('m.close'));
  await driver.see(t('m.drive.waiting'));
  await goOffline(driver);
}

async function roles() {
  step('the department sees only Fare compliance and Fare check');
  const gov = await signInAdmin('Department', PEOPLE.department);
  await gov.see(t('a.gov.title'));
  await gov.see(t('a.comp.note'));
  assert.deepEqual(await gov.page.locator('aside nav a').allInnerTexts(), [t('a.nav.compliance'), t('a.nav.farecheck')]);

  step('an operations page by address falls back to their first page');
  await gov.page.goto(`${ADMIN}/#drivers`);
  await gov.page.reload();
  await gov.see(t('a.comp.note'));
  await gov.notSee(t('a.drivers.checklist'));
  assert.equal(await gov.page.locator('p.warn').count(), 0, 'the department should not see an access error');

  step('the fare check page works for them');
  await gov.tap(t('a.nav.farecheck'));
  await gov.see(t('ui.verify.title'));
  await gov.see(t('fare.total'));
  await gov.tap(t('a.signOut'));
  await gov.see(t('a.login.title'));

  step('a passenger number gets the not-staff message');
  const passenger = await signInAdmin('Passenger', PEOPLE.notStaff);
  await passenger.see(t('a.login.notStaff'));
  assert.equal(await passenger.page.locator('aside nav a').count(), 0);
  await passenger.tap(t('a.signOut'));
  await passenger.see(t('m.login.sendOtp'));
}

async function errors() {
  step('a driver owing ₹100 cannot go online');
  const owing = await approvedDriver('Owes 100', PEOPLE.owesHundred);
  await owing.see('₹100');
  await owing.tap(t('m.drive.goOnline'));
  await owing.see(t('m.error.fees_due'));
  await owing.see(t('m.drive.offline'));
  await owing.notSee(t('m.drive.online'));

  step('a driver owing ₹90 can');
  const almost = await approvedDriver('Owes 90', PEOPLE.owesNinety);
  await almost.see('₹90');
  await goOnline(almost);
  await goOffline(almost);

  step('with nobody online the booking ends cleanly, in about a minute');
  const rider = await newPassenger('Divya', PEOPLE.noDriverRider);
  await bookAuto(rider);
  await rider.see(t('m.trip.noDriver'), 110_000);
  await rider.see(t('m.book.title'));
  await rider.notSee(t('m.trip.searching'));

  step('the passenger can book again and cancel');
  await bookAuto(rider);
  const confirmCancel = rider.expectDialog(t('m.trip.cancelConfirm'));
  await rider.tap(t('m.trip.cancel'));
  await confirmCancel;
  await rider.see(t('m.trip.cancelled'), 15_000);
  await rider.see(t('m.book.title'));
}

// ---------------------------------------------------------------- every vehicle

const RIDE_VEHICLES = [
  { id: 'bike', phone: '9000000013', name: 'Karthik B', plate: 'TN 09 BK 3301' },
  { id: 'scooter', phone: '9000000014', name: 'Revathi S', plate: 'TN 10 SC 7742' },
  { id: 'cab-mini', phone: '9000000015', name: 'Anand M' },
  { id: 'cab-sedan', phone: '9000000016', name: 'Joseph P' },
  { id: 'cab-suv', phone: '9000000017', name: 'Farook A' },
];

async function vehicles() {
  const drivers = new Map<string, Person>();
  for (const v of RIDE_VEHICLES) {
    const d = await approvedDriver(v.name, v.phone);
    await goOnline(d);
    drivers.set(v.id, d);
  }
  const rider = await newPassenger('Vehicle Rider', PEOPLE.vehicleRider);

  for (const v of RIDE_VEHICLES) {
    step(`${v.id}: booked, offered only to a ${v.id} driver, driven to a receipt`);
    const driver = drivers.get(v.id)!;
    await chooseDrop(rider);
    await rider.tap(t(`category.${v.id}`));
    await rider.tap(bookButton(`category.${v.id}`));
    await rider.see(t('m.trip.searching'));
    await driver.see(newRequest, 30_000);
    await driver.see(t(`category.${v.id}`));
    await pause(4000);
    for (const [other, person] of drivers) if (other !== v.id) await person.notSee(newRequest);

    await acceptAndArrive(driver, rider, v.name);
    if (v.plate) await rider.see(v.plate);
    await driver.fill(0, await readOtp(rider));
    await driver.tap(t('trip.action.start'));
    await rider.see(t('trip.status.IN_PROGRESS'), 15_000);
    await driver.tap(t('trip.action.complete'));
    await driver.see(t('m.receipt.title'));
    await rider.see(t('m.receipt.title'), 15_000);
    assert.equal(await fareTotal(rider), await fareTotal(driver));
    await driver.tap(t('m.close'));
    await driver.see(t('m.drive.waiting'));
    await rider.tap(t('m.close'));
    await rider.see(t('m.book.title'));
  }

  step('a parcel too heavy for two wheels can only go by auto');
  await rider.tap(t('m.tab.parcel'));
  await rider.tap(t('m.parcel.dropSearch'));
  await rider.tap('T. Nagar');
  await rider.fill(0, 'Asha Receiver');
  await rider.fill(1, '9876543210');
  await rider.fill(2, '20');
  await rider.tap(t('m.parcel.continue'));
  await rider.see(t('m.book.tooHeavy'));
  await rider.see(t('category.parcel-scooter'));
  await rider.see(bookButton('category.parcel-auto'));
  await rider.page.getByRole('button', { name: t('m.back') }).filter({ visible: true }).first().click();

  step('a light parcel by scooter goes to the scooter driver only');
  await rider.see(t('m.parcel.continue'));
  await rider.fill(2, '2');
  await rider.tap(t('m.parcel.continue'));
  await pause(1500);
  await rider.tap(t('category.parcel-scooter'));
  await rider.tap(bookButton('category.parcel-scooter'));
  await rider.see(t('m.trip.searching'));
  await drivers.get('scooter')!.see(newRequest, 30_000);
  await drivers.get('scooter')!.see(t('category.parcel-scooter'));
  await pause(4000);
  for (const [other, person] of drivers) if (other !== 'scooter') await person.notSee(newRequest);
  const confirmCancel = rider.expectDialog(t('m.trip.cancelConfirm'));
  await rider.tap(t('m.trip.cancel'));
  await confirmCancel;
  await rider.see(t('m.trip.cancelled'), 15_000);

  for (const d of drivers.values()) await goOffline(d);
}

// ---------------------------------------------------------------- every screen, both languages

type Lang = 'en' | 'ta';

/** Opens each screen by the route a person would take, and photographs it into test-results/e2e/screens. */
async function tour(lang: Lang, phones: { rider: string; applicant: string; driver: string; driverName: string }) {
  mkdirSync(join(OUT, 'screens'), { recursive: true });
  const tx = (key: string, params?: Record<string, string | number>) => {
    const text = translate(lang, key, params);
    assert.notEqual(text, key, `missing translation: ${key}`);
    return text;
  };
  const issues: string[] = [];
  const untranslated = new Set<string>();
  let count = 0;

  async function shot(p: Person, name: string, full = false) {
    await pause(600);
    if (full) await p.page.setViewportSize({ width: 390, height: 1800 });
    if (full) await pause(300);
    const label = `${String(++count).padStart(2, '0')}-${name}`;
    await p.page.screenshot({ path: join(OUT, 'screens', `${lang}-${label}.png`) });
    const seen = await p.page.evaluate(() => {
      const width = document.documentElement.clientWidth;
      const texts = [...document.querySelectorAll('div, span')].filter((e) => e.children.length === 0 && e.textContent?.trim() && e.checkVisibility());
      const inView = texts.filter((e) => e.getBoundingClientRect().right > 0 && e.getBoundingClientRect().left < width);
      return {
        wide: document.documentElement.scrollWidth > width,
        cut: inView.filter((e) => e.getBoundingClientRect().right > width + 1 || e.getBoundingClientRect().left < -1).map((e) => e.textContent!),
        strings: inView.map((e) => e.textContent!.trim()),
      };
    });
    if (full) await p.page.setViewportSize({ width: 390, height: 844 });
    if (seen.wide) issues.push(`${label}: the page scrolls sideways`);
    for (const text of seen.cut) issues.push(`${label}: runs off the screen: ${text}`);
    for (const text of seen.strings) {
      if (/^(m|a|ui|trip|category|meter|fare|tariff|parcel)\.[\w.-]+$/.test(text)) issues.push(`${label}: raw translation key: ${text}`);
      if (lang === 'ta' && /[A-Za-z]{3}/.test(text) && !/[஀-௿]/.test(text)) untranslated.add(`${label}: ${text}`);
    }
  }
  const back = (p: Person) => p.page.getByRole('button', { name: tx('m.back') }).filter({ visible: true }).first().click();

  async function signIn(who: string, phone: string, capture = false) {
    const p = await person(`${who} ${lang}`);
    await p.page.goto(APP);
    await p.tap(lang === 'en' ? 'English' : 'தமிழ்', 120_000);
    if (capture) await shot(p, 'login');
    await p.fill(0, phone);
    await p.tap(tx('m.login.sendOtp'));
    await p.see(tx('m.login.otp', { phone: `+91${phone}` }));
    if (capture) await shot(p, 'login-otp');
    await p.fill(0, OTP);
    await p.tap(tx('m.login.verify'));
    return p;
  }

  step(`${lang}: login, welcome and driver sign-up`);
  const applicant = await signIn('Applicant', phones.applicant);
  await applicant.see(tx('m.welcome.title'));
  await applicant.fill(0, 'Tour Applicant');
  await applicant.tap(new RegExp(escapeRegex(tx('m.welcome.drive')) + '$'));
  await applicant.see(tx('m.reg.title'));
  await shot(applicant, 'driver-signup', true);

  const rider = await signIn('Rider', phones.rider, true);
  await rider.see(tx('m.welcome.title'));
  await shot(rider, 'welcome');
  await rider.fill(0, 'Tour Rider');
  await rider.tap(new RegExp(escapeRegex(tx('m.welcome.ride')) + '$'));

  step(`${lang}: booking screens`);
  await rider.see(tx('m.book.title'));
  await shot(rider, 'home');
  await rider.tap(tx('m.book.title'));
  await rider.see(tx('m.book.myLocation'));
  await shot(rider, 'search');
  await rider.tap(lang === 'en' ? 'Marina Beach' : 'மெரினா கடற்கரை');
  await rider.see(new RegExp('^' + escapeRegex(tx('m.book.confirm', { service: tx('category.auto') }))));
  await pause(1500);
  await shot(rider, 'choose-vehicle');
  await rider.tap(tx('m.book.cash'));
  await rider.see(tx('m.profile.payment'));
  await shot(rider, 'payment');
  await back(rider);

  step(`${lang}: driver home, offer and the whole trip, on both phones`);
  const driver = await signIn('Driver', phones.driver);
  await driver.see(tx('m.book.title'));
  await driver.tap(tx('m.tab.account'));
  await driver.tap(tx('m.account.driveMode'));
  await driver.see(tx('m.drive.offline'));
  await shot(driver, 'driver-offline');
  await driver.tap(tx('m.drive.goOnline'));
  await driver.see(tx('m.drive.waiting'));
  await shot(driver, 'driver-online');

  await rider.tap(new RegExp('^' + escapeRegex(tx('m.book.confirm', { service: tx('category.auto') }))));
  await rider.see(tx('m.trip.searching'));
  await shot(rider, 'trip-searching');
  const offer = new RegExp(escapeRegex(tx('m.drive.newRequest')) + '$');
  await driver.see(offer, 30_000);
  await shot(driver, 'driver-offer');
  await driver.tap(tx('m.drive.accept'));
  await rider.see(tx('m.trip.onTheWay', { name: phones.driverName }), 15_000);
  await shot(rider, 'trip-on-the-way');
  await shot(driver, 'driver-to-pickup');
  await driver.tap(tx('trip.action.arrive'));
  await rider.see(tx('m.trip.arrived', { name: phones.driverName }), 15_000);
  await shot(rider, 'trip-arrived');
  await driver.see(tx('m.drive.otp'));
  await shot(driver, 'driver-enter-otp');
  await driver.fill(0, await readOtp(rider));
  await driver.tap(tx('trip.action.start'));
  await rider.see(tx('trip.status.IN_PROGRESS'), 15_000);
  await shot(rider, 'trip-in-progress');
  await driver.see(tx('trip.action.complete'));
  await shot(driver, 'driver-in-progress');
  await driver.tap(tx('trip.action.complete'));
  await driver.see(tx('m.receipt.title'));
  await rider.see(tx('m.receipt.title'), 15_000);
  await shot(rider, 'receipt-rider', true);
  await shot(driver, 'receipt-driver', true);
  await driver.tap(tx('m.close'));
  await driver.see(tx('m.drive.waiting'));
  await rider.tap(tx('m.close'));
  await rider.see(tx('m.book.title'));

  step(`${lang}: earnings and the driver's profile`);
  await driver.tap(tx('m.tab.earnings'));
  await driver.see(tx('m.earn.title'));
  await shot(driver, 'driver-earnings', true);
  await driver.tap(tx('m.tab.account'));
  await driver.see(tx('m.account.rideMode'));
  await shot(driver, 'driver-profile');
  await driver.tap(tx('m.tab.drive'));
  await driver.see(tx('m.drive.waiting'));
  await driver.page.getByRole('switch', { name: tx('m.drive.goOffline') }).click();
  await driver.see(tx('m.drive.offline'));

  step(`${lang}: parcel`);
  await rider.tap(tx('m.tab.parcel'));
  await rider.see(tx('m.parcel.dropSearch'));
  await shot(rider, 'parcel', true);

  step(`${lang}: meter, running, then stopped with no network`);
  await rider.tap(tx('m.tab.meter'));
  await rider.see(tx('m.meter.start'));
  await shot(rider, 'meter-setup', true);
  await rider.tap(tx('m.meter.demo'));
  await rider.tap(tx('m.meter.start'));
  await rider.see(tx('m.meter.stop'));
  await pause(3000);
  await shot(rider, 'meter-running');
  await rider.context.setOffline(true);
  await rider.tap(tx('m.meter.stop'));
  await rider.see(tx('m.receipt.title'));
  await shot(rider, 'meter-receipt', true);
  await rider.context.setOffline(false);
  await rider.tap(tx('m.close'));
  await rider.see(tx('m.meter.start'));

  step(`${lang}: profile and everything it opens`);
  await rider.tap(tx('m.tab.account'));
  await rider.see(tx('m.profile.rides'));
  await shot(rider, 'profile');
  for (const [key, name] of [
    ['m.profile.rides', 'past-rides'],
    ['m.profile.payment', 'profile-payment'],
    ['m.profile.safety', 'safety'],
    ['m.profile.help', 'help'],
  ] as const) {
    await rider.tap(tx(key));
    await pause(500);
    await shot(rider, name, true);
    await back(rider);
    await rider.see(tx('m.profile.rides'));
  }

  writeFileSync(join(OUT, 'screens', `${lang}-english-only.txt`), [...untranslated].join('\n') + '\n');
  assert.deepEqual(issues, [], `screen problems:\n${issues.join('\n')}`);
  console.log(`    · ${lang}: ${count} screens photographed`);
}

async function screens() {
  realMapTiles = true;
  await tour('en', { rider: '9811100010', applicant: '9811100011', driver: PEOPLE.tripDriver, driverName: 'Ravi Trips' });
  await Promise.all(people.map((p) => p.context.close().catch(() => {})));
  await tour('ta', { rider: '9811100012', applicant: '9811100013', driver: '9000000011', driverName: 'Murugan K' });
}

// ---------------------------------------------------------------- runner

const AREAS: Record<string, [string, () => Promise<void>]> = {
  onboarding: ['Driver onboarding and approval', onboarding],
  trip: ['A real driver, no bots', trip],
  parcel: ['Parcel by auto', parcel],
  sos: ['SOS', sos],
  roles: ['Roles', roles],
  errors: ['Errors', errors],
  vehicles: ['Every vehicle', vehicles],
  screens: ['Every screen, English and Tamil', screens],
};

async function runArea(key: string): Promise<string | null> {
  const [title, fn] = AREAS[key]!;
  console.log(`\n${title}`);
  const started = Date.now();
  people = [];
  let failure: string | null = null;
  try {
    await fn();
    const problems = people.flatMap((p) => p.problems.map((x) => `${p.who}: ${x}`));
    assert.deepEqual(problems, [], `the browser reported errors:\n${problems.join('\n')}`);
  } catch (e) {
    failure = (e as Error).message;
    for (const p of people) {
      for (const problem of p.problems) console.error(`    ! ${p.who}: ${problem}`);
      await p.page.screenshot({ path: join(OUT, `${key}-${p.who.replace(/\W+/g, '_')}.png`) }).catch(() => {});
    }
  }
  await Promise.all(people.map((p) => p.context.close().catch(() => {})));
  console.log(failure ? `  ✗ FAILED: ${failure}` : `  ✓ passed in ${Math.round((Date.now() - started) / 1000)} s`);
  return failure;
}

const wanted = process.argv.slice(2);
for (const name of wanted) assert.ok(AREAS[name], `Unknown area "${name}". Areas: ${Object.keys(AREAS).join(', ')}`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const results: [string, string | null][] = [];
let fatal: unknown = null;
try {
  console.log('Starting backend, Expo and admin…');
  await startServers();
  browser = await chromium.launch({ channel: 'chrome', headless: !process.env.HEADED });
  for (const key of wanted.length ? wanted : Object.keys(AREAS)) results.push([key, await runArea(key)]);
  await browser.close();
} catch (e) {
  fatal = e;
} finally {
  await stopServers();
}

console.log('\nSummary');
for (const [key, failure] of results) console.log(`  ${failure ? '✗' : '✓'} ${AREAS[key]![0]}${failure ? `: ${failure.split('\n')[0]}` : ''}`);
if (fatal) console.error(`\nCould not run: ${(fatal as Error).message}`);
process.exit(fatal || results.some(([, failure]) => failure) ? 1 : 0);
