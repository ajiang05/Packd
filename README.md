# Packd

A group travel planner built with Next.js, React, TypeScript, PostgreSQL, Prisma, Auth.js, Docker, and LangChain. Create a trip, invite friends, propose and vote on activities, set a budget, build an itinerary, and keep a private checklist.

The core application is implemented and locally verified; external release setup remains in progress. Local tests use real PostgreSQL and database-backed test sessions; they do not prove that Google OAuth or a public deployment is configured. See [MVP status](docs/MVP_STATUS.md) for verified evidence and remaining gates.

## Local setup

Requirements: Node.js 24, npm, Docker with Compose, and a Google OAuth web application for real sign-in.

From the repository root:

```sh
docker compose up -d db
cd frontend
cp .env.example .env
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

Before starting the app, edit `frontend/.env`: generate a unique `AUTH_SECRET` using `openssl rand -base64 32`; set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` from your OAuth app. Register `http://localhost:3000/api/auth/callback/google` as its development redirect URI. Do not commit secrets. Open http://localhost:3000 and sign in with Google. The app shows a configuration message rather than a fake login when OAuth credentials are missing.

The local database uses port 54329, a named Docker volume, and development-only credentials. `docker compose stop` preserves it. Do not use `docker compose down -v` unless you intend to erase that local database.

If port 3000 is occupied, prefix Compose startup with `PACKD_PORT=3002` and register the matching Google redirect URI.

To run both the application and database in Docker after configuring `frontend/.env`:

```sh
docker compose up --build -d
```

Compose applies committed migrations before starting the app. For multi-instance production deployments, run migrations once in a release job, not independently in each replica. Existing databases created from the old exploratory schema require an inspected migration/baseline; do not reset them or mark migrations applied without comparing schemas.

## Verification

Create the separate test database once:

```sh
docker compose exec db psql -U packd -d postgres -c 'CREATE DATABASE packd_test;'
cd frontend
export DATABASE_URL=postgresql://packd:packd_local_only@localhost:54329/packd_test
npm run db:migrate
npm run test:integration
npm run lint
npm run typecheck
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

`npm test` runs unit tests and only enables database tests when a test database is configured. `npm run test:integration` fails early unless the database is named `packd_test`, preventing a skipped database suite from being mistaken for full verification. Browser tests run the production build (`npm run build` first), or use `PACKD_E2E_BASE_URL` for an already-running test instance. They create their own accounts and sessions directly in that database; there is no app endpoint that bypasses Google sign-in.

## Engineering

- REST route handlers call transaction-bound services with membership/ownership checks.
- PostgreSQL uniqueness prevents duplicate memberships and votes; trip row locks serialize related mutations.
- Version checks reject stale itinerary edits. Date/time controls convert using the trip timezone and reject ambiguous daylight-saving times.
- Invitation tokens are stored as hashes, expire in seven days, and can be revoked. Member removal clears their votes and revokes current invitations.
- Budgets use USD integer cents; contribution tracking is excluded.
- Private checklists remain inaccessible to other members, including organizers.
- API mutations enforce same-origin JSON requests, bounded bodies, and database-backed per-user rate limits.
- Structured logs include request ID, method, status, and duration without request bodies. OpenTelemetry registration is opt-in via `OTEL_EXPORTER_OTLP_ENDPOINT`.

[API contract](docs/openapi.json) · [Architecture](ARCHITECTURE.md) · [Product requirements](PRD.md) · [MVP](MVP.md) · [Implementation defaults](docs/adr/001-mvp-defaults.md) · [Operations](docs/OPERATIONS.md)

GitHub Actions checks the app and builds its container. The manual release workflow requires a successful CI run for the same main-branch commit, a configured production environment, registry access, and a host-specific deployment hook. Hosting, Google OAuth credentials, and the public pilot policy remain owner setup decisions.

## AI activity planner

On a trip’s Activities page, choose **Find activity ideas**, enter preferences and an optional maximum estimated price per person per activity, then add selected cards to proposals. Suggestions use shared trip context and sourced search results; they never vote or schedule automatically.

Set these server-only variables in `frontend/.env` (Compose reads this file):

```dotenv
ANTHROPIC_API_KEY=your-key
ANTHROPIC_MODEL=claude-haiku-4-5-20251001
TAVILY_API_KEY=your-key
AI_DAILY_REQUEST_LIMIT=100
```

Restart/recreate the app after changing configuration. LangChain TypeScript connects Claude to a bounded Tavily search workflow. Both provider keys are required; without them the UI explains that suggestions are unavailable and manual entry still works. Five requests/user/minute and a global rolling 24-hour request cap bound use; provider billing limits must be configured separately. Prices and availability are unverified. See [feature specification](features/activity-generator.md), [architecture decision](docs/adr/002-activity-planner.md), and [operations](docs/OPERATIONS.md).
