# Architecture and implementation approach

## Current prototype

`web/index.html` provides the shell, `web/style.css` the responsive presentation, and `web/app.js` the application and demo state transitions. Data is persisted to browser localStorage. This intentionally small prototype demonstrates workflows and product language; it is not a production backend.

Trip lifecycle: Requested → Accepted → Arrived → In progress → Completed. Requests can be cancelled before a trip starts. A displayed four-digit demonstration OTP gates the start transition. The first completed trip on an India-calendar day creates one ₹10 ledger charge. This is client-side behavior only; it has no security or payment guarantees.

`video/generate-scenes.cjs` executes the prototype against DOM stubs and snapshots nine HTML states. `video/index.jsx` sequences these in a phone frame using Remotion. Frames are simulated walkthroughs of the current source, not a live device screen capture.

## Proposed production architecture

Start with a modular backend and independent workers. Proposed stack from the original plan: Flutter passenger/driver clients, React operations console, TypeScript/NestJS, PostgreSQL/PostGIS, Redis and encrypted object storage. These components are planned, not supplied in this commit.

Modules: identity and consent; driver compliance; locations and availability; quote and tariff; bookings; dispatch; trip lifecycle; ledger and payments; notifications; safety and support; aggregate reporting.

Use database transactions for booking assignment and accounting, an outbox for reliable events, integer paise for money and idempotency keys for retried mutations. Redis is transient cache, never the financial source of truth. Keep tariff snapshots with quotes and trips. Use provider adapters for maps, messaging, payment and verification.

## Engineering gates

- One accepting driver wins an offer atomically; competing accepts cannot double-book.
- A completed-trip retry cannot duplicate a receipt, payment or daily fee.
- Expired driver documents and disabled service zones block assignment server-side.
- Payment webhooks require signature checks, deduplication and daily reconciliation.
- A network interruption resumes authoritative server trip state without duplicate completion.
- Staff access requires MFA, least privilege, audit trails and restricted safety evidence access.
- Data retention, deletion and consent are explicit; government dashboards use aggregates by default.

## Delivery practice

Maintain a requirements register, architecture decisions, legal-source register, threat model, API contracts and release checklist. Build one pilot zone first and measure supply, completion, safety response and contribution margin before scaling. Choose service categories only after documented regulatory clearance.
