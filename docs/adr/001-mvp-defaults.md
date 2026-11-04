# ADR 001: MVP implementation defaults

Date: 2026-10-25. Status: selected implementation defaults under the request to finish MVP; revisable product choices.

- One Next.js app, Prisma/PostgreSQL, Auth.js Google OAuth with database sessions. No custom passwords or production demo-login bypass.
- Trip creator is the sole organizer. Existing addedById is provenance, not removal authority. Ownership transfer and trip/account deletion remain unavailable until lifecycle policy exists.
- Invitations are reusable for seven days, revocable, and cannot grant organizer access. Removal revokes all current trip invitations so a removed member cannot reuse an old link. The organizer can issue a new link when desired.
- Votes are yes/no and editable, without deadlines or automatic winners. Only current members count. Removal deletes that member's votes; rejoining starts without votes. Individual responses remain private; aggregate counts and your own response are visible.
- Authors/organizers may edit or delete an activity only before any votes exist. Proposed activity scheduling is manual.
- Organizer edits itinerary. Overlapping entries are allowed; all entries must fit the trip dates. Date/timezone changes that invalidate existing entries are rejected. Optimistic versions prevent lost updates.
- USD only for MVP, stored as integer cents. Total/per-person mode is explicit; no derived totals or contributions. Existing decimal columns are retained pending a reviewed data migration.
- Private checklist data remains stored after removal but is inaccessible without membership. Rejoin restores access. Retention/account deletion/support policy still requires owner configuration before public pilot.
- Auth credentials, hosting budget, public deployment, recovery targets, and pilot policy remain external setup work; local implementation must not claim these are complete.

These choices resolve the corresponding draft alternatives in PRD/feature docs for implementation. Tests must cover them. Record changes here and update behavior/tests together.

Scope update 2026-10-27: the user requested the LangChain activity planner as an implemented feature. [ADR 002](002-activity-planner.md) records its provider, authorization, validation, and spending-limit defaults. Calendar/reminders remain deferred.
