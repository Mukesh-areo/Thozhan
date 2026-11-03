# Thozhan

Thozhan is a Tamil Nadu mobility application prototype with passenger booking, a driver workspace and an operations dashboard. It is a browser-based demonstration, not a native Android APK or a licensed transport service.

## What works today

- Select Chennai pickup and destination locations and an illustrative vehicle fare.
- Request or schedule a demo ride; inspect its OTP and driver state.
- Accept, arrive, validate OTP and complete the ride in the driver workspace.
- Track illustrative earnings and a ₹10 fee assessed once per eligible India-calendar day.
- View trip history, create demonstration support cases and export trip CSVs.
- Preserve demonstration records in localStorage in the same browser.

No production authentication, driver verification, shared server database, live maps, GPS tracking, real payments or emergency response is connected. Switching workspaces is a demo control, not an authorization boundary. Scheduled bookings capture a future time; they do not schedule real dispatch.

## Run the app

From the repository root:

```sh
python3 -m http.server 8080 --directory web
```

Open http://localhost:8080 in a browser. For the Android layout, use a narrow browser viewport. No app build or dependencies are required. Google Fonts are optional external styling dependencies; system fonts are the fallback.

Run the existing logic checks:

```sh
cd web
node test.cjs
```

The checks cover duplicate requests, trip transitions, wrong OTP rejection, completed trips, once-per-day fee deduplication, persistence and equal-location rejection. They use DOM stubs and do not replace real-browser QA.

## Shared TypeScript packages

The `packages/` workspace holds the foundation for the multi-service platform: auto, bike taxi, cab and parcel. See [system architecture](docs/SYSTEM_ARCHITECTURE.md) and [technology stack](docs/TECH_STACK.md).

| Package | Contents |
| --- | --- |
| `@thozhan/tariff` | Fare engine and versioned tariff data. The auto tariff follows G.O. Ms. No. 366 (27 Oct 2026). Bike, cab and parcel rates are labelled `ILLUSTRATIVE`. |
| `@thozhan/meter` | Virtual auto meter core: GPS filtering, Kalman smoothing, distance and waiting accumulation, tamper flags |
| `@thozhan/shared` | Service catalogue with legal status and feature flags; ride, meter and delivery state machines |
| `@thozhan/i18n` | Tamil and English catalogues, ₹ and distance formatting |

Requires Node 22.18+. TypeScript runs directly, with no build step.

```sh
npm install
npm run typecheck
npm test
```

## Demo video

The Remotion project in [video](video/) generates a 50-second, 720 × 1280 portrait walkthrough at 24 fps, with English captions and no audio. It renders HTML states generated from the app; it is not a recording from a physical Android phone.

```sh
cd video
npm ci
npm run scenes
npm run studio
npm run render
```

Output: `media/Thozhan-Demo.mp4`.

The [render workflow](.github/workflows/render-demo.yml) runs when video/app sources change, uploads an artifact and commits the resulting MP4 and preview contact sheet when successful. View [workflow runs](https://github.com/Mukesh-areo/Thozhan/actions/workflows/render-demo.yml). The local environment could compile the composition but could not launch Chromium, so a successful workflow and visual review are needed before calling the video verified.

## Project documents

- [Implementation plan](docs/IMPLEMENTATION_PLAN.md)
- [System architecture: auto, bike, cab, parcel](docs/SYSTEM_ARCHITECTURE.md)
- [Technology stack](docs/TECH_STACK.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Architecture and implementation approach](docs/ARCHITECTURE.md)
- [Product roadmap and acceptance gates](docs/ROADMAP.md)
- [Government pilot concept](docs/GOVERNMENT_PROPOSAL.md)
- [Competitor desk research and references](docs/RESEARCH.md)
- [Android demonstration guide](docs/ANDROID_DEMO.md)
- [Original architecture plan](docs/source/Tamil_Nadu_Mobility_Full_Architecture_Project_Plan.docx)

The original supplied plan is preserved unchanged. It describes proposed architecture and estimates, not the implementation currently present. No government endorsement, fare certification, tender award or production readiness is claimed.

No open-source license has been selected by the owner. Third-party dependencies retain their own licenses; Remotion has separate licensing conditions.
