// Records an end-to-end test of the mobile app, once in English and once in Tamil.
//
//   node scripts/record-app.ts            # both languages
//   node scripts/record-app.ts ta         # one language
//
// It starts the local backend (fresh data, demo driver bots) and the Expo web app, then
// drives the real app in Chrome at phone size: sign-in, booking, a bot driver completing
// the trip, the receipt and an overcharge report, the street meter, and the driver's
// earnings. Each step waits for the screen it expects, so a broken flow fails the run.
// Output: media/Thozhan-App-Test-<Language>.mp4. Needs Google Chrome installed.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { t as translate, type Locale } from '@thozhan/i18n';
import { chromium, type FrameLocator, type Page } from 'playwright-core';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const APP = 'http://localhost:8081';
const STAGE = { width: 1280, height: 880 };
const FFMPEG = join(ROOT, 'video/node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe');

const CAPTIONS: Record<string, Record<Locale, [string, string]>> = {
  intro: {
    en: ['Thozhan app test', 'A recorded run of the real app against the local backend. The two auto drivers are demo bots.'],
    ta: ['தோழன் செயலி சோதனை', 'உள்ளூர் சேவையகத்துடன் உண்மையான செயலியின் பதிவு. இரண்டு ஆட்டோ ஓட்டுநர்களும் சோதனை போட்கள்.'],
  },
  login: {
    en: ['Sign in with a phone number', 'Choose the language, enter the number and the OTP. The test server OTP is 123456.'],
    ta: ['தொலைபேசி எண்ணுடன் உள்நுழைவு', 'மொழியைத் தேர்ந்தெடுத்து, எண்ணையும் OTP-யையும் உள்ளிடவும். சோதனை OTP 123456.'],
  },
  welcome: {
    en: ['First visit', 'The passenger enters a name and chooses to ride.'],
    ta: ['முதல் வருகை', 'பயணி பெயரை உள்ளிட்டு சவாரியைத் தேர்ந்தெடுக்கிறார்.'],
  },
  book: {
    en: ['Book an auto', 'Pick a drop point. The estimate comes from the G.O. 366 government tariff.'],
    ta: ['ஆட்டோ முன்பதிவு', 'இறங்கும் இடத்தைத் தேர்வு செய்யவும். மதிப்பீடு அரசு கட்டண அரசாணை 366-இன் படி.'],
  },
  waiting: {
    en: ['Finding a driver', 'Nearby approved drivers get the request. The first to accept wins it.'],
    ta: ['ஓட்டுநரைத் தேடுகிறது', 'அருகிலுள்ள அங்கீகரிக்கப்பட்ட ஓட்டுநர்களுக்குக் கோரிக்கை செல்கிறது. முதலில் ஏற்பவருக்குப் பயணம்.'],
  },
  trip: {
    en: ['Driver on the way', 'The passenger sees the driver, the vehicle number and the map, and gives the OTP to start.'],
    ta: ['ஓட்டுநர் வருகிறார்', 'பயணி ஓட்டுநர், வாகன எண், வரைபடத்தைப் பார்த்து, தொடங்க OTP-ஐத் தருகிறார்.'],
  },
  receipt: {
    en: ['Receipt', 'The server measures the fare from the GPS track and lists every line of the tariff.'],
    ta: ['ரசீது', 'GPS தடத்தைக் கொண்டு சேவையகம் கட்டணத்தைக் கணக்கிட்டு, ஒவ்வொரு வரியையும் காட்டுகிறது.'],
  },
  overcharge: {
    en: ['Report an overcharge', 'If the driver asks for more, the passenger reports it. Operations sees it at once.'],
    ta: ['அதிகக் கட்டணப் புகார்', 'ஓட்டுநர் கூடுதலாகக் கேட்டால் பயணி புகார் செய்கிறார். செயல்பாட்டுக் குழு உடனே பார்க்கிறது.'],
  },
  meter: {
    en: ['Street-hail meter', 'For autos stopped on the street. Demo route: a sample ride replayed at 10× speed.'],
    ta: ['தெரு மீட்டர்', 'தெருவில் நிறுத்திய ஆட்டோக்களுக்கு. சோதனை வழி: மாதிரிப் பயணம் 10 மடங்கு வேகத்தில்.'],
  },
  meterReceipt: {
    en: ['Meter receipt', 'The trip is uploaded and priced again by the server, so the fare cannot be edited on the phone.'],
    ta: ['மீட்டர் ரசீது', 'பயணம் பதிவேற்றப்பட்டு சேவையகம் மீண்டும் கணக்கிடுகிறது; தொலைபேசியில் கட்டணத்தை மாற்ற முடியாது.'],
  },
  driver: {
    en: ['Driver mode', 'Murugan, an approved driver, signs in. The same app switches to driver mode.'],
    ta: ['ஓட்டுநர் பயன்முறை', 'அங்கீகரிக்கப்பட்ட ஓட்டுநர் முருகன் உள்நுழைகிறார். அதே செயலி ஓட்டுநர் பயன்முறைக்கு மாறுகிறது.'],
  },
  earnings: {
    en: ['Earnings and the ₹10 day fee', 'No commission: ₹10 per working day, charged after the first trip of the day.'],
    ta: ['வருமானம் மற்றும் ₹10 நாள் கட்டணம்', 'கமிஷன் இல்லை: வேலை செய்த நாளுக்கு ₹10, அன்றைய முதல் பயணத்திற்குப் பிறகு.'],
  },
  done: {
    en: ['Test passed', 'Every screen loaded with the expected content.'],
    ta: ['சோதனை வெற்றி', 'ஒவ்வொரு திரையும் எதிர்பார்த்த உள்ளடக்கத்துடன் வந்தது.'],
  },
};

// A frame around the app: the phone on the left, the step being tested on the right.
const STAGE_HTML = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
<style>
  body { margin: 0; height: 100vh; background: #0f3329; display: flex; align-items: center; gap: 64px; padding: 0 80px; box-sizing: border-box;
         font-family: Inter, 'Noto Sans Tamil', 'Nirmala UI', sans-serif; color: #fff; }
  .phone { flex: none; width: 375px; height: 812px; border-radius: 36px; overflow: hidden; border: 10px solid #000; background: #f4f1ea; box-shadow: 0 20px 60px #0008; }
  iframe { width: 100%; height: 100%; border: 0; display: block; }
  .step { font-size: 22px; color: #c7e86b; font-weight: 700; letter-spacing: .04em; }
  h1 { font-size: 48px; line-height: 1.25; margin: 12px 0 20px; }
  p { font-size: 26px; line-height: 1.6; color: #d5e4dc; margin: 0; max-width: 640px; }
  .brand { position: fixed; top: 32px; right: 48px; font-size: 20px; color: #a9c3b8; }
</style></head><body>
<div class="phone"><iframe id="app" src="${APP}/" allow="geolocation; clipboard-write"></iframe></div>
<div><div class="step" id="step"></div><h1 id="title"></h1><p id="body"></p></div>
<div class="brand">Thozhan · தோழன்</div>
<script>window.caption = (s, t, b) => { step.textContent = s; title.textContent = t; body.textContent = b; };</script>
</body></html>`;

function start(name: string, args: string[], cwd = ROOT): ChildProcess {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, CI: '1', BROWSER: 'none' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', (d) => process.env.VERBOSE && process.stdout.write(`[${name}] ${d}`));
  child.stderr!.on('data', (d) => process.env.VERBOSE && process.stderr.write(`[${name}] ${d}`));
  return child;
}

async function waitForHttp(url: string, seconds: number) {
  for (let i = 0; i < seconds; i++) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`${url} did not answer within ${seconds}s`);
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function record(locale: Locale, out: string) {
  const t = (key: string, params?: Record<string, string | number>) => translate(locale, key, params);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const videoDir = join(ROOT, 'media/.recording');
  rmSync(videoDir, { recursive: true, force: true });
  const context = await browser.newContext({
    viewport: STAGE,
    recordVideo: { dir: videoDir, size: STAGE },
    geolocation: { latitude: 13.0827, longitude: 80.2752 },
    permissions: ['geolocation', 'clipboard-read', 'clipboard-write'],
    locale: locale === 'ta' ? 'ta-IN' : 'en-IN',
    timezoneId: 'Asia/Kolkata',
  });
  const page: Page = await context.newPage();
  await page.route(`${APP}/__stage__`, (route) => route.fulfill({ contentType: 'text/html', body: STAGE_HTML }));
  await page.goto(`${APP}/__stage__`);
  const app: FrameLocator = page.frameLocator('#app');
  let n = 0;
  const steps = Object.keys(CAPTIONS).length;
  async function caption(key: string) {
    const [title, body] = CAPTIONS[key]![locale];
    n++;
    await page.evaluate(
      ([s, a, b]) => (window as unknown as { caption: (...x: string[]) => void }).caption(s!, a!, b!),
      [`${locale === 'ta' ? 'படி' : 'STEP'} ${n} / ${steps}`, title, body],
    );
    console.log(`  ${n}. ${title}`);
  }
  const text = (s: string | RegExp) => app.getByText(s, { exact: typeof s === 'string' }).first();
  async function tap(s: string | RegExp, wait = 900) {
    await text(s).click({ timeout: 30_000 });
    await pause(wait);
  }
  async function typeInto(index: number, value: string) {
    const box = app.getByRole('textbox').nth(index);
    await box.click();
    await box.pressSequentially(value, { delay: 90 });
    await pause(400);
  }
  async function scrollApp(px: number, steps = 6) {
    await page.mouse.move(80 + 187, 440);
    for (let i = 0; i < steps; i++) {
      await page.mouse.wheel(0, px / steps);
      await pause(250);
    }
  }
  async function signIn(phone: string) {
    await typeInto(0, phone);
    await tap(t('m.login.sendOtp'));
    await typeInto(0, '123456');
    await tap(t('m.login.verify'), 2500);
  }

  let ok = false;
  try {
    await caption('intro');
    await text(t('m.login.sendOtp')).waitFor({ timeout: 120_000 });
    await pause(2500);

    await caption('login');
    await tap(locale === 'ta' ? 'தமிழ்' : 'English', 1200);
    await signIn('9' + String(Date.now()).slice(-9));

    await caption('welcome');
    await typeInto(0, locale === 'ta' ? 'பிரியா' : 'Priya');
    // The button starts with an emoji, so match the end of its label.
    await tap(new RegExp(t('m.welcome.ride') + '$'), 2500);

    await caption('book');
    await tap(t('m.book.choosePlace'));
    await tap(locale === 'ta' ? 'மெரினா கடற்கரை' : 'Marina Beach', 1500);
    await scrollApp(500);
    await tap(new RegExp('^' + t('m.book.confirm', { service: t('category.auto') })), 1500);

    await caption('waiting');
    await text(/TN 09 AB 4821|TN 09/).waitFor({ timeout: 60_000 });
    await caption('trip');
    await pause(6000);
    await scrollApp(400);
    await pause(4000);
    await scrollApp(-400);

    await text(t('m.receipt.title')).waitFor({ timeout: 90_000 });
    await caption('receipt');
    await pause(2500);
    await scrollApp(500, 8);
    await pause(3000);

    await caption('overcharge');
    await scrollApp(300);
    await typeInto(0, '200');
    await tap(t('m.receipt.report'), 2500);
    await text(t('m.receipt.reported')).waitFor({ timeout: 15_000 });
    await pause(1500);

    // Receipts open over the tabs; close them to get the tab bar back.
    await tap(t('m.close'), 1500);
    await caption('meter');
    await tap(t('m.tab.meter'), 1500);
    await tap(t('m.meter.demo'));
    await tap(t('m.meter.start'), 1000);
    await text(t('m.meter.stop')).waitFor({ timeout: 15_000 });
    await pause(25_000);
    await tap(t('m.meter.stop'), 1000);

    await text(t('m.receipt.title')).waitFor({ timeout: 30_000 });
    await caption('meterReceipt');
    await pause(2500);
    await scrollApp(500, 8);
    await pause(2500);

    await tap(t('m.close'), 1500);
    await caption('driver');
    await tap(t('m.tab.account'), 1200);
    await tap(t('m.signOut'), 2000);
    await tap(locale === 'ta' ? 'தமிழ்' : 'English', 600);
    await signIn('9000000011');
    await tap(t('m.tab.account'), 1200);
    await tap(locale === 'ta' ? 'தமிழ்' : 'English', 800);
    await tap(t('m.account.driveMode'), 2500);
    await text(new RegExp(`${t('m.drive.online')}|${t('m.drive.offline')}`)).waitFor({ timeout: 20_000 });
    await pause(3500);

    await caption('earnings');
    await tap(t('m.tab.earnings'), 3500);
    await scrollApp(400);
    await pause(3000);

    await caption('done');
    await pause(3500);
    ok = true;
  } finally {
    const video = page.video();
    await context.close();
    await browser.close();
    const webm = await video!.path();
    mkdirSync(join(ROOT, 'media'), { recursive: true });
    // A failed run keeps its video, under a name that says so, to show where it broke.
    await encode(webm, ok ? out : out.replace(/\.mp4$/, '-FAILED.mp4'));
    rmSync(videoDir, { recursive: true, force: true });
  }
}

/** WebM from Chrome to an H.264 MP4 that plays everywhere. */
function encode(input: string, output: string) {
  return new Promise<void>((resolve, reject) => {
    const tmp = output + '.part.mp4';
    const ff = spawn(
      FFMPEG,
      ['-y', '-i', input, '-c:v', 'libx264', '-preset', 'medium', '-crf', '28', '-pix_fmt', 'yuv420p', '-r', '25', '-movflags', '+faststart', '-an', tmp],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    let log = '';
    ff.stderr.on('data', (d) => (log = (log + d).slice(-2000)));
    ff.on('exit', (code) => {
      if (code !== 0) return reject(new Error('ffmpeg failed:\n' + log));
      renameSync(tmp, output);
      resolve();
    });
  });
}

const locales = (process.argv[2] ? [process.argv[2]] : ['en', 'ta']) as Locale[];
if (!existsSync(FFMPEG)) throw new Error(`ffmpeg not found at ${FFMPEG}; run npm ci in video/ first`);

const backend = start('backend', ['supabase/dev/server.ts', '--fresh', '--bots']);
const expo = start('expo', [join(ROOT, 'node_modules/expo/bin/cli'), 'start', '--web', '--port', '8081'], join(ROOT, 'apps/mobile'));
let failed = false;
try {
  await waitForHttp('http://localhost:54321/rest/v1/', 60);
  await waitForHttp(APP, 180);
  // The first request makes Metro build the web bundle; do it before the camera rolls.
  await fetch(`${APP}/node_modules/expo-router/entry.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app`).catch(
    () => {},
  );
  for (const locale of locales) {
    const name = locale === 'ta' ? 'Tamil' : 'English';
    console.log(`Recording ${name}…`);
    try {
      await record(locale, join(ROOT, `media/Thozhan-App-Test-${name}.mp4`));
      console.log(`  saved media/Thozhan-App-Test-${name}.mp4`);
    } catch (e) {
      failed = true;
      console.error(`  ${name} run failed: ${(e as Error).message.split('\n')[0]}`);
    }
  }
} finally {
  backend.kill();
  expo.kill();
  for (const f of existsSync(join(ROOT, 'media')) ? readdirSync(join(ROOT, 'media')) : []) if (f.endsWith('.part.mp4')) rmSync(join(ROOT, 'media', f));
}
process.exit(failed ? 1 : 0);
