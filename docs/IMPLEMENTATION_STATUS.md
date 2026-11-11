# Implementation status

Snapshot prepared 4 November 2026. Milestones refer to the [MVP plan](MVP_PLAN.md).

| Area | Present implementation | Still required |
| --- | --- | --- |
| Backend (M1) | Supabase schema with row-level security on every table. Clients reach data only through checked database functions. Edge functions handle finishing trips, meter sync, fee payment links and the Razorpay webhook. Backend tests run the real migrations in PGlite, including every staff role allowed and refused. A local server stands in for Supabase for development. The four edge functions pass `deno check` in CI and were served on Deno with a fake Supabase (`npm run test:deno`). | First deployment to a real Supabase project, including the functions on Supabase's own edge runtime; load testing |
| Accounts | Phone OTP sign-in, profile, Tamil or English per user, staff roles `admin`, `support`, `reviewer` and `gov`, enforced in the database | SMS provider with DLT registration |
| Passenger (M2) | Book auto or parcel from Chennai landmarks or current location, live driver on a map, trip OTP, share link, SOS, receipt, overcharge and complaint reports, trip history | Address search and road routing; Realtime instead of polling |
| Driver (M3) | Apply with licence, RC, permit and insurance photos; go online; offers with a 30-second timer; atomic accept; arrive, OTP start, finish; earnings | Background GPS checked on real phones in an APK build; navigation hand-off |
| Dispatch | Nearest approved online drivers, in waves of 3 at 3, 6, 12 and 24 km. Cancels with "no driver" after four waves. | Driver ratings and acceptance-rate rules; surge is intentionally absent |
| Fares | Server computes every fare by replaying the driver's GPS track through the meter and the G.O. 366 tariff. Falls back to the route estimate, with a receipt note, when the track is missing. | Department confirmation of three tariff interpretations; field accuracy report against odometer routes |
| Street meter | Works offline, keeps running across app restarts, announces the fare by voice and uploads when online. The server re-prices the uploaded trip. | Field validation on devices |
| Admin (M4) | Live overview and map, driver review with document viewing, trips with CSV export, SOS and complaint handling, service switches, fee collection, fare check, aggregate-only compliance page for the department, public trip-tracking page, admin-only audit log with action and date filters and CSV export, staff role assignment recorded in the audit log | Staff sign-in with SSO and MFA |
| Fees (M5) | ₹10 charged once per IST day on the first completed trip; going online is blocked at ₹100 due. UPI payment link through Razorpay with a signature-checked webhook; cash entries by admin. | Live Razorpay account and reconciliation |
| Language | Every screen in Tamil and English | Native Tamil review; Tamil voice testing on devices |
| Android | Expo app runs in Expo Go and in the browser; `eas.json` builds an APK | Real-device QA; Play Store listing |
| Browser prototype | `web/` remains as the earlier no-backend demo | — |

## Verified

The full local run was checked in a browser at phone size on 4 November 2026:

- passenger sign-in;
- booking and bot driver acceptance;
- trip OTP, share link and public tracking page;
- receipt with the fare measured from the track;
- overcharge report appearing in the admin dashboard and in the compliance numbers;
- driver mode and earnings;
- day-fee test payment clearing the balance;
- demo street meter uploaded and re-priced.

Typecheck, the Android bundle and `npm test` pass.

The staff roles were checked on 9 November 2026 against the local backend. In a browser, as `admin`: all ten pages, assigning a role, the audit log, its action and date filters, and the CSV export. As `support`: only Trips and Incidents in the navigation, resolving an incident, and server refusals for the audit log, services, role changes, overview and drivers. The `reviewer` and `gov` roles are covered by the backend tests, not a browser run.

Not yet checked:

- the app on a physical Android phone;
- background location in an APK build;
- the backend on a live Supabase project, including the driver-document storage policy, which is tested only against a minimal stand-in for the storage schema.

## Known limits

The apps poll every few seconds instead of using Supabase Realtime. Places are a fixed list plus the current location. Maps use OpenStreetMap's public tiles, which are not for production load. Bike, cab and bike-parcel services are built but switched off, and their fares are illustrative.
