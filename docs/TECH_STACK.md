# Technology stack

The choices are made for a small team that has to ship bilingual mobile apps, a backend and a government-facing console efficiently. The main idea is **one language (TypeScript) across apps, server and fare engine**, so the tariff logic is written and tested once.

## Core choices

| Layer | Choice | Why this one | Alternatives considered |
| --- | --- | --- | --- |
| Language | **TypeScript** everywhere | One fare engine and one set of types shared by apps, API and console | Dart (Flutter) would force a second fare engine |
| Monorepo | **npm workspaces** (move to pnpm + Turborepo when builds slow down) | Zero extra tooling today; caching later | Nx (heavier) |
| Rider & driver apps | **React Native + Expo** (SDK 52+), Expo Router | One codebase for Android and iOS; OTA updates; EAS builds produce the APK for the government demo | Flutter (good, but a separate language); native Kotlin (two codebases) |
| Background GPS | `expo-location` + `expo-task-manager` (Android foreground service) | Needed for the meter and driver tracking with the screen off | react-native-background-geolocation (paid licence, more accurate; evaluate in the pilot) |
| Maps (mobile) | **MapLibre React Native** + OpenStreetMap tiles | No per-load fees; offline tile packs possible | Google Maps SDK (cost, terms) |
| Routing / ETA | **OSRM** (self-hosted, Tamil Nadu OSM extract) | Fast, free, supports map-matching for the meter | Valhalla; Google Directions (paid) |
| Geocoding / search | **Photon or Pelias** on OSM, plus a curated bilingual landmark table | Tamil and English names, Tanglish search | Google Places (cost) |
| Ops & government console | **React + Vite**, TanStack Query, shadcn/ui, Recharts | Fast to build dashboards; shares types and i18n | Next.js (SSR not needed) |
| API | **NestJS** (Fastify adapter) | Modules map onto the architecture; DI, guards, OpenAPI | Fastify alone (less structure) |
| Validation & contracts | **Zod**, plus OpenAPI generated from it | One schema validates mobile input, the API and the console | class-validator |
| Database | **PostgreSQL 16 + PostGIS** | Transactions for dispatch and ledger; geo queries; zones as polygons | MongoDB (weak transactions/geo for this) |
| ORM / SQL | **Drizzle ORM** | Typed SQL, simple migrations, PostGIS-friendly | Prisma (weaker PostGIS) |
| Live state | **Redis 7** (GEO, locks, streams) | Driver positions, offer locks, rate limits | — |
| Jobs / events | **BullMQ** on Redis + transactional outbox | Retries, scheduled rides, notifications | Kafka (overkill for the pilot) |
| Realtime | **Socket.IO** (Redis adapter) | Live tracking, offers, trip state | MQTT (consider at scale for driver GPS) |
| Object storage | **S3-compatible** (AWS S3 Mumbai) | KYC documents, proof-of-delivery photos, signed URLs | — |
| Auth | Phone OTP (own service) + JWT access/refresh; staff via SSO + MFA | Riders and drivers expect phone login | Firebase Auth (data residency, lock-in) |

## India-specific integrations

| Need | Provider options |
| --- | --- |
| OTP / SMS (DLT registered templates) | MSG91, Gupshup, Kaleyra |
| Masked calling | Exotel, Knowlarity |
| WhatsApp notifications | Gupshup / Meta Cloud API |
| Payments (UPI intent/QR, refunds, payouts) | Razorpay, Cashfree, PhonePe PG |
| Driver/vehicle verification | DigiLocker (DL/RC documents), Vahan/Sarathi via an authorised API vendor (Signzy, IDfy, Surepass) |
| Push | Firebase Cloud Messaging |
| Tamil voice | Android TTS (on device), Google Cloud TTS `ta-IN` for prompts |

## Quality and operations

| Concern | Tool |
| --- | --- |
| Unit tests | **node:test** for pure packages (zero deps), Vitest for apps |
| API tests | Supertest + Testcontainers (real Postgres/Redis) |
| Mobile E2E | **Maestro** (YAML flows, runs on Android emulator in CI) |
| Web E2E | Playwright |
| Load tests | k6 (dispatch and location ingest) |
| Lint / format | ESLint + Prettier, `tsc --noEmit` in CI |
| CI/CD | GitHub Actions; EAS Build/Submit for apps |
| Hosting | AWS ap-south-1 (Mumbai): ECS Fargate or EKS, RDS Postgres, ElastiCache Redis |
| IaC | Terraform |
| Observability | OpenTelemetry → Grafana Cloud (or self-hosted Prometheus/Loki/Tempo); Sentry for crashes |
| Feature flags | Database-backed flags per zone/category (no vendor needed at pilot scale) |
| Secrets | AWS Secrets Manager |
| i18n | ICU MessageFormat JSON catalogues in `packages/i18n`; **Noto Sans Tamil** font; CI check for missing Tamil keys |

## Repository layout

```
packages/
  tariff/     fare engine + versioned tariff data (auto, bike, cab, parcel)
  meter/      GPS filtering, distance and waiting accumulation for the virtual meter
  shared/     service catalogue, trip state machines, shared types
  i18n/       en / ta catalogues and formatters
apps/         (next)  rider, driver, ops, api
web/          original clickable prototype (reference until apps/rider replaces it)
video/        Remotion demo pipeline
```

## Cost notes for the pilot

The OSM stack (OSRM, Photon, MapLibre) replaces Google Maps per-request fees, which is the largest variable cost for ride apps at pilot scale. A single 4 vCPU / 16 GB machine runs OSRM for the Tamil Nadu extract. SMS OTP costs about ₹0.15–0.25 per message on DLT routes. Get vendor quotations before budgeting.
