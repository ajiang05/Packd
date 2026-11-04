# MVP verification status

Updated 2026-10-27. Core flows are implemented and locally verified. The full deployed MVP remains incomplete: external authentication, remote delivery, and public-pilot configuration are not complete.

## Evidence

| Area | Verified evidence | Remaining limitation |
| --- | --- | --- |
| Accounts | Protected endpoints deny anonymous requests; sign-out deletes database session; old-cookie replay returns 401 | Real Google sign-in/cancellation needs credentials |
| Trips/membership | Atomic creation/rollback, edits, role checks, concurrent invite acceptance, expiry/revocation, organizer protection and removal | Ownership transfer/deletion deferred |
| Budget/proposals/voting | Exact cents, invalid values, edit/delete permissions, concurrent unique votes and totals | USD and yes/no are selected MVP defaults |
| Itinerary | Timezone/DST validation, invalid times, conflicting updates and version-checked deletion | Calendar synchronization excluded |
| Checklists | Owner isolation even from organizer; edit/delete, completion/reload, failed-save rollback | Public retention policy needs owner setup |
| Unit/database tests | 30 passing cases across six files, including PostgreSQL and mocked provider contracts | Isolated packd_test database required |
| Chromium/Firefox | Eight browser cases pass on the production build: group journey, session invalidation, keyboard/accessibility, and AI suggestion error recovery/acceptance | Not every OS/device combination |
| WebKit | Four browser cases pass on the updated Docker image in supported Linux container | macOS 14 bundled WebKit cannot start; native current Safari remains a release-device check |
| Accessibility | Axe A/AA checks pass on seven core screens; keyboard-only checklist creation/completion persists; 320px reflow checks pass across all trip sections | Real screen-reader/native-device/200% browser-zoom review remains incomplete |
| Build/contracts | Type checks, lint, production/Docker builds, OpenAPI validation and whitespace checks passed | Remote CI not run |
| Docker/recovery | Health checks pass; test trip/vote/checklist survived restart and separate backup restoration | Managed backups/recovery targets not configured |
| Performance | 200 authenticated reads at concurrency 10; zero errors; p50 69.69 ms and p95 161.45 ms | Local baseline only; [record](verification/local-benchmark.json) |
| Observability | Local receiver observed Packd service, domain spans and valid trace IDs | [Sanitized record](verification/otel-probe.json); production collector/alerts unconfigured |
| Delivery | CI and manual release definitions; exact revision check via /api/version | Host adapter, credentials and remote verification required |
| AI activity planner | LangChain/Claude/Tavily implementation; schema/source/budget validation, minimal context, membership recheck, atomic quotas, explicit proposal acceptance; mocked provider and browser tests pass | Live provider keys, recommendation quality and cost verification pending |

## Reproduce checks

From `frontend/`, with `DATABASE_URL` targeting the isolated `packd_test` database:

```sh
npm run db:generate
npm run db:migrate
npm run test:integration
npm run typecheck
npm run lint
npm run api:validate
npm run build
npm run test:e2e
```

Browser tests start the production server, avoiding development compilation timeouts. `PACKD_E2E_BASE_URL` targets an existing isolated instance. `Dockerfile.e2e` supports Linux WebKit verification; see [operations](OPERATIONS.md). Tests create sessions directly in the test database; no app login bypass exists.

## Remaining completion gates

1. Supply Google OAuth credentials through environment/secret manager, register the callback, and verify real sign-in/cancellation.
2. Select hosting and operating budget; configure managed PostgreSQL, HTTPS, deployment adapter, production secrets, backups and telemetry.
3. Run remote GitHub CI, deploy the exact verified commit, and verify the real-user journey on that deployment.
4. Finish release-device accessibility review and agree performance/recovery thresholds for the chosen host.
5. Configure Claude and Tavily credentials and provider billing limits; run a live sourced-suggestion quality/cost smoke check.
6. Configure a pilot support contact and retention/account-deletion procedure before collecting real user data.

No paid infrastructure was provisioned, secrets committed, or invitations sent to third parties. The ignored local environment file has a generated development secret and blank Google credentials. Local containers and tests are not a public deployment.

## Previous continuation audit (before AI feature)

The additional keyboard/accessibility case passed in Chromium, Firefox, and supported Linux WebKit. Combined with the existing flow and session cases, nine browser checks now pass. Type checks and lint also passed after the test addition. No application behavior changed in this verification pass.

Configuration presence was rechecked without printing secrets: AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET remain unset. No hosting choice or public release configuration has been supplied. These still prevent completing the original deployed-MVP objective; repeated test runs cannot resolve them.

## LangChain feature verification — 2026-10-27

The expanded MVP includes the activity planner (FR-009). Thirty unit/database/provider-contract tests pass. The provider contract test exercises the real LangChain Anthropic adapter against mocked HTTP responses; no paid model/search requests were made. Chromium and Firefox each pass the new browser case covering missing configuration, provider errors, empty results, source links, explicit acceptance, failed-save recovery, persisted proposals, no automatic votes/scheduling, and 320px accessibility. Existing browser journeys also pass. Production build, type checks, lint, OpenAPI validation, and local documentation links pass.

Provider secrets were not supplied or committed. Live output quality, current venue details, latency/cost, and public deployment remain unverified. README, product/architecture/frontend/MVP plans, all feature specifications, API contract, operations, and ADR 002 describe the new scope and configuration.

Final container verification: Docker build passed; all four WebKit cases passed in supported Linux, bringing the browser total to twelve checks across three engines. The local Compose application was refreshed on port 3002 without resetting the database volume.
