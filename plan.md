# Packd — Product and Engineering Plan

## 1. Executive Summary

Packd helps groups turn travel ideas into agreed plans. Members contribute activity suggestions, vote on decisions, coordinate a schedule, and prepare personal packing checklists.

## 2. Target Audience and Experience

- Students, Gen Z travelers, friend groups, and organizations planning trips together.
- Example: an organizer planning a fraternity trip to Puerto Rico needs members to contribute instead of doing all the planning alone.
- Mobile-first, polished interface inspired by the simplicity of Hinge, with accessible forms, keyboard navigation, and clear loading, empty, and error states.

## 3. Feature Specifications

Each file describes scope, proposed behavior, acceptance criteria, engineering considerations, and unresolved decisions. These are planning documents, not claims of implemented functionality. Proposed defaults may be refined before implementation.

| Feature                            | Specification                                        | Phase              |
| ---------------------------------- | ---------------------------------------------------- | ------------------ |
| Accounts and sign-in               | [Authentication](features/authentication.md)         | MVP                |
| Trip creation and management       | [Trips](features/trips.md)                           | MVP                |
| Invitations and member permissions | [Membership](features/membership.md)                 | MVP                |
| Trip budget                        | [Budgets](features/budgets.md)                       | MVP                |
| Activity suggestions               | [Activities](features/activities.md)                 | MVP                |
| Group voting and participation     | [Voting](features/voting.md)                         | MVP                |
| Shared schedule                    | [Itinerary](features/itinerary.md)                   | MVP                |
| Personal preparation               | [Checklists](features/checklists.md)                 | MVP                |
| Google Calendar integration        | [Calendar](features/calendar.md)                     | After MVP          |
| Destination-based suggestions      | [Activity generator](features/activity-generator.md) | After MVP          |
| Voting reminders                   | [Reminders](features/reminders.md)                   | Optional extension |

## 4. Engineering Requirements and Methodologies

- **API design:** REST endpoints implemented in Next.js route handlers, documented with OpenAPI. Validate requests on the server and use consistent error responses and appropriate HTTP status codes. Paginate growing collections.
- **Security:** use an established authentication library; enforce trip membership and organizer permissions for every protected server operation. Keep credentials out of source control and logs. Test cross-trip access attempts and revoked membership.
- **Database correctness:** use foreign keys, uniqueness constraints, migrations, and transactions for multi-step changes. Store money as integer minor units with a currency code. Store timestamps consistently and preserve the trip timezone for scheduling.
- **Concurrency:** enforce vote uniqueness in PostgreSQL, make invitation acceptance safe to repeat, and use version checks to prevent silent overwrites of itinerary edits.
- **Testing:** use Vitest for business rules, PostgreSQL integration tests for persistence and permissions, and Playwright for critical user journeys. Testcontainers can provide disposable PostgreSQL instances. Prioritize failure cases and meaningful behavior over a coverage percentage.
- **Delivery:** use GitHub issues with testable acceptance criteria, focused branches and pull requests, and a CI pipeline that checks types, lint, tests, and production builds. Keep each implementation slice independently reviewable.
- **Architecture decisions:** record significant choices and tradeoffs in short documents under `docs/adr/` as decisions arise. Start with one modular application.
- **Operations:** provide health checks, structured logs without sensitive data, and OpenTelemetry instrumentation for request traces and latency. Document configuration, migration steps, deployment, and recovery procedures.
- **Performance:** establish a measured baseline, inspect slow PostgreSQL queries with execution plans, and add indexes based on access patterns. Record workload, environment, error rate, and percentile latency for load tests; define performance targets before claiming improvements.
- **Portfolio evidence:** keep setup instructions, an architecture diagram, a working demo, and verified results. Resume metrics must come from actual measurements or usage.

## 5. Scope and Non-Goals

### MVP

Sign-in, trip management, invitations and member removal, a trip budget, activity proposals, voting with visible participation, a shared itinerary, and personal checklists. Deliver these through a responsive UI with automated checks and a deployed database-backed application.

### Deferred

Google Calendar integration, generated activity recommendations, background reminders, and real-time updates. These build on a complete core planning flow.

### Non-goals for MVP

Payments, booking flights or hotels, expense settlement, multi-currency conversion, native mobile apps, microservices, Kubernetes, and custom password authentication. Do not add Redis, a separate backend, or other infrastructure without an explicit feature need.

## 6. Technology and Architecture

| Layer                   | Planned choice                                                            | Purpose                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Frontend                | Next.js, React, TypeScript, Tailwind CSS                                  | Existing foundation; responsive UI and static typing                                                      |
| Backend                 | Next.js route handlers with feature-oriented service modules              | REST API and centralized business logic                                                                   |
| Database                | PostgreSQL                                                                | Relational data, constraints, transactions, indexes                                                       |
| Database tooling        | Prisma, proposed default                                                  | Typed database access and versioned migrations; Drizzle remains an alternative if a concrete need emerges |
| Authentication          | Established library with Google OAuth, provider/library to be selected    | Account identity and session management                                                                   |
| API contract            | OpenAPI and server-side schema validation                                 | Documented, validated requests and responses                                                              |
| Local environment       | Docker and Docker Compose                                                 | Reproducible app and PostgreSQL startup                                                                   |
| Tests                   | Vitest, Playwright, PostgreSQL integration tests; optional Testcontainers | Business rules, database behavior, end-to-end flows                                                       |
| CI/CD                   | GitHub Actions                                                            | Automated checks, container builds, deployment pipeline                                                   |
| Hosting                 | Container-capable cloud host and managed PostgreSQL; provider TBD         | Public application with persistent data                                                                   |
| Observability           | Structured logs and OpenTelemetry                                         | Debugging and measured request performance                                                                |
| Optional jobs           | Redis and a background worker when reminders are implemented              | Scheduled work, retries, duplicate prevention                                                             |
| Optional infrastructure | Kubernetes and Terraform after a working deployment                       | Deployment/scaling and infrastructure-as-code learning if relevant to target roles                        |

Request flow: React UI → Next.js REST endpoints → feature services → Prisma → PostgreSQL. Keep authorization and business rules on the server. The root `features/` folder contains specifications; application code remains under `frontend/` until a documented architectural change is justified.

A separate Java/Spring Boot backend is an alternative for a deliberate Java-backend career focus, not part of the current baseline.

## 7. Implementation Sequence

1. **Foundation:** configure PostgreSQL, Prisma migrations, Docker Compose, environment examples, basic test tooling, and GitHub Actions checks.
2. **First complete flow:** implement authentication, trip creation, invitations, and authorization with database integration tests and a browser test.
3. **Group decisions:** implement budgets, activities, voting, and participation visibility; verify concurrent writes and permission boundaries.
4. **Trip preparation:** implement itinerary editing and private checklists with conflict detection and end-to-end coverage.
5. **Release:** deploy the app and managed database, configure deployment automation, health checks, logs, and traces; document setup and measure performance.
6. **Extensions:** add calendar integration, activity generation, and reminders individually after their open decisions are resolved. Revisit Kubernetes only with a clear infrastructure learning objective.

## 8. Open Product and Implementation Decisions

- Authentication library and OAuth provider configuration; Google sign-in is the proposed starting point.
- Voting choices, deadlines, quorum, and what “everyone must vote” means operationally. Showing outstanding votes is planned; blocking finalization awaits a product decision.
- Whether all members can edit the itinerary or only the organizer; organizer-only editing is the proposed MVP default.
- Trip currency, budget presentation, and membership changes affecting per-person estimates.
- Calendar export versus direct Google Calendar synchronization, and recommendation data sources and costs.
- Cloud provider, operating budget, and measurable performance targets.

Resolve feature-specific uncertainties before implementing dependent behavior. Independent foundation work can proceed.
