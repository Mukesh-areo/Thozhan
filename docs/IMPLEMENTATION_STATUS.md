# Implementation status

Snapshot prepared 3 November 2026.

| Area | Present implementation | Still required |
| --- | --- | --- |
| Passenger booking | Fixed Chennai locations, approximate geographic distance, illustrative quotes, demo requests | Real geocoding, road routes, approved tariffs, dispatch and production booking API |
| Scheduling | Saves a chosen future time | Time-zone policy, scheduled allocation, reminders and missed-pickup handling |
| Driver | One simulated driver, online switch, accept, arrival, OTP, completion | Identity checks, fleet compliance, secure accounts, background GPS and actual matching |
| Finance | Browser-local earnings and once-per-day ₹10 ledger | Server-enforced accounting, payment integration, refunds, reconciliation and tax handling |
| Safety | Demo case creation and safety information | Trained response operations, secure evidence, lawful escalation and audited SLA |
| Operations | Shared local trip state, CSV export and cases | Multi-user backend, granular staff roles and immutable audit logs |
| Android | Responsive website | Real-device QA, PWA/APK decision, native permissions and store distribution |
| Fare engine | `packages/tariff`: G.O. 366 auto tariff (base, per km, waiting, night, ghat) with tests; draft bike, cab and parcel rules | Written confirmation of rounding, night scope and ghat base distance; official bike, cab and parcel tariffs; wire into the web prototype |
| Virtual meter | `packages/meter`: GPS filtering, smoothing, waiting detection, tamper flags, tested on synthetic tracks | Mobile app shell with background GPS; field validation against odometer routes |
| Multi-service | `packages/shared`: service catalogue and ride, meter and delivery state machines | Backend, dispatch and parcel booking UI |
| Language | `packages/i18n`: Tamil and English catalogues with key-parity tests | Native Tamil review; apply the catalogues to the UI |
| Video | Remotion source, generated scenes, successful bundle compilation | Successful render and visual QA; MP4 is created by the repository workflow only if it succeeds |

## Known limits

The localStorage key retains the original internal `namma-v1` identifier to preserve existing browser demo data. User-facing branding is Thozhan. Dates and records are demonstration data. A record can be modified or deleted locally; financial balances are not authoritative. The map is an illustration, not navigation.

Prototype fare logic uses a 1.25 multiplier on straight-line geographic distance. Waiting, night, toll and ghat rules are not implemented. Never use these estimates for real billing.

The native browser preview infrastructure was unavailable during creation. Logic checks passed; rendered layout and Android device behavior require verification. The local Remotion renderer stopped with SIGTRAP before producing a frame; `/proc` was unavailable. The repository workflow is a separate rendering attempt, not proof of success until its logs and output are checked.
