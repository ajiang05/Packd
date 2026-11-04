# LangChain Activity Planner

Status: Implemented; automated and live-provider verification tracked in [MVP status](../docs/MVP_STATUS.md). Phase: Expanded MVP (FR-009), requested 2026-10-27.

## User story

As a trip member, I want sourced activity ideas tailored to our destination, dates, budget, and preferences so I can propose useful options for the group.

## Behavior

- On Activities, request up to five suggestions with optional preferences (600 characters) and a USD maximum per person per activity.
- Server loads shared trip context and up to 100 recent proposal names after checking membership. Private checklists/identities are excluded.
- LangChain invokes a Tavily search tool once, then Claude returns Zod-validated structured suggestions: title, description, location, nullable estimated cents/duration, and a supporting source index.
- Server attaches retrieved HTTPS source links and filters normalized duplicate names. An explicit cost cap excludes unknown and over-cap estimates. Trip budget is context, not an inferred remaining balance.
- Empty results are valid. Unavailable providers, missing keys, invalid responses, quotas, and timeouts have recoverable UI states. Manual proposals remain available.
- A member explicitly adds a card through the normal proposal API. Source/estimate wording and duration are retained in its description; normal voting then applies. No automatic votes, bookings, winners, or itinerary entries.

## Acceptance

1. Nonmembers cannot generate; removed members cannot receive results or save proposals.
2. Suggestions have only retrieved source URLs; malformed/model-invented sources fail validation.
3. Duplicate and explicit-budget filters apply on the server; all prices are estimates.
4. Provider calls hold no database locks; global/user quotas are atomic across app instances.
5. Selecting a suggestion persists an ordinary proposal; failed saves remain retryable and unselected cards remain drafts.
6. Test empty, malformed, provider-failure, timeout, missing-config, quota, privacy, source, and acceptance paths. Record a separate live-provider smoke check before release.

## Configuration and limits

Server-only `ANTHROPIC_API_KEY`, `TAVILY_API_KEY`, optional `ANTHROPIC_MODEL` (Claude Haiku 4.5 default), `AI_DAILY_REQUEST_LIMIT` (default 100). Five requests/user/minute; global rolling 24-hour cap; 45-second overall deadline; at most eight search results and 2,500 output tokens; no automatic retries. Failed attempts consume quota. Configure provider billing limits separately.

[ADR 002](../docs/adr/002-activity-planner.md) · [Operations](../docs/OPERATIONS.md) · [API contract](../docs/openapi.json)
