# UX handoff: what was built, how it was tested, what is left

This records how the mobile app was brought in line with the UX handoff
(`Thozhan-UX-Design-Complete/THOZHAN_CLAUDE_UX_IMPLEMENTATION_HANDOFF(1).md` and the 80-screen
prototype in `dist/`), what was tested and on what, and what is still missing. Section numbers
(§) refer to the handoff.

The existing architecture is unchanged: Supabase (Postgres RPCs with RLS), the Expo app, the
React admin. All new rules are enforced in the database; the app only explains them.

## 1. Review of the design: gaps found

The prototype was compared screen by screen with the app as it stood (commit `d8e45ba`).

| Handoff | Before | Now |
|---|---|---|
| §1 Passenger or driver chosen at login, tied to the number, no in-app switch | One account could switch between riding and driving from the profile | Login starts with *Passenger* / *Driver partner*. The type is stored on the profile (`profiles.account_type`) and locked: signing in with the other type keeps the stored one and says so. The switch is gone. Drivers cannot book; passengers cannot register to drive |
| §1, §27 Separate tabs | Passenger: Book / Parcel / Meter / Account. Driver: Drive / Earnings / Account | Passenger: **Home / Trips / Meter / Account**. Driver: **Drive / Earnings / Manage / Account** |
| §3 Review before confirming, with the full price and formula | Booking happened straight from the vehicle list | New **Review** step: vehicle, route, full estimate with the formula and line items, tariff badge, payment, passenger cover, pickup note |
| §4–§8, §26 Tariff labels and proposed pilot fares | Bike/cab/parcel used invented placeholder rates | Auto: **Government-notified tariff**. Bike, Cab Mini/Sedan/SUV, Bike Parcel, Auto Parcel: the handoff's proposed fares, labelled *Proposed Thozhan pilot fare — market benchmark, subject to regulatory approval*, status `PENDING_APPROVAL`. Every example in the handoff is a unit test. New **Fare chart** screen |
| §5 Bike safety | None | Passenger confirms one passenger, helmet, no large luggage, ride conditions (server refuses the booking otherwise). Driver confirms a passenger helmet before **Accept** |
| §6 Cab options | None | Passengers, luggage, AC, assistance, pet; shown to the driver on the offer. Tolls/parking note |
| §7–§8 Parcel details and proof | Receiver, weight, description | Item category, declared value, size (L×W×H), packages, fragile, loading help, **prohibited-items declaration** (required by the server). Bike parcel max 5 kg, auto 50 kg. Driver must take a **pickup photo** before *Picked up* and a **delivery photo** before *Delivered* (server-enforced), on top of both OTPs |
| §10, §19 Insurance | Not mentioned | Insurance pages for passengers and drivers that say cover is **planned**: no insurer, policy or premium is invented; nothing is charged. A claim/incident ticket can be raised |
| §11, §23 Safety | 112 button, SOS, trip sharing | Safety centre (112, women's helpline 181, trusted contacts, number-plate check, report an issue); driver safety toolkit; **trusted contacts** (up to 5) |
| §12 Passenger account | Rides, parcel, payment, safety, help, mode switch | Saved places, payment, insurance, safety centre, trusted contacts, help & complaints, privacy & data, language, sign out |
| §11, §15 Two-way ratings | None | Stars + tags + comment after every finished trip, both ways. Ratings show on offers (passenger) and on the driver card (driver) |
| §15 Cancel reasons, passenger not found | Plain cancel with a yes/no | Cancelling asks why (stored on the trip). *Passenger not found* is offered to the driver only after 5 minutes at the pickup (server-enforced) |
| §15 Collect cash/UPI, confirm payment | None | After the trip the driver records *Received in cash* / *Received by UPI*; the receipt shows how it was paid |
| §13, §20 Documents with expiry | Four papers, no dates | Licence, RC, permit, insurance, pollution (PUC), fitness (auto and cabs), photo; validity date for each paper that has one. Expired paper → driver cannot go online (server-enforced). **Documents centre** with *valid till*, *expiring soon* (30 days), *expired*, and renewal with a new photo and date. Warnings on the driver home |
| §18 Earnings | Balance, days, ledger | Plus last-7-days and last-30-days totals, and a note that fares are paid to the driver directly |
| §21 Performance | None | Rating, acceptance rate, completed, cancelled-by-driver, top compliments (last 30 days) |
| §22 Help & complaints, §24 privacy | Static FAQ; overcharge/complaint on the receipt | **Support tickets** with a reference (`TZ-S-xxxxx`), categories per account type, replies from staff; *Help with this trip* from any receipt. **Download my data** and **Delete my account** (a tracked request) |
| Admin | — | New **Support tickets** page (reply, reply and close); driver cards list every required paper with its validity and flag expired ones |

## 2. Design enhancements added to the prototype

These go beyond the prototype and are kept in the same deep green (`#174a3b`) and lime (`#c8f169`)
system:

- **Locked account type message**: if someone picks the other role for a number that already has one, they are signed in as what the number is and told why (prototype has no such state).
- **Server-side rules for every check** the prototype only shows (bike safety, parcel declaration, photos, expiry, 5-minute wait), so a modified client cannot skip them.
- **Expiring-soon reminder** on the driver home 30 days before a paper runs out, not only after it expires.
- **Empty and error states** on every new list (trips filter, contacts, tickets, saved places, documents) with retry where data loads.
- **Honest placeholders** for features that need a partner or a backend that does not exist yet (insurance, incentives, referrals, training) instead of numbers that look real.
- Every touch target on the new screens is at least 48 px; toggles are whole-row targets with screen-reader labels.

## 3. Test results

See §5 for the commands. Results as of 11 November 2026.

| Suite | Result |
|---|---|
| `npm run typecheck`, `tsc -p apps/mobile`, `tsc -p apps/admin` | Clean |
| `npm test` (tariff, i18n, shared, meter, web store, backend on PGlite, staff roles) | **83 / 83 pass**, including a new backend test that walks every handoff rule (account type lock, bike safety, note length, parcel declaration and photos, no-show wait, ratings, payment, contacts, tickets, deletion, export, document expiry and renewal) |
| i18n | Every key used by the app exists in English and Tamil (about 290 new keys) |
| Browser end-to-end (`npm run test:e2e`, Playwright + Chrome, two phones and the admin) | **8 / 8 areas pass**: driver onboarding and approval (7 papers with dates), a real driver trip with payment and rating, parcel by auto with declaration and both photos, SOS, roles, errors (cancel reasons), every vehicle, every screen in English and Tamil |
| Physical Android device | Release APK on a Motorola moto g30 (Android 12): passenger and driver flows below all worked; 9 problems found and fixed |

### Physical Android device

Release build (`assembleRelease`, arm64) installed with `adb install -r` on a **Motorola moto g30,
Android 12, 720×1600**, driven over USB (`adb`, `uiautomator`) against the local dev backend
through `adb reverse`. Cold start: about 0.6–0.7 s (`am start -W` TotalTime 588–723 ms).

| Area | What was done on the phone | Result |
|---|---|---|
| Install and start | `adb install -r`, cold start | Starts in 0.5–1.1 s, no crash during the session |
| Login | Role cards, bad number, OTP, empty name, welcome | Errors shown in place; keyboard no longer hides the button |
| Locked account type | Note on the welcome screen and in Account | Shown; no switch anywhere |
| Passenger booking | Home → drop → vehicle list → review → confirm, auto and bike | Auto shows *Government-notified tariff*, bike *Proposed Thozhan pilot fare*; bike *Confirm* stays disabled until all four checks are on; pickup note sent |
| Live trip (passenger) | Driver card, plate check, OTP, SOS button, map with route | Bot driver accepted in seconds; receipt with fare lines |
| Rating | 5 stars → compliment tags; 2 stars → problem tags | Tags change with the score; *Thanks for your rating.* |
| Help & complaints | *Help with this trip* from a receipt, empty form, then a lost-item ticket | Empty form refused; reference *TZ-S-…* shown and listed as *Open* |
| Account screens | Saved places (empty state), trusted contacts (empty, bad number, valid), privacy (download data → Android share sheet) | All worked; the share sheet was dismissed without sharing |
| Parcel | Empty form, missing declaration, same pickup and drop, then a bike parcel to Marina Beach | Each error shown; same-place blocked on the vehicle list; parcel delivered |
| Driver registration | Non-TN plate, missing papers, camera denied then allowed, photo taken and uploaded, gallery opened and cancelled | Plate and missing-paper errors; photo stored (*✓ Uploaded*); cancel leaves the form unchanged |
| Driver at work (in Tamil) | Location denied → demo location; offer → accept → arrived → wrong OTP → right OTP → end → *Received by UPI* → 2-star rating | Wrong OTP refused in Tamil; ₹191 government-tariff receipt; *Paid by* row shown |
| Driver tabs | Manage (vehicle, performance), Documents (badges, renew), Earnings (7/30 days) | All rendered; badge overflow fixed |
| Map | With the phone offline, then on Wi-Fi | Bilingual "couldn't load the map" message offline; tiles, markers and route online |
| Permissions | Camera (deny, then allow once), photos (system picker), location (deny) | Each refusal handled without a crash |

Not tested on the phone, and why:

- **Real GPS on a moving trip**: the phone stayed on a desk, and allowing location would have sent its real position. Location was denied, which tests the fallback; the GPS meter is covered by unit tests and the browser run.
- **Calling 112 / 181**: tapping would open the dialer for a real emergency number.
- **Passenger not found (after 5 minutes)** and **cancelling on the phone**: the bot drivers start trips within seconds, so the cancel window closed first. Both are covered by the backend test and the browser run.
- **Push notifications, background tracking with the screen off, low-end performance profiling**: not part of this pass.
- **Delete my account**: the request flow is covered by the backend test; it was not run on the phone, to keep the test account usable.

### Problems found on the phone and fixed

| Problem | Fix |
|---|---|
| The keyboard covered *Send OTP* / *Continue* and the lower form fields (the app draws edge to edge, so Android's resize did nothing) | New `KeyboardSafe` wrapper (keyboard-avoiding view) inside every `Screen`, login, parcel and the driver home. Verified on the phone: the button and the focused field stay above the keyboard |
| A ride offer's *Accept* button was below the fold on a 720×1600 screen; with a 30-second offer the driver had to scroll | The helmet check and *Decline* / *Accept* now sit in the sheet's fixed footer, and the offer card is first in the sheet |
| Document badges (*On file*, *Valid till …*) ran past the right edge of the card | Title and badge wrap onto two lines when they do not fit (documents centre, help tickets) |
| Denying camera access said "You don't have access to this." at the foot of the form | A specific message ("Camera access is off. Allow it in your phone's Settings, or choose a file instead.", English and Tamil) inside the card that was tapped |
| The fourth tab was labelled *Profile* | Renamed *Account* / *கணக்கு*, as in the handoff |
| An offer whose quote had no total showed ₹NaN | Shows "—" |
| In Tamil, the *Earnings* tab label was cut off ("வருமா…"), *Decline* broke mid-word, and *Trusted contacts* was cut off in the account list | Tab labels shrink slightly to fit on one line; the offer buttons share the width more evenly; list-row titles may use two lines |
| Screen readers read icon glyphs inside buttons and list rows (", Saved places, "), and disabled buttons did not say they were disabled | Icons are hidden from screen readers; buttons and list rows have plain labels and report disabled / busy |
| The trusted-contact form was labelled *Your name* / *Mobile number* | *Their name* / *Their mobile number* |
| The demo driver bots never finished a parcel (the server now requires the driver's photos) | The bots record a placeholder proof before pickup and delivery (dev only) |

### Notes

- **Only auto rides are on by default in production.** Bike, scooter, the three cabs and both parcel services start switched off in `service_flags`; only the development seed turns every service on. Operations switch each one on after approval.
- The camera permission text now covers parcel photos as well as documents.

## 4. Not built, and why

| Handoff item | Status | Reason |
|---|---|---|
| Masked calling (§11, §15, §23) | Not built | Needs a telephony provider (e.g. Exotel) contract and numbers |
| Insurer, policy, certificate, premium, claims tracking (§10, §19) | Placeholder pages only | No insurer has been chosen; the handoff forbids inventing one or hard-coding a premium |
| Online payments, settlement, bank payouts, downloadable statements, fee receipts (§17, §18) | Not built | Passengers pay drivers directly (cash/UPI) in the pilot; Thozhan only collects the ₹10 day fee through the existing payment link |
| Incentives, referrals, training, learning centre (§21, §22) | "Not in the pilot yet" card | No programme exists to show |
| Scheduled, airport, rental, intercity rides; women-driver preference (§6) | Not built | Needs scheduling and matching rules not yet designed |
| Sender package photo before booking (§7) | Not built | The driver's sealed-package photo at pickup is built and required |
| Aadhaar/PAN and bank verification documents (§20) | Not built | Needs a KYC provider and a legal decision on what to store |
| Parcel price-change approval before pickup (§8) | Not built | The price is fixed at booking; changing the parcel means a new booking |
| Unexpected-stop detection, encrypted audio (§11, §23) | Not built | Needs background analysis and storage policy |
| Account-review appeal flow (§24) | Partial | Review note and status are shown, and an *Account review* ticket can be raised; there is no formal appeal workflow |
| Driver blocking (§11) | Not built | — |
| Scooter | Kept | Not in the handoff, but already working; it follows the bike rules |

## 5. How to run it

```bash
npm run typecheck && npm run typecheck:apps
npm test
npm run test:e2e
```

Physical Android build (Windows): see §6.

## 6. Android build on Windows: path-length workaround

The React Native native build exceeds Windows' 260-character path limit when run from a deep
folder such as a git worktree (`ninja: error: mkdir(...): No such file or directory`).

- Build from a short folder (e.g. `C:\tz`, a copy of the repository with its `node_modules`). A
  `subst` drive does **not** work: Node resolves the real path and codegen refuses the mix.
- In the generated `android/app/build.gradle`, pass
  `externalNativeBuild { cmake { arguments "-DCMAKE_OBJECT_PATH_MAX=240" } }` inside
  `defaultConfig`, so CMake hashes over-long object paths (React Native leaves the limit unset).
- `THOZHAN_LOCAL_TEST_BUILD=1 npx expo prebuild --platform android --no-install` allows plain
  HTTP to the local dev backend (only for that build; see `plugins/with-local-http.js`).
- With the phone on USB: `adb reverse tcp:54321 tcp:54321` so the app reaches the dev backend at
  `localhost:54321`.

Enabling Windows long paths (`LongPathsEnabled`) would also fix it, but that is a system setting.
