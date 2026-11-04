# Packd Operations

## Configuration and deployment

Use a container-capable host with HTTPS and a managed PostgreSQL database. The repository does not select a paid provider or provision resources. Configure `DATABASE_URL`, a unique `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_URL` pointing to the public HTTPS origin. Register that origin's `/api/auth/callback/google` with Google. Set `AUTH_TRUST_HOST=true` only behind a trusted proxy that sanitizes forwarded host headers.

Build with `docker build -t packd:release frontend`. Supply secrets at runtime, never as Docker build arguments. Run `npx prisma migrate deploy` once using the release image and database connection, then start `npm start` on port 3000. Configure the host to use `/api/health` for readiness and `/api/live` for liveness. Never expose the PostgreSQL port publicly.

The GitHub manual release workflow publishes a commit-tagged image to GHCR. Configure the `production` environment, `DEPLOY_HOOK_URL` secret, and `APP_URL` variable. The hook must consume `{ "image": "ghcr.io/owner/repository:commit" }`, apply migrations once, and deploy that exact image. This is an integration contract, not a claim that an arbitrary provider's native deploy hook implements it. The final host-specific adapter remains pending until a host is selected. The workflow builds with RELEASE_VERSION set to the commit and waits for /api/version to report that exact revision before accepting readiness.

## Health, logs, and traces

- `/api/live`: process is serving requests, no database dependency.
- `/api/health`: readiness; returns 503 if the database cannot answer `SELECT 1`.
- API logs: request ID, HTTP method, status, duration; no cookies, tokens, payloads, checklist contents, or email addresses.
- Set `OTEL_EXPORTER_OTLP_ENDPOINT` and provider-specific exporter headers through the secret manager to enable traces. Validate collector retention/access before connecting real users. Do not enable broad request-header/body capture.
- Configure alerts for readiness failure, sustained 5xx responses, and database connection exhaustion after recording a baseline. Alert thresholds and recovery objectives need owner approval before public launch.

Mutations allow 120 per minute per user; invitation operations allow 20 per minute per user. These limits work across replicas through PostgreSQL and return 429/Retry-After. Configure edge rate limits for unauthenticated/authentication endpoints on the selected host. Expired `RequestLimit` records can be pruned with a scheduled maintenance task; never log raw keys or credentials.

## Backup and recovery

Before real pilot data, enable managed database backups and confirm retention and point-in-time recovery with the owner. Record the backup schedule, recovery point objective, recovery time objective, and restore evidence. A backup setting alone is not a verified restore.

Local development restore exercise, using only the isolated test database:

```sh
docker compose exec -T db pg_dump -U packd -d packd_test --format=custom > /tmp/packd-test.dump
docker compose exec -T db psql -U packd -d postgres -c 'CREATE DATABASE packd_restore_test;'
docker compose exec -T db pg_restore -U packd -d packd_restore_test --no-owner < /tmp/packd-test.dump
```

Compare migration history and representative row counts/content in the source and restored database. Keep dumps out of source control and remove private-data copies according to the agreed retention policy. Do not restore over the live database as a routine test.

## Rollback and incidents

Keep the previous image digest. On a bad application release, stop rollout and restore it only if the current schema is compatible. For destructive/incompatible schema changes, use a reviewed forward fix or the tested restore procedure; an image rollback alone cannot undo a data migration.

Unauthorized access or corrupted data is a stop-release condition. Restrict access, preserve sanitized diagnostic evidence, identify affected records, and have the owner decide recovery and user communication. Do not erase evidence or silently reset the database.

## Pilot prerequisites

Confirm hosting budget, Google OAuth consent/test users, support contact, data retention and account-deletion procedure, and permission to collect pilot data. Existing cascade relations do not define a user-facing deletion policy. No payment data is collected by the app. The owner must supply the actual policy and contact before public enrollment.

## Local verification environment

The core journey passed on Chromium and Firefox against the production container. The installed macOS 14 WebKit build cannot start with this Playwright version (`PushAPIEnabled` protocol mismatch); this is not an application failure. `frontend/Dockerfile.e2e` provides a supported Linux WebKit environment matching the locked Playwright version. Run it on the same Docker network as an isolated application using `packd_test`, set `PACKD_E2E_BASE_URL` to that application's origin, and ensure the application's `AUTH_URL` matches. Never point these seeded-session tests at a public or production database.

`frontend/scripts/otel-probe.mjs` is a local HTTP/JSON verification receiver. It retains only aggregate span counts and service detection, not payloads or attributes. It is not a production collector. See `docs/verification/otel-probe.json` for the recorded trace-emission check.

## AI planner configuration and verification

Configure `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, optional `ANTHROPIC_MODEL` (default `claude-haiku-4-5-20251001`), and `AI_DAILY_REQUEST_LIMIT` (integer 1–10,000, default 100) as server secrets/settings. Recreate Compose app containers after changing env values. Never use `NEXT_PUBLIC_` for credentials. Set provider account spending limits; request quotas are not dollar budgets. Search uses Tavily basic search, at most eight results; one model call returns at most five suggestions with a 2,500-output-token cap and a combined 45-second deadline. No automatic retries; failed attempts consume quota. RequestLimit uses stable global/user keys and rolling windows, shared across app replicas. Do not delete active quota rows as routine cleanup.

Provider outages/configuration gaps leave manual proposals usable. Errors: 503 unconfigured, 429 quota, 502 provider/invalid output, 504 deadline. Generation returns 200 and creates no planning records. Logs retain request metadata only; avoid enabling prompt tracing without reviewing provider retention and shared trip data exposure. Preferences and shared trip context go to Claude; destination/preferences go to Tavily. Private checklists and account identifiers are excluded.

Before enabling the public feature: configure provider budgets/retention, sign in as a real member, request sourced destination ideas, inspect source relevance and price labels, accept one, reload and verify the proposal, and check votes/itinerary remain unchanged. Record actual latency/token cost and source quality from live calls. Automated provider mocks establish behavior but cannot establish live recommendation quality or credential validity. See [ADR 002](adr/002-activity-planner.md).

The host/reverse proxy must allow requests longer than the planner’s 45-second deadline (configure at least 50 seconds). Shorter platform limits can terminate generation before Packd returns its recoverable timeout response.
