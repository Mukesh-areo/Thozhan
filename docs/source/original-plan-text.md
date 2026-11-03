# Original plan text extraction



Reference extraction of the supplied DOCX. The DOCX is authoritative for layout and ordering. Tables are appended after paragraphs. This is a planning document, not implemented scope.



Tamil Nadu Mobility & Parcel Platform

FULL SOLUTION ARCHITECTURE • PRODUCT REQUIREMENTS • DELIVERY ROADMAP • GOVERNMENT PARTNERSHIP READINESS

Version 1.0  |  28 October 2026  |  Working planning document

Proposed commercial model: ₹10 per active driver per day; no percentage commission on completed rides. Government-notified auto tariffs form the auto fare baseline, subject to validation against the authoritative notification.

Executive decision

Build a modular, independently owned platform with customer and driver mobile applications, an operations console, configurable pricing and compliance controls. Pilot auto-rickshaw booking in a limited Chennai zone before state-wide expansion. Treat government partnership as an optional procurement route, not a launch dependency.

1. Objectives, scope and assumptions

1.1 Outcomes

Transparent, regulator-configurable auto fares; accurate fare estimates and itemised receipts.

Improved driver earnings through zero percentage ride commission, subject to applicable payment and other fees being disclosed.

Fast, reliable matching, Tamil-first usability, safe journeys, accessible customer support.

Auditable operational and financial reporting suitable for independent and public-sector review.

1.2 MVP and later phases

Explicit exclusions for MVP: direct integration with competitor private APIs; copying proprietary algorithms; autonomous surge pricing; large-scale multi-city operations; unsupported vehicle categories.

2. Users, channels and product modules

3. Reference architecture

Architecture principle: start as one deployable backend with strict domain modules, independent background workers, and well-defined interfaces. This is cheaper and easier to operate than premature microservices; separate high-load components later.

Customer Flutter App    Driver Flutter App    Admin React Web

                    ↓ HTTPS / API Gateway / WAF

Auth & Identity  |  Profiles/KYC  |  Booking  |  Dispatch  |  Trip Lifecycle

Fare & Tariff  |  Subscription Ledger  |  Payments  |  Notifications  |  Support/Safety

                    ↓ Domain events / Outbox / Job queue

PostgreSQL + PostGIS (system of record)  |  Redis (short-lived location/cache)  |  Object storage (documents)

                    ↓ External services through adapters

Map/geocoding/routing  |  SMS/OTP/push  |  UPI payment gateway  |  Identity verification (consented)

3.1 Deployment topology

Production and staging in separate cloud accounts/projects; India-region hosting where suitable and contractually required.

Containerised API, worker and admin front-end behind managed load balancer; managed Postgres with automated backup and point-in-time recovery.

Private network for database/Redis; encrypted object storage; CDN for public static assets only.

Central logging, metrics, traces, alerting, secrets manager, key rotation and vulnerability scanning.

Multi-AZ redundancy when usage justifies it; define recovery objectives before procurement.

4. Domain services and ownership

5. Critical end-to-end workflows

5.1 Booking to completion

Customer selects pickup/drop and vehicle type; system checks category eligibility in the geography.

Fare service returns a versioned estimate, route basis and any disclosed exclusions.

Booking created with an idempotency key and immutable estimate/tariff snapshot.

Dispatch selects nearby eligible drivers using geospatial radius, freshness, documents and fairness constraints.

Offer sent to a driver; acceptance uses a single atomic assignment; competing offers expire.

Customer sees driver and ETA; driver arrives; trip starts only after customer OTP or approved alternative.

Live tracking uses adaptive intervals; trip completes with actual eligible distance/time and fare calculation.

Receipt issued; cash/UPI state reconciled; support and dispute windows remain open.

5.2 Driver ₹10 active-day charging

Define “active day” contractually before coding. Recommended pilot rule: charge once per local calendar day only after the first completed eligible earning trip, rather than merely logging in. Provide a transparent ledger, dispute/refund rules, daily cap of ₹10, and no duplicate debit across retries. Alternative policies require user research and legal review.

5.3 Cancellations, safety and failures

Quote expiry and price refresh when conditions change; clearly display any allowed waiting or cancellation charges.

No assignment if permit/document expired, driver location stale, or vehicle category disabled.

Network loss: retain trip state server-side, resume safely; never charge twice for the same trip/day.

SOS triggers prioritised incident workflow, location sharing per consent and escalation to emergency services where appropriate.

Dispute resolution with documented evidence retention and restricted staff access.

6. Government auto tariff engine

Treat government fare rules as configuration, not hard-coded constants. The previously discussed 27 October 2026 Tamil Nadu tariff figures are planning inputs ONLY until checked against the official gazette/order and applicability conditions by counsel or the transport authority.

These are not certified legal tariff statements. Confirm exact rounding, partial-kilometre rules, waiting thresholds, night multiplier scope, ghat-road distance, taxes, booking charges, and effective dates before enabling production billing.

Suggested daytime illustration: 5.0 km, no waiting = ₹50 + (5.0 − 1.8) × ₹25 = ₹130, assuming proportional distance billing is permitted. Actual implementation must follow official rounding rules.

6.1 Data model and controls

TariffRule: jurisdiction_id, service_type, legal_reference, effective_from/to, base_distance, base_fare, per_km, waiting, time_bands, rounding_method, tax treatment, approval status.

Quote: route inputs, tariff_version_id, calculation breakdown, quote_expiry, route provider, checksum.

Dual approval for tariff changes; staging simulations, regression tests, scheduled activation and rollback.

Separate rule sets for cabs, parcels and any legally permitted bike-taxi services; never reuse auto rules by default.

7. Data architecture and key entities

Use PostGIS geography indexes for proximity search. Keep Redis as a cache, not a financial system of record. Use database transactions and an outbox table for reliable event delivery. All monetary amounts stored as integer paise.

8. API and event contracts

All write APIs require idempotency or deduplication where relevant; role-based scopes, rate limits, schema validation, and correlation IDs. Publish OpenAPI specs and version contracts.

9. Dispatch and location design

Filter by vehicle class, active compliance, service-area geofence, current online state and fresh location.

Rank candidates by ETA, distance, recent acceptance, fairness and customer wait; avoid discriminatory attributes.

Offer to a bounded number of drivers, sequentially or in controlled batches; prevent double assignment with transactional locking.

Use adaptive GPS intervals and battery-aware background location; disclose collection and obtain required OS permissions.

Measure P50/P95 time-to-match, acceptance, cancellations, stale-location rate and trip completion.

10. Security, privacy and compliance

Perform a legal review of Tamil Nadu aggregator rules, transport permits, vehicle categories, insurance, labour and consumer requirements before public launch.

Confirm applicability and compliance obligations under India’s Digital Personal Data Protection framework and relevant implementation timelines.

Explicit privacy notices and consent flows; data minimisation; deletion/retention schedules; access/export request handling.

Encryption in transit/at rest, secure key management, MFA for staff, least-privilege RBAC, device/session controls.

Independent penetration testing, OWASP MASVS/ASVS checks, dependency/SBOM scanning and incident response drills.

Background location, driver/customer phone masking and emergency sharing should be designed for necessity and auditability.

Payments through a licensed provider; do not store card credentials; review tax/GST and marketplace/payment flows with advisers.

Do not reverse-engineer competitors to extract private APIs, secrets, customer data or protected source code. Use public workflow research and clean-room implementation.

11. Product experience and accessibility

Tamil as a first-class language; English alternative; large readable fare and booking actions.

Driver app optimised for low-end Android devices, weak networks, clear audio/visual trip prompts.

Accessibility: screen-reader labels, high contrast, scalable text, large touch targets.

Explain government-based fare, estimated vs final fare, waiting charges and complaint process before confirmation.

Customer/driver feedback channels, anti-fraud reporting, transparent suspension and appeal process.

12. Non-functional requirements and SLO targets

Load test for expected concurrent drivers, heartbeat frequency, peak requests and map-provider quotas. Rebaseline targets after the first 30 pilot days.

13. Delivery plan and stage gates

Timeline is a planning estimate, not a delivery commitment. A public tender or government onboarding may take longer and is outside direct project control.

14. Team and governance

Cadence: weekly delivery review; fortnightly demos; monthly security/finance review; change-control board for tariff, pricing and compliance settings. Maintain risk register, decision log, vendor contracts and incident playbooks.

15. Budget and unit economics

The figures below are broad planning ranges for an original, production-oriented pilot; obtain vendor quotes. They exclude large-scale consumer marketing, government tender guarantees, and potentially substantial compliance or insurance costs.

Illustrative recurring operating budget: ₹3–10 lakh/month for a staffed pilot, highly dependent on driver volume, support model, maps/OTP, hosting, payment fees and marketing. These are estimates, not market quotations.

Break-even formula: paying drivers = fixed monthly costs / (₹10 × average paid days − variable monthly cost per paying driver). Example: ₹4 lakh fixed, 25 paid days, ₹40 variable = 4,00,000 / 210 ≈ 1,905 paying drivers. Excludes tax, acquisition, amortisation and exceptional support costs. Validate driver willingness to pay and active-day frequency before scaling.

16. Pilot design and success criteria

Suggested pilot: one Chennai cluster with a bounded service area, 50–150 verified auto drivers and controlled customer acquisition. Recruit drivers before marketing to riders. Use opt-in, informed participation and manual support backup.

Targets are hypotheses, not promises. Baseline and adjust only through documented steering decisions. Do not scale if supply density, complaints, legal status or unit economics are poor.

17. Government / PPP readiness workstream

Incorporate entity, clarify IP ownership, founders’ rights, code repository and assignment agreements.

Prepare a concept note and demo showing transparent tariff governance, Tamil accessibility, safety, welfare and reporting.

Track official CUMTA and Tamil Nadu procurement publications; verify whether any relevant tender is issued and read exact eligibility criteria.

Engage transport-law counsel to review licensing, permits, fare rules and parcel/bike service legality.

Prepare a tender-ready dossier: company registrations, financials, security policy, architecture, SLAs, references, team CVs and audited pilot metrics.

Consider a licensed software/managed service offer alongside PPP; price hosting, support, SLA penalties, data responsibilities and transition assistance explicitly.

Negotiate IP licence vs assignment, source-code escrow if required, data controllership, privacy, audit access, liability, exit and change requests.

No government endorsement, tender award, tariff approval or distribution commitment is assumed. Government observers should receive aggregate information only unless a specific lawful basis and contract permits more.

18. Risk register

19. Immediate 30-day action plan

Week 1: nominate product/tech owners; verify official tariff order and transport legal requirements; define launch geography and service categories.

Week 1–2: interview 25–40 drivers and 30–50 customers; document willingness to pay and current ride pain points.

Week 2: finalise product requirements, Figma user flows, fare acceptance examples and technical architecture decision records.

Week 2–3: obtain quotes for maps, OTP, payment gateway, hosting and verification; build a monthly cost model.

Week 3: build clickable prototype and technical spike for geospatial matching + fare versioning.

Week 4: confirm pilot partners, create delivery backlog, agree phase-gate budget and begin implementation.

20. Deliverables checklist

Product requirements document and acceptance criteria; Tamil/English UX prototypes.

Architecture diagrams, threat model, database ERD, API contracts, fare-rule specification.

Compliance matrix with authoritative government order references and sign-off owners.

Customer app, driver app, admin console, deployment infrastructure and CI/CD.

Automated tests: tariff, dispatch race conditions, ledger idempotency, payment webhooks, privacy controls.

Operations runbooks, support scripts, incident response, financial reconciliation and pilot KPI dashboard.

Government concept note, PPP/licensing term sheet, tender readiness pack and pilot impact report.

Appendix A — Example fare-rule configuration

{ "jurisdiction": "Tamil Nadu", "vehicleType": "AUTO", "status": "DRAFT_UNVERIFIED", "effectiveFrom": null, "baseDistanceMeters": 1800, "baseFarePaise": 5000, "extraPerKmPaise": 2500, "waitingPerMinutePaise": 100, "nightWindow": {"start": "22:00", "end": "05:00", "multiplier": 1.5}, "roundingPolicy": "PENDING_OFFICIAL_CONFIRMATION", "legalSource": "PENDING_VERIFICATION" }

Appendix B — Acceptance tests to implement first

Quote at base distance, just over base, exactly 5 km, midnight boundary, waiting and ghat road; compare with verified official examples.

Two drivers accept same offer simultaneously: exactly one assigned.

Same completed trip retried: exactly one final charge and receipt.

Two completed trips in same IST day: driver subscription charged at most once.

Payment webhook repeated or delayed: ledger remains balanced.

Expired permit or disallowed service area: booking/driver availability blocked.

Weak network during trip: server-side state resumes without duplicated completion.

Prepared as an execution blueprint, not a legal opinion, procurement notice or guaranteed financial projection.



Decision | Recommended baseline

Pilot | Chennai micro-market; autos first

Architecture | Modular monolith initially; event-driven boundaries; extract services when justified

Mobile | Flutter, Tamil and English

Backend | TypeScript / NestJS; PostgreSQL + PostGIS; Redis

Dispatch | Geospatial candidate search, fair offers, timeouts and retry

Revenue | ₹10 on an eligible active day; configurable policy and receipts

Compliance | Government tariff versioning, permits, privacy, safety, auditability

Government model | Private ownership with optional licensing / PPP subject to tender terms



MVP — must ship | Phase 2+ — conditional

Auto customer booking, live tracking, OTP start/end | Cab booking with separate tariff rules

Driver onboarding, KYC review, availability | Parcel pickup/drop, proof of delivery

Fare engine, ₹10 active-day subscription ledger | Bike taxi only after legal approval

Cash/UPI support, receipts, refunds workflow | Government integrations if authorised

Admin dispatch/support, SOS, complaints | Intercity, pooling, enterprise APIs



Actor | Core capabilities

Customer | Sign in, pickup/drop, estimate, choose vehicle, request, track, OTP, pay, receipt, rate, SOS, support

Driver | Onboard and upload documents, verification, go online, receive offers, navigate, trip lifecycle, earnings, ₹10 ledger, help

Fleet/association (later) | Manage authorised drivers, documentation and reports with role restrictions

Operations agent | Review onboarding, monitor rides, resolve disputes, dispatch assistance, refunds with approvals

Finance/admin | Tariff versions, subscription policy, reconciliation, settlement, analytics, permissions, audit log

Government observer (optional) | Read-only aggregate dashboards under formal agreement; no blanket personal-data access



Domain | Responsibility / key data

Identity & access | Phone verification, sessions, device risk, RBAC, consent

Driver compliance | Vehicle, licence, permit, insurance, document expiry, manual approval

Geo & availability | Driver heartbeat, coarse nearby discovery, TTL and online state

Booking | Request, quote snapshot, idempotency, cancellation reasons

Dispatch | Candidate ranking, offer windows, acceptance atomicity, reassignment

Trip | Arrival, OTP verification, start, stop, completion, route evidence

Tariff | Jurisdiction, category, time bands, minimums, rounding, effective dates

Billing | Daily activation policy, ₹10 charge, balance, payment receipts

Payments | Cash/UPI status, gateway webhooks, reconciliation, refunds

Safety & support | SOS, trusted contact, incident records, access-limited investigation

Analytics | Aggregate demand, acceptance, fulfilment, cost, service-level metrics



Planning input — verify official order | Proposed configured value

Base distance / fare | First 1.8 km / ₹50

Additional distance | ₹25 per km after base

Waiting | ₹1 per minute

Night window / factor | 10:00 PM–5:00 AM / 1.5×

Ghat-road base / additional | ₹60 base / ₹30 per additional km



Entity | Important fields / notes

User, Driver, Vehicle | UUID, contact, roles, status, compliance flags; PII minimisation

DriverDocument | Type, expiry, encrypted object pointer, verification decision

ServiceArea | Geofence, permitted categories, operating conditions

DriverLocation | Latest coordinate + timestamp; Redis TTL; limited history retention

Booking, DispatchOffer | Quote, status, candidate, timeout, atomic assignment

Trip, TripEvent | Start/end, timestamps, distance, status, immutable event trail

TariffRule, FareBreakdown | Effective version, legal source, itemised components

DriverDailyCharge, LedgerEntry | Date IST, eligibility event, ₹10 debit, refunds, uniqueness constraint

Payment, Refund | Provider reference, webhook idempotency, reconciliation status

SupportCase, Incident, AuditLog | Restricted evidence, retention, actor, reason, timestamp



Endpoint / event | Purpose

POST /v1/bookings/quote | Return signed fare estimate and tariff version

POST /v1/bookings | Create idempotent request

POST /v1/driver/availability | Set online/offline after eligibility checks

POST /v1/dispatch/offers/{id}/accept | Atomic acceptance

POST /v1/trips/{id}/start | OTP validation and start

POST /v1/trips/{id}/complete | Calculate final fare and receipt

GET /v1/drivers/me/ledger | Show ₹10 daily charges and adjustments

POST /v1/payments/webhooks/{provider} | Verify signature, deduplicate, reconcile

Events: booking.created, offer.accepted, trip.completed, charge.assessed | Async notifications, finance, analytics



Metric | Pilot target (proposed, not guaranteed)

API availability | 99.5% monthly; improve to 99.9% at scale

Quote API latency | P95 < 800 ms excluding external routing delay

Booking write latency | P95 < 1.5 s under planned pilot load

Dispatch offer latency | P95 < 3 s after candidate discovery

Double booking / double charge | Zero tolerated; automated reconciliation and alerts

Backup / recovery | Daily restore test schedule; proposed RPO 15 min, RTO 4 h

Support incident response | Severe safety events triaged immediately; formal on-call rota



Phase / time | Outputs | Exit gate

0. Discovery (weeks 1–3) | Legal/tariff review, driver/customer interviews, zone choice, PRD, vendor pricing | Approved scope and compliance go/no-go

1. Foundations (weeks 4–7) | Design system, cloud CI/CD, auth, KYC, database, admin base | Security and onboarding demo

2. Core mobility (weeks 8–13) | Quotes, booking, dispatch, tracking, trip lifecycle, receipts | End-to-end test rides in staging

3. Payments & safety (weeks 14–17) | ₹10 ledger, UPI, support, SOS, audit, reconciliation | Finance/security sign-off

4. Controlled pilot (weeks 18–25) | 50–150 approved drivers, limited service zone, real support | Pilot KPI thresholds achieved

5. Expansion (weeks 26–40) | More autos/zones, cabs if compliant, ops automation | Stable unit economics and SLA

6. Additional services (weeks 41–52) | Permitted parcels, partnerships, government-ready reporting | Independent compliance and operational review



Role | Pilot staffing assumption

Product owner / founder | 1

Technical lead / architect | 1

Flutter engineers | 2

Backend engineers | 2

QA automation / manual | 1–2

DevOps/security (shared) | 0.5–1

UX/UI designer | 0.5–1

Operations, driver onboarding and support | 3–6 as demand grows

Legal, transport and finance advisers | External / part-time



Cost area | Indicative one-time pilot range

Discovery, UX and legal planning | ₹3–8 lakh

Customer + driver apps | ₹10–22 lakh

Backend, dispatch, fare, billing, admin | ₹14–30 lakh

QA, security and deployment | ₹5–12 lakh

Pilot setup and contingency | ₹5–13 lakh

TOTAL illustrative build envelope | ₹37–85 lakh



Paying drivers | 25 paid days/month | Gross revenue at ₹10/day

500 | 12,500 | ₹1.25 lakh

2,000 | 50,000 | ₹5 lakh

5,000 | 125,000 | ₹12.5 lakh

20,000 | 500,000 | ₹50 lakh



KPI | Proposed gate / measurement

Supply | ≥70% of recruited drivers complete ≥1 trip/week

Fulfilment | ≥75% of valid requests completed in pilot zone

Time to match | P50 < 3 minutes during staffed pilot hours

Driver retention | ≥60% of weekly active drivers retained after 4 weeks

Customer repeat | ≥25% repeat within 30 days among eligible cohort

Fare accuracy | 100% audited test cases match approved tariff configuration

Economics | Contribution margin per active driver positive or documented path

Safety | All severe incidents logged, triaged and reviewed



Risk | Impact | Mitigation

Bike-taxi / parcel regulatory uncertainty | High | Feature flag; launch only with documented approvals

Tariff misinterpretation | High | Official source validation, counsel sign-off, versioned tests

Low driver density | High | Micro-zone launch, supply-first onboarding

₹10 pricing insufficient | High | Track contribution margin; optional B2B/government licensing

Safety incident / fraud | High | KYC, SOS, incident response, insurance review

Map/SMS cost spikes | Medium | Caching, quotas, vendor negotiation, adaptive tracking

Tender delayed / unavailable | Medium | Independent pilot and multiple partnership routes

Payment reconciliation failures | High | Idempotency, ledger controls, daily reconciliation

Privacy or data breach | High | Least privilege, encryption, minimisation, audit, response plan