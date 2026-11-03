# Thozhan implementation plan

Prepared 3 November 2026. Goal: a bilingual (தமிழ் / English) ride app that a Tamil Nadu government reviewer can use on a real phone. The app should show government-tariff fares, a virtual auto meter, and the core booking features riders know from Rapido, Ola and Uber.

## 1. Where the project stands

| Area | Today | Gap |
| --- | --- | --- |
| Code | `web/app.js` is 19 KB on a single minified line. It holds UI, state and fare logic together. | Nobody can review, test or extend it efficiently. It needs to be split into modules first. |
| Language | All text is hard-coded English. | No i18n layer, no Tamil strings, no Tamil font or numerals choice, no language switch. |
| Fares | `base + (straight-line km × 1.25 − 1.8) × rate`. Mini and Sedan rates are invented. | No waiting charge, night 1.5×, ghat rates, rounding policy, tariff versioning or itemised receipt. |
| Location | 7 fixed Chennai places and an SVG drawing. | No GPS, geocoding, road routing or live tracking. |
| Backend | `localStorage` only. | No accounts, server, database, dispatch or audit trail. Every "driver" and "trip" is local. |
| Tests | One DOM-stub script (`web/test.cjs`). | No unit tests on the fare engine. No browser or device tests. No CI for the app (CI only renders the video). |
| Docs vs code | The docs describe Flutter, NestJS and PostGIS. | None of it exists yet. The docs are accurate about this, but the plan has to close the gap. |
| Effort balance | Remotion video pipeline is more developed than the app. | Pause video work until the app itself is demo-ready. A screen recording of the real app is more convincing to a reviewer. |

## 2. Verified tariff source

I checked the official PDF (stationeryprinting.tn.gov.in, Gazette Extraordinary No. 466, Part II §2). The order is **G.O. Ms. No. 366, Home (Transport-I), 27 Oct 2026**, issued under MV Act §67(1). It covers **contract carriage auto rickshaws only**, in Chennai Metropolitan Area and other regions, and supersedes the 2013 and 2014 notifications.

| Item | Value |
| --- | --- |
| Minimum distance | 1.8 km |
| Minimum fare | ₹50 |
| Additional per km | ₹25 |
| Ghat fare | 1.2 × minimum fare; base ₹60 |
| Additional ghat per km | ₹30 |
| Night (10 PM – 5 AM) | 1.5 × regular fare |
| Waiting | ₹1 per minute |

**The order does not state:** a rounding rule, a free-waiting threshold, whether night 1.5× applies to waiting, luggage charges, an effective date beyond publication, or anything about electronic meters or aggregator apps.

**Bike taxi:** this G.O. contains no two-wheeler or cab fares. Bike taxis have a contested legal status in Tamil Nadu. Build bike fares as a separate tariff with status `PENDING_APPROVAL`, keep them behind a feature flag, and never borrow numbers from the auto tariff. Ask the transport department for the applicable bike-taxi and cab fare rules as part of the pilot request; that request is itself a reasonable pilot ask.

These open questions go to the transport department in writing. Until they answer, the engine uses explicit, displayed assumptions (see §4.3).

## 3. Recommended architecture (efficiency choices)

**One language end to end: TypeScript.** The fare engine has to run in three places: in the phone meter (offline), on the server (the authoritative final fare) and in the government verification tool. If the clients are Flutter and the server is NestJS, the engine gets written twice in two languages and the copies will drift. For that reason I recommend changing the original plan's Flutter choice:

```
thozhan/                      (pnpm monorepo)
  packages/tariff/            pure TS fare engine + versioned tariff JSON + golden tests
  packages/i18n/              en.json, ta.json, number/currency/date formatting
  packages/shared/            types, trip state machine, API contracts (zod)
  apps/rider/                 React Native (Expo): passenger app + virtual meter
  apps/driver/                React Native (Expo): driver app
  apps/ops/                   React (Vite): operations + government dashboard + tariff verifier
  apps/api/                   NestJS + PostgreSQL/PostGIS + Redis
```

- Expo gives one codebase for Android and iOS, real background GPS (`expo-location` + task manager) and an APK for the demo. A browser PWA cannot track GPS reliably with the screen off, and the meter depends on that.
- Maps: OpenStreetMap tiles with MapLibre and OSRM routing, self-hosted or managed. This avoids Google Maps per-request costs during the pilot, and an adapter allows a switch later.
- Money is stored as integer paise everywhere. Every quote and trip stores the `tariffVersionId`.
- The existing `web/` prototype stays as the clickable reference until `apps/rider` replaces it.

If you need to keep Flutter, the fallback is to compile the tariff engine to WebAssembly, or to treat the server as the only fare authority and drop the offline meter. Both options cost more than sharing a TypeScript package.

## 4. Virtual auto meter (new feature)

### 4.1 Problem
A passenger flags down an auto on the street with no booking. Today the fare is negotiated, or the physical meter is broken or ignored. The virtual meter computes the fare under G.O. 366 on the passenger's phone, live and transparently, so both sides see the same number.

### 4.2 User flow
1. Passenger taps **"ஆட்டோ மீட்டர் / Start meter"** on the home screen. No booking is needed.
2. Optional: scan the QR sticker on the auto, or type the registration number (TN 01 AB 1234). This links the driver, if registered, and records the vehicle for complaints.
3. Choose conditions: auto-detect night by clock; ghat toggle (auto-suggested from a ghat-road geofence list such as Kodaikanal and Ooty routes).
4. **Live screen:** a large fare figure, distance, running time, waiting minutes, and the active tariff line ("G.O. Ms. 366 / 2026"). Tamil voice announces the fare at each kilometre (optional).
5. Share a live trip link with family over SMS or WhatsApp. SOS button.
6. **Stop:** an itemised receipt (base, extra km, waiting, night factor, rounding) in Tamil and English. Pay by UPI QR or cash. Rate the ride, report overcharging and save the trip.
7. Driver variant: a registered driver starts the meter from the driver app, and the passenger confirms by scanning the driver's screen QR. Both phones then compute the same fare, and the server reconciles.

### 4.3 Fare calculation (engine)
```
regular    = minFare                                if d ≤ minKm
           = minFare + (d − minKm) × perKm           otherwise   (ghat: 60 / 30)
waiting    = waitingMinutes × ₹1
night      = ×1.5 if the trip STARTS in 22:00–05:00  [assumption — confirm]
total      = round((regular + waiting) × night)      [assumption: night applies to waiting; round to nearest ₹1]
```
Every assumption is a field in the tariff JSON (`nightAppliesTo`, `nightDecidedBy: start|pro-rata`, `rounding: nearest-rupee|ceil-rupee|per-100m`). The receipt shows the assumption in use. When the department answers, the fix is a new tariff version with no code change.

Worked check from the original plan: 5.0 km in the daytime with no waiting gives 50 + 3.2 × 25 = ₹130. Add 6 minutes of waiting and it becomes ₹136. The same trip at night gives ₹204.

### 4.4 Measuring distance and waiting from GPS (the hard part)
- Sample at 1 Hz while moving and less often when stationary. Discard fixes with accuracy worse than 25 m, and points implying more than 80 km/h for an auto.
- Smooth with a simple Kalman filter. Sum the haversine distance between filtered points, and snap to roads with OSRM `match` when online.
- **Waiting** is time with speed below 5 km/h for more than 60 s, accumulated per minute. Thresholds are configurable.
- **Offline-first:** the meter runs fully on the device and syncs points later. It survives app kill, and a foreground service keeps GPS alive on Android.
- **Tamper signals:** mock-location detection, time jumps and GPS gaps are flagged on the receipt, not silently trusted.
- **Validation before the demo:** drive 20+ test routes against a calibrated physical meter or odometer, and publish the error margin. A government reviewer will ask for this number first.

### 4.5 Why this sells to government
- The department gets a free "digital meter" for every auto, plus aggregate fare-compliance data: average deviation from tariff and complaint hotspots, with no personal data.
- The verifier page in `apps/ops` lets an officer enter distance, waiting and time and see the official fare. This demonstrates that the engine follows the G.O.
- Overcharge complaints carry GPS evidence and a tariff reference, and can route to the RTO.

## 5. Feature parity with Rapido / Ola / Uber

"All features" is roughly 2–3 years of work for those companies. Tier the work so the government demo shows the features that matter to the government first.

**Tier 1: government demo (must have)**
- Phone OTP login, Tamil/English switch, large-text mode
- Virtual auto meter (§4)
- Auto booking: GPS pickup, place search with Tamil names, fare quote from the G.O., nearest driver, live tracking, ride OTP, itemised receipt
- Ride sharing with contacts, SOS, emergency contacts
- Cash + UPI (intent/QR)
- Driver app: online/offline, accept/reject, navigation hand-off, earnings, ₹10/day ledger
- Ops dashboard: live trips, tariff verifier, complaints, aggregate government view

**Tier 2: parity for pilot**
- Schedule ride, favourite places, multiple stops, booking for someone else
- Ratings both ways, tip, lost item, cancellation policy and fees
- Masked calling (via a provider such as Exotel), in-app chat with Tamil quick replies
- Driver KYC (DL, RC, insurance, permit, with expiry alerts) and document verification
- Referral and promo codes, wallet, refunds, invoices with GST
- Women-safety options: women driver preference, night ride check-ins, route deviation alert
- Push/SMS notifications in Tamil

**Tier 3: expansion (each needs separate legal or tariff approval)**
- Bike taxi (feature-flagged, pending legality), cab categories (Mini/Sedan/SUV with their own tariffs)
- Rentals (hourly), outstation and airport, parcel delivery
- Corporate accounts, accessibility (voice booking, wheelchair-friendly flag)
- Metro/MTC/bus first and last mile integration (CUMTA)

Remove the invented Mini/Sedan rates from the demo now, or label them "illustrative, not government tariff". A government reviewer will notice unsourced numbers.

## 6. Bilingual (Tamil / English) approach
- All strings live in `packages/i18n` (ICU message format). Nothing is hard-coded. CI fails if a key is missing in `ta.json`.
- **Tamil is the default** where the device locale is Tamil. The switch stays visible on every screen.
- Font: Noto Sans Tamil / Mukta Malar. Test long Tamil words in buttons, since Tamil text runs about 30–40% longer than English.
- Place names are bilingual (`{en: "T. Nagar", ta: "தி. நகர்"}`). Search accepts both scripts and Tanglish ("anna nagar").
- Voice prompts for the meter and driver arrival use Tamil TTS.
- A native Tamil speaker reviews the translations. Machine translation is only a first draft.

## 7. Phased delivery

| Phase | Weeks | Output | Exit gate |
| --- | --- | --- | --- |
| 0. Clean-up | 1 | Un-minify and modularise `web/`, add CI running tests, label illustrative fares | Same behaviour, readable code, green CI |
| 1. Tariff engine + i18n | 2–3 | `packages/tariff` with G.O. 366 v1 JSON and golden tests; `packages/i18n` en/ta; web prototype switched to both; tariff verifier page | 100% branch coverage on engine; full Tamil UI |
| 2. Virtual meter (mobile) | 4–7 | Expo rider app with meter, GPS filtering, waiting detection, receipt, share/SOS, offline; APK | 20 field routes within agreed error vs odometer |
| 3. Backend + booking | 8–13 | NestJS API, OTP auth, PostGIS, dispatch (atomic accept), live tracking, driver app, ops dashboard | End-to-end staging rides; concurrency and ledger tests |
| 4. Payments + safety | 14–17 | UPI, ₹10 ledger, receipts/GST, masked calls, KYC, complaints → RTO flow, audit log, DPDP consent | Security review, finance reconciliation |
| 5. Government demo + pilot | 18+ | Demo kit (APK, verifier, aggregate dashboard, field-accuracy report), then 50–150 driver Chennai pilot | Department review; pilot KPIs |
| 6. Tier 2/3 features | after pilot | Per §5 | Per category approval |

**The fastest path to a credible government demo is Phases 0–2, about 7 weeks.** That gives a real Android APK with a bilingual virtual meter that follows the gazette, plus a verifier. It does not need the full backend to impress a reviewer.

## 8. Risks
- **GPS accuracy disputes.** Mitigate with field validation, a published error margin, and treating the meter as an advisory reference until the department endorses it.
- **Bike-taxi legality.** Keep it feature-flagged and say so explicitly in the proposal.
- **Tariff ambiguity** (rounding, night scope). Send a written query to the department and display the assumptions.
- **Supply.** A booking app with no drivers fails the demo. The meter works with zero drivers, which is another reason to lead with it.
- **Data protection (DPDP Rules 2025).** Get consent for location, minimise PII, and give the government aggregates only.

## 9. Decisions needed from the owner
1. Approve the switch to TypeScript + React Native, or keep Flutter (§3).
2. Confirm that Tier 1 is the government-demo scope (§5).
3. Name a Tamil language reviewer, and decide who sends the tariff clarification letter to the transport department.
