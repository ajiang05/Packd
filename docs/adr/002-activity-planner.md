# ADR 002: LangChain activity planner

Date: 2026-10-27. Status: implementation default for the user-requested feature.

Use LangChain TypeScript in the existing Next.js server with Claude Haiku 4.5 (`@langchain/anthropic`) and Tavily search. Provider selection is configurable through server environment variables; no provider secrets ship to the browser. One deterministic search-tool invocation precedes one structured model call. This supplies current source material while bounding cost and latency without an autonomous agent loop.

Authorize membership before external calls and again before returning. Pass only destination, dates, timezone, budget/currency/mode, member count, recent proposal names, and user preferences. Search receives destination/preferences only. No private checklist/account/session/invitation data. The model returns source indices; attach validated retrieved HTTPS URLs server-side. Zod validates both input and output. Normalize names to suppress exact duplicates; exclude unknown/over-cap costs when the user sets a maximum. Estimates are not guarantees.

Users explicitly save selected ideas via the existing transactional activity API. Preserve source URL, duration and estimate notice in the activity description. Generated results are ephemeral, and no votes/itinerary entries are created automatically. No database migration, pgvector, Redis, separate Python service, or chat memory is required.

Use existing PostgreSQL RequestLimit storage for atomic global/user quotas. Defaults: 100 global requests per rolling 24 hours, five/user/minute, one search plus one model call, 2,500 output tokens, 45-second deadline, zero automatic retries. Failed calls consume quota. Provider billing limits and live quality/cost validation are deployment tasks.

References: [LangChain Anthropic integration](https://docs.langchain.com/oss/javascript/integrations/chat/anthropic), [LangChain tools](https://docs.langchain.com/oss/javascript/langchain/tools), [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search).
