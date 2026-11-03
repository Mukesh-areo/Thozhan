// Captures real screenshots of the web app (../web) for the explainer video.
// Drives the app through its own UI and demo hooks in headless Chrome or Edge.
// Usage: node capture-screens.cjs   (set CHROME_PATH to override the browser)
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const puppeteer = require("puppeteer-core");

const WEB = path.resolve(__dirname, "../web");
const OUT = path.resolve(__dirname, "public/screens");
const BROWSERS = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
// Pin the app clock to a weekday morning in IST so screens show daytime fares.
const CLOCK = Date.parse("2026-11-04T11:00:00+05:30");

const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".webmanifest": "application/manifest+json",
};
function serve() {
  const server = http.createServer((req, res) => {
    const file = path.join(
      WEB,
      decodeURIComponent(new URL(req.url, "http://x").pathname).replace(
        /\/$/,
        "/index.html",
      ),
    );
    if (!file.startsWith(WEB) || !fs.existsSync(file))
      return res.writeHead(404).end();
    res.writeHead(200, {
      "content-type": TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, () => resolve(server)));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const executablePath = BROWSERS.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("No Chrome/Edge found; set CHROME_PATH");
  const server = await serve();
  const url = `http://localhost:${server.address().port}/`;
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--hide-scrollbars"],
  });

  async function open(viewport, locale) {
    // Each view gets its own browser context so their localStorage stays apart.
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ ...viewport, deviceScaleFactor: 2 });
    await page.evaluateOnNewDocument(
      (clock, locale) => {
        const offset = clock - Date.now();
        const RealDate = Date;
        class ShiftedDate extends RealDate {
          constructor(...a) {
            super(...(a.length ? a : [RealDate.now() + offset]));
          }
          static now() {
            return RealDate.now() + offset;
          }
        }
        globalThis.Date = ShiftedDate;
        // Seed once per tab; a reload must keep the state the script built up.
        if (!sessionStorage.getItem("seeded")) {
          sessionStorage.setItem("seeded", "1");
          localStorage.clear();
          localStorage.setItem("thozhan-locale", locale);
        }
      },
      CLOCK,
      locale,
    );
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.evaluate(() => document.fonts.ready);
    return page;
  }
  const shot = async (page, name) => {
    await sleep(250);
    await page.evaluate(
      () => (document.querySelector("#toast").style.display = "none"),
    );
    await page.screenshot({ path: path.join(OUT, name + ".png") });
    console.log("captured", name);
  };
  const js = (page, fn, ...args) => page.evaluate(fn, ...args);
  const click = (page, sel) =>
    page.evaluate((s) => document.querySelector(s).click(), sel);
  const scrollTo = (page, sel, offset = 80) =>
    page.evaluate(
      (s, o) =>
        window.scrollTo(
          0,
          document.querySelector(s).getBoundingClientRect().top +
            window.scrollY -
            o,
        ),
      sel,
      offset,
    );

  const desktop = { width: 1440, height: 900 };
  const phone = { width: 390, height: 844 };

  // Passenger booking, English and Tamil
  let page = await open(desktop, "en");
  await js(page, () => {
    document.querySelector("#drop").value = "2";
    document.querySelector("#drop").onchange();
  });
  await shot(page, "book-en");
  await click(page, "#breakdown");
  await shot(page, "fare-details");
  await click(page, "#close-dialog");
  await page.close();

  page = await open(desktop, "ta");
  await js(page, () => {
    document.querySelector("#drop").value = "2";
    document.querySelector("#drop").onchange();
  });
  await shot(page, "book-ta");
  await page.close();

  // Ride lifecycle across passenger and driver views
  page = await open(desktop, "en");
  await js(page, () => {
    document.querySelector("#drop").value = "2";
    document.querySelector("#drop").onchange();
  });
  await click(page, "#book");
  await js(page, () => window.scrollTo(0, 0));
  await shot(page, "requested");
  await js(page, () => thozhanDemo.go("driver"));
  await scrollTo(page, ".driver-grid");
  await shot(page, "driver-request");
  await click(page, "#advance");
  await click(page, "#advance");
  await js(page, () => {
    document.querySelector("#otp-input").value = thozhanDemo.active().startOtp;
  });
  await scrollTo(page, ".driver-grid");
  await shot(page, "driver-otp");
  await click(page, "#advance");
  await click(page, "#advance");
  await js(page, () => window.scrollTo(0, 0));
  await shot(page, "driver-earnings");

  // Parcel
  await js(page, () => thozhanDemo.go("parcel"));
  await js(page, () => {
    document.querySelector("#drop").value = "5";
    document.querySelector("#drop").onchange();
    document.querySelector("#receiver").value = "Meena";
    document.querySelector("#weight").value = "3";
  });
  await shot(page, "parcel-book");
  await click(page, "#book-parcel");
  await js(page, () => window.scrollTo(0, 0));
  await shot(page, "parcel-otps");
  await js(page, () => thozhanDemo.go("driver"));
  for (const otp of ["", "start", "", "", "", "drop"]) {
    await js(
      page,
      (otp) => {
        const t = thozhanDemo.active();
        const input = document.querySelector("#otp-input");
        if (input) input.value = otp === "start" ? t.startOtp : t.dropOtp;
        document.querySelector("#advance").click();
      },
      otp,
    );
  }

  // Virtual auto meter on a phone, in Tamil, using the demo simulation
  const phonePage = await open(phone, "ta");
  await js(phonePage, () => thozhanDemo.go("meter"));
  await js(phonePage, () => {
    document.querySelector("#vehicle-number").value = "TN 09 AB 4821";
    document.querySelector("#source-sim").click();
    document.querySelector("#vehicle-number").value = "TN 09 AB 4821";
  });
  await scrollTo(phonePage, ".booking", 20);
  await shot(phonePage, "meter-start");
  await click(phonePage, "#meter-start");
  await sleep(24000);
  await scrollTo(phonePage, ".booking", 20);
  await shot(phonePage, "meter-running");
  await sleep(40000);
  await js(phonePage, () => document.querySelector("#meter-stop").click());
  // An illustrative overcharge: the driver asks 40% above the meter.
  await js(phonePage, () => {
    document.querySelector("#asked").value = String(
      Math.round((thozhanDemo.state.trips[0].fare.totalPaise / 100) * 1.4),
    );
  });
  await shot(phonePage, "meter-receipt");
  await js(phonePage, () =>
    document.querySelector("#report-overcharge").click(),
  );
  // Carry the meter trip and report into the desktop session for the Operations view.
  const saved = await js(phonePage, () => localStorage.getItem("thozhan-v2"));
  await phonePage.close();
  const merged = JSON.parse(
    await js(page, () => localStorage.getItem("thozhan-v2")),
  );
  const meterState = JSON.parse(saved);
  merged.trips.unshift(...meterState.trips);
  merged.cases.push(
    ...meterState.cases.map((c, i) => ({
      ...c,
      id: "CASE-" + (merged.cases.length + i + 1),
    })),
  );
  await js(
    page,
    (s) => localStorage.setItem("thozhan-v2", s),
    JSON.stringify(merged),
  );
  await page.reload({ waitUntil: "networkidle0" });

  // Operations and fare check
  await js(page, () => thozhanDemo.go("ops"));
  await shot(page, "ops");
  await scrollTo(page, ".driver-grid", 40);
  await shot(page, "ops-compliance");
  await js(page, () => thozhanDemo.go("verify"));
  await js(page, () => {
    const set = (id, v) => {
      const e = document.querySelector(id);
      e.value = v;
      e.dispatchEvent(new Event("input"));
    };
    set("#v-km", "5");
    set("#v-waiting", "6");
    set("#v-start", "2026-11-04T11:00");
  });
  await shot(page, "verify-day");
  await js(page, () => {
    const e = document.querySelector("#v-start");
    e.value = "2026-11-04T23:00";
    e.dispatchEvent(new Event("input"));
  });
  await shot(page, "verify-night");

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
