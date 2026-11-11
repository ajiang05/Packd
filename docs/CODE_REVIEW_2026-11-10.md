# Code review — November 10, 2026

Reviewed the application routes, authentication, database schema and migrations, business logic, AI integration, React screens, Docker setup, and automated tests. Fixed reproducible defects and added regression coverage. This is a point-in-time review, not a guarantee that every possible bug has been eliminated.

## Fixed findings

- **Expense arithmetic:** equal splits dropped remainder cents. Splits now distribute every cent deterministically, including amounts smaller than the participant count. Changing a solo expense to shared rebuilds its splits. Duplicate participants produce validation errors instead of database failures.
- **Expense privacy:** settlement summaries included private subgroup expenses visible to other members. Summaries now use the caller's visible shared expenses, and the UI explains that this is a personal view. Organizers cannot read or change another payer's solo expenses through mutation endpoints.
- **Development authentication:** the demo route could impersonate an existing account and could be enabled in production. It now requires development mode, explicit opt-in, a same-origin local POST, and a dedicated demo account. Production denies access even with the opt-in flag set.
- **Planning tasks:** reading an empty task list created defaults, allowing duplicate creation and resurrecting deleted tasks. Defaults now belong to the atomic trip-creation operation; reads do not write.
- **Revoked access:** cached trip details could remain visible after a permission failure. Failed reloads now clear the displayed trip and cached members.
- **Itinerary:** selecting no linked activity previously sent an omitted field, leaving the old link in place. The request now sends an explicit null.
- **Dialogs:** replaced the visual-only modal with a native modal dialog to constrain keyboard focus, restore focus on close, and support touch scrolling.
- **Expense UI:** disallows saving a shared expense with no selected participants; loading and failure no longer falsely claim that debts are settled.
- **Logging:** removed raw exception logging from API error handling; structured request metadata remains.
- **Configuration and documentation:** shared deployments can set `PACKD_PUBLIC_URL`; corrected outdated AI-provider instructions and broken documentation links, and documented planning-task APIs and settlement visibility.
- **AI model:** replaced the retired `gemini-2.0-flash` default and local override with `gemini-3.6-flash`, and explicitly pass the configured Gemini API key to LangChain. See [Google's deprecation schedule](https://ai.google.dev/gemini-api/docs/deprecations).

The pre-existing invitation-screen edits were preserved. Test writes were restricted to `packd_test`. A read-only check of the main database found no existing shared expenses whose splits disagreed with their total, so no data repair was performed.

## Verification

- 54 unit and PostgreSQL integration tests pass, including five new regression cases that failed before the fixes.
- Production build, TypeScript, lint (zero errors), OpenAPI validation, and Docker Compose validation pass. A fresh Docker application image also built successfully; the final modal cleanup adjustment was verified in the local production build and all three browsers.
- Dependency audit reported zero production vulnerabilities at review time.
- All 21 browser cases pass across Chromium, Firefox, and Linux WebKit. One long Chromium journey exceeded the 45-second overall timeout during concurrent builds; its isolated rerun passed in 13.3 seconds. WebKit used the current source with a cached runner containing matching Playwright and Prisma versions.

## Limits and remaining considerations

- Three existing lint warnings recommend optimized image rendering. These are performance warnings, not test failures.
- Real Google OAuth consent/login and a public hosted deployment were not exercised. Browser tests use isolated database sessions.
- Two synthetic live AI requests reached Gemini but both received HTTP 503 due to provider demand. Successful live generation remains unverified; automated provider-output and UI error-recovery tests pass.
- Existing empty trips are not backfilled with default tasks. Users can create tasks normally; deleted defaults stay deleted.
- Settlement suggestions deliberately reflect the caller's accessible expenses. They are not a canonical trip-wide settlement or a payment-processing system.
