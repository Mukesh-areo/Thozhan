# Thozhan MVP plan

The MVP is **one Android app and one admin dashboard**, end to end. We do not write our own server. A managed backend (Supabase) gives us the database, login, live updates and file storage, so all the build time goes into the app and the dashboard.

This replaces the custom-server approach in [TECH_STACK.md](TECH_STACK.md) for the MVP. That approach stays an option if the product outgrows Supabase.

## 1. What the MVP does

A verified auto driver goes online in the app. A passenger books an auto in the same app, or runs the street-hail meter. The trip is charged the exact G.O. 366 fare. The admin dashboard shows every trip, approves drivers and reports fare compliance to the department.

**In scope**

- **Passenger:** phone login, book an auto, see the driver coming, start OTP, live trip, itemised receipt, SOS, share trip, report overcharge, trip history.
- **Street-hail meter:** works with no driver account and no internet; uploads the trip when the phone is back online.
- **Parcel by auto:** sender and receiver details, pickup and drop OTPs.
- **Driver:** phone login, upload DL, RC, permit and insurance, wait for approval, go online, accept offers, navigate, OTP, earnings, ₹10 day fee.
- **Admin dashboard:** live trips, driver approval, complaints and SOS, fare check, aggregate fare compliance, service switches, CSV export, a department login that sees aggregates only.
- **English and Tamil** in the app, the dashboard and SMS.

**Switched off for the MVP:** bike taxi and bike parcel (awaiting government permission), cabs (rates are only examples), in-app passenger payment (passengers pay the driver in cash or UPI directly), scheduled rides, iOS builds.

## 2. Shape of the system

```
Thozhan app (Expo, Android)            Admin dashboard (React + Vite)
  passenger mode · driver mode · meter    ops · approvals · compliance
              │                                     │
              └───────────────┬─────────────────────┘
                              ▼
                 Supabase (Mumbai region)
   Postgres + row-level security · phone OTP login · realtime · storage
   database functions: book, offer, accept, transition, fee
   edge functions: final fare, UPI fee webhook
                              ▲
     packages/tariff · meter · shared · i18n  (already built, shared by all)
```

### Why this is the fast route

| Need | How it is met | Code we write |
| --- | --- | --- |
| Login | Supabase phone OTP, SMS through MSG91 or Twilio | Login screens only |
| Database | Supabase Postgres, schema in SQL migrations | Tables and policies |
| Who can see what | Row-level security: passengers see their trips, drivers their offers, department viewers only aggregates | Policies, tested |
| Driver matching | A Postgres function finds online, approved drivers near the pickup; accept is one atomic update, so exactly one driver wins | Two functions |
| Live updates | Supabase Realtime pushes offers, driver position and trip status | Subscriptions in the app |
| Document uploads | Supabase Storage with private buckets | Upload screen and approval view |
| Fare | The same `packages/tariff` engine in the app (quote, meter) and in an edge function (final fare), so they can never disagree | One edge function |
| ₹10 fee | Ledger table, daily charge job, Razorpay UPI payment link and webhook | One edge function |
| One app, two roles | Expo Router with passenger and driver sections; role comes from the account | Shared screens and components |

One app instead of two halves the store, build and testing work. Separate driver and passenger apps can be split out later from the same code.

## 3. Milestones

The estimates assume one full-time developer working with Claude.

| # | Milestone | Weeks | Delivers | Done when |
| --- | --- | --- | --- | --- |
| M1 | **Backend setup** | 1 | Supabase project (Mumbai), SQL schema and migrations, row-level security, booking, offer and accept functions, seed data, tests | Tests prove the policies and that two drivers racing for one booking leaves exactly one winner |
| M2 | **App: passenger and meter** | 2 | Expo app with Tamil and English, phone login, booking and quote, map, trip tracking, receipt, street-hail meter with background GPS and offline storage, SOS and share | A passenger books, and the meter runs with the screen off |
| M3 | **App: driver** | 1.5 | Driver sign-up and documents, online switch with location updates, offers, OTP, trip flow, parcel flow, earnings and ₹10 fee | A ride booked on one phone is accepted and completed on another |
| M4 | **Admin dashboard** | 1.5 | Live trips, driver approval, complaints and SOS, fare check, compliance, service switches, CSV, department view | Admin approves a driver and sees their trips; the department login sees only aggregates |
| M5 | **Fee, field test, pilot** | 2 | UPI fee collection, 20 measured routes comparing meter and odometer, security review, APK through Play internal testing, monitoring | Meter error within the agreed margin; 10 test drivers complete rides |

**Total: about 8 weeks**, against 13 for the custom-server plan.

**Status, 4 November 2026:** the code for M1 to M4 and for M5's fee collection is written and works end to end on a local stand-in for Supabase. [Running the MVP](MOBILE_MVP.md) explains how to try it, and [Implementation status](IMPLEMENTATION_STATUS.md) lists what is verified. Two deviations from the table above: the apps poll every few seconds instead of using Realtime, and the Supabase project itself is not yet created.

Still open, and they need people, accounts or a phone:

- deploying to a real Supabase project;
- testing on physical phones, including the meter with the screen off;
- the 20-route meter field test;
- 10 test drivers;
- Play internal testing.

The web demo in `web/` stays as the presentation tool until the app and dashboard replace it.

## 4. How it is checked

- **Fares:** the existing golden tests for G.O. 366; the final fare is recomputed in the edge function with the same engine.
- **Database rules:** policies and functions are tested against PGlite (Postgres running inside Node) with the real migrations, so no Docker is needed.
- **App:** Maestro flows on an Android emulator, and manual GPS field runs.
- **Dashboard:** Playwright flows against a test Supabase project.

## 5. What you need to arrange

| Item | Needed by | Until then |
| --- | --- | --- |
| Supabase account (free to start; Pro plan, about $25 a month, for the pilot) | M1 | I can write and test the schema locally first |
| SMS provider with DLT registration (MSG91 or similar) | M2 on real phones | Supabase test phone numbers with fixed OTPs |
| An Android phone for GPS testing | M2 | Emulator with simulated routes |
| Expo account (free) for APK builds | M2 | Expo Go on the phone |
| Razorpay business account | M5 | Fee ledger only, no real collection |
| Google Play Console account (one-time $25) | M5 | APK installed directly |
| Transport department pilot permission or aggregator licence | Pilot launch | Test drivers only |
| A Tamil language reviewer | Before the pilot | Current text, marked for review |

## 6. Risks

- **Supabase limits:** fine for a pilot of hundreds of drivers. Because it is plain Postgres, moving to our own server later keeps the data and schema.
- **No drivers on day one:** recruit 20–50 auto drivers through a union or stand; the meter works even with none.
- **GPS disputes:** label the meter as a reference until the department endorses it, and publish the field accuracy report.
- **Scope creep:** bike, cab and in-app passenger payment stay behind switches until the MVP is done.

## 7. First steps

1. Merge PR #1 and PR #2 so `main` has the shared packages, the web demo and the video.
2. M1: write the Supabase schema, policies and functions in `supabase/migrations`, with tests.
3. Create the Expo app in `apps/mobile` and the dashboard in `apps/admin`, both using the shared packages.
