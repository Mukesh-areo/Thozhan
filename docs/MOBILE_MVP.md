# Running the Thozhan MVP

The MVP is three pieces:

| Piece | Folder | What it is |
| --- | --- | --- |
| Backend | `supabase/` | Postgres schema, security rules and edge functions for Supabase |
| Mobile app | `apps/mobile` | One Expo Android app: passenger booking, driver mode, street meter |
| Admin dashboard | `apps/admin` | React web app for operations staff and a read-only view for the Transport Department |

You can run all three on one computer with no Supabase account. A local server stands in for Supabase, using the same SQL migrations and the same edge-function code.

## 1. Run it locally

You need Node 22.18 or newer. From the repository root:

```bash
npm install
```

Then start each piece in its own terminal:

```bash
npm run dev:backend
```

```bash
npm run dev:admin
```

```bash
npm run dev:mobile
```

| Piece | Address |
| --- | --- |
| Backend | http://localhost:54321 (it also prints the address for your Wi-Fi network) |
| Admin dashboard | http://localhost:5173 |
| Mobile app in a browser | press `w` in the Expo terminal, or open http://localhost:8081 |

`dev:backend` keeps its data in `supabase/.dev-data` between runs. To start again from the seed data, run `npm run dev:backend:fresh`.

### Test accounts

Every number uses the OTP **123456**. Type the 10-digit number; the app adds +91.

| Number | Who |
| --- | --- |
| 90000 00001 | Admin (all dashboard pages) |
| 90000 00002 | Transport Department (fare compliance and fare check only) |
| 90000 00011 | Murugan K, approved auto driver, TN 09 AB 4821 |
| 90000 00012 | Selvi R, approved auto driver |
| Any other number | A new passenger, who can also apply to drive |

With `--bots` (on by default in `dev:backend`), the two demo drivers run by themselves. They go online, accept nearby requests and move each trip along over about a minute, so one person can try the passenger app alone. The bots also write a simulated GPS track for each trip, so the server computes the fare from that track just as it would for a real driver. To drive a trip yourself, sign in as a driver on a second phone or browser and turn the bots off by running `node supabase/dev/server.ts` without `--bots`.

### A demo in five minutes

1. In the mobile app, sign in with a new number, enter a name and choose **I need a ride**.
2. Pick a drop point and press **Book Auto**. A bot driver accepts within a few seconds. The app shows the driver, the vehicle, the map and the trip OTP.
3. **Share trip** creates a tracking link. Open it in a browser to see the public tracking page.
4. When the trip ends, the receipt shows the fare from the government tariff, line by line. Enter a higher amount under *Did the driver ask for more?* to file an overcharge report.
5. In the admin dashboard, sign in as 90000 00001. Check the overview, the trip list, the overcharge case and the fare-compliance page.
6. Back in the app, open **Meter**, choose **Demo route** and start the street meter. It replays a sample ride at 10× speed. Stop it to get a receipt priced by the server.
7. Sign in as 90000 00011, switch to driver mode and open **Earnings**. Pay the ₹10 day fee using the test payment page; the balance goes to zero.

## 2. Run it on an Android phone

### Expo Go (quickest)

1. Install **Expo Go** from the Play Store.
2. Connect the phone and the computer to the same Wi-Fi.
3. Start the backend and the app as above, then scan the QR code shown by `npm run dev:mobile`.

The app finds the backend through the same address Expo uses, so nothing needs configuring. If Windows asks, allow Node through the firewall on private networks.

Expo Go cannot keep the location running with the screen off. The meter and driver mode then fall back to foreground tracking, and the app tells the user to keep the screen on. Background location needs the APK build below.

### APK (installable app with background location)

1. Create a free Expo account, then install the build tool and sign in:

   ```bash
   npm install -g eas-cli
   ```

   ```bash
   eas login
   ```

2. In `apps/mobile/eas.json`, replace the `YOUR-…` values with your Supabase project URL, its anon key, and the address of the admin dashboard's `/track/` page.
3. Build:

   ```bash
   cd apps/mobile && eas build --platform android --profile preview
   ```

   EAS builds in the cloud and returns a link to an `.apk` you can install on any Android phone. The `production` profile builds an `.aab` for the Play Store.

## 3. Move to a real Supabase project

The local server stands in for Supabase but is not Supabase. These steps have not been run against a live project yet, so expect small fixes the first time.

1. Create a project at supabase.com (Mumbai region), then link it and push the schema:

   ```bash
   npx supabase link --project-ref YOUR-PROJECT-REF
   ```

   ```bash
   npx supabase db push
   ```

   `supabase/seed.sql` holds the demo staff and drivers. Load it only into a test project.
2. **Phone sign-in:** in *Authentication → Providers → Phone*, connect an SMS provider with DLT registration (MSG91 or Twilio). Until then, add test numbers with fixed OTPs on the same page.
3. **Staff accounts:** after a staff member signs in once, set their role in the SQL editor:

   ```sql
   update profiles set staff_role = 'admin' where phone = '91XXXXXXXXXX';
   ```

4. **Edge functions:** set the secrets, then deploy the functions. The functions import the shared packages through `supabase/functions/deno.json`.

   ```bash
   npx supabase secrets set RAZORPAY_KEY_ID=… RAZORPAY_KEY_SECRET=… RAZORPAY_WEBHOOK_SECRET=…
   ```

   ```bash
   npx supabase functions deploy finish-trip sync-meter fee-payment-link
   ```

   ```bash
   npx supabase functions deploy razorpay-webhook --no-verify-jwt
   ```

5. **Razorpay:** create a webhook for `payment_link.paid` pointing at `https://YOUR-PROJECT.supabase.co/functions/v1/razorpay-webhook`, with the same secret.
6. **Admin dashboard:** build it with the project settings and host the `dist/` folder on any static host (Netlify, Vercel, Cloudflare Pages). Send every path to `index.html` so `/track/…` links work.

   ```bash
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY npm run build:admin
   ```

## 4. Checks

```bash
npm run typecheck && npm run typecheck:apps && npm test
```

`npm test` includes the backend tests in `supabase/test`. They run the real migrations in an in-memory Postgres (PGlite) and cover:

- the security rules;
- the booking race between two drivers;
- OTPs;
- dispatch waves;
- fares measured from the GPS track;
- the once-a-day fee;
- meter sync;
- the payment webhook;
- a supabase-js client against the local server.

### Browser tests

```bash
npm run test:e2e
```

This runs the flows that need more than one person through the real apps in Chrome, with a separate browser for each passenger, driver and admin and no demo bots: driver onboarding and approval, a full trip, a parcel delivery, SOS, staff roles, and the error cases. It takes about five minutes. It starts the backend with fresh data, Expo and the admin dashboard itself, on ports 54321, 8081 and 5173, and stops if any of those is already in use. Set `E2E_EXPO_PORT` to run Expo on another port. To run only some areas, name them:

```bash
node scripts/e2e.ts trip parcel
```

The areas are `onboarding`, `trip`, `parcel`, `sos`, `roles` and `errors`. A failing area saves a screenshot of each open screen to `test-results/e2e`, next to the server logs.

### Recorded app test

```bash
npm run record:app
```

This runs the whole app test in Chrome at phone size, once in English and once in Tamil, with a caption for each step. It starts the backend with fresh data and the Expo web app itself, so stop any copies you already have running first. Each step waits for the screen it expects, so a broken flow stops the run and saves its video with `-FAILED` in the name.

The videos are saved to:

- [media/Thozhan-App-Test-English.mp4](../media/Thozhan-App-Test-English.mp4)
- [media/Thozhan-App-Test-Tamil.mp4](../media/Thozhan-App-Test-Tamil.mp4)

It needs Google Chrome, and the ffmpeg that comes with `npm ci` in `video/`.

## 5. Known limits

- The apps check for updates every few seconds rather than using Supabase Realtime. That is simple and reliable for a pilot, but uses more requests.
- Places are a fixed list of Chennai landmarks plus "my current location". There is no address search yet.
- Maps use OpenStreetMap's public tiles, which are for light use only. A pilot needs its own tile provider.
- Bike, cab and other parcel services are built but switched off in **Services** until approval. Their fares are illustrative.
- The auto fare follows G.O. Ms. No. 366. Three interpretations are marked on every receipt until the department confirms them, so receipts say "reference fare only".
- Tamil text needs review by a native speaker before the pilot.
