# Packd — Product Requirements Document

## 0. Document Control

| Field | Value |
| --- | --- |
| Product / release | Packd / MVP v2.0 |
| Version / status | 2.0 / Approved Specification |
| Owner and decision authority | Aidan Jiang |
| Updated | 2026-11-01 |
| Release date | Unscheduled; driven by acceptance gates |
| Related documents | [MVP](MVP.md), [architecture](ARCHITECTURE.md), [frontend contract](FRONTEND_DESIGN.md), [visual identity](DESIGN.md), [plan](plan.md) |

Packd helps friend groups move travel plans out of scattered group chats into a cohesive, collaborative planning space. Packd is specifically designed to **split the work of planning trips across all members** — rather than placing the burden on a single organizer. Members suggest activities, vote on tactile cards, track and split expenses (Splitwise-style), monitor debt settlement, coordinate shared packing items, and maintain private preparation checklists.

Product promise: **Plan a trip together — distribute the decisions, the budget, and the prep work.**

## 1. Problem and Evidence

Students, Gen Z travelers, friend groups, and organizations often leave a single organizer responsible for collecting preferences, assembling itineraries, chasing down payments, and managing checklists. The conventional workflow relies on messy group chats, fragmented spreadsheets, and disparate notes, leaving suggestions unorganized and decisions stalled.

Packd distributes this workload by making suggestions, votes, expenses, split obligations, and preparation visible in the context of the trip. The design is inspired by modern tactile interfaces (like Hinge's clean, warm editorial style), making collaboration intuitive and social.

## 2. Goals, Non-Goals, and Measures

### User Outcomes

1. **Plan Together**: An organizer creates a trip and invites travelers via shareable links.
2. **Suggest & Vote**: Members propose activities and vote using a card interface with live participation tallies; the organizer promotes winning consensus activities into the planned itinerary.
3. **Split Expenses & Settle**: Members track expenses, specify payers, flag solo vs. group costs, split expenses evenly among participants, and review a computed settlement summary ("who owes who").
4. **Divided Prep Work**: Members collaborate on a shared group packing list while keeping personal preparation tasks strictly private.

### Non-Goals

MVP excludes direct bank transfers, live payment gateway integration (e.g. Stripe payouts), external flight/hotel booking, direct Google Calendar two-way synchronization, and native mobile compilation (the application is delivered as a modern responsive web app). Real-time WebSockets are not required for MVP (optimistic UI with standard REST is the baseline).

### Measurement Plan

| ID | Measure | Definition / evidence | Target and timing |
| --- | --- | --- | --- |
| MET-01 | Core flow completion | Distinct pilot groups completing create → invite → suggest → vote → log expense → split → checklist | Baseline validation during owner pilot |
| MET-02 | Voting participation | Active members with responses divided by total trip members, per activity | High participation on consensus proposals |
| MET-03 | Expense & settlement usage | Trips logging expenses and viewing debt reconciliation | Validate usability of settlement calculations |
| MET-04 | Release correctness | All mandatory integration, unit, and end-to-end acceptance tests passing | 100% pass before public rollout |

## 3. Users and Assumptions

- **Organizer**: Initiates the trip, invites friends, edits trip settings/budget targets, moderates activities, and promotes consensus activities into the schedule.
- **Member**: Proposes activities, votes, logs expenses, participates in splits, marks group packing items, and maintains private packing tasks.
- **Form Factors**: Optimized for mobile web with responsive desktop support (sidebar navigation, responsive multi-column layouts).

## 4. Scope and Feature Inventory

| ID | Capability | Priority / phase | Specification |
| --- | --- | --- | --- |
| FR-001 | Accounts and sessions | Must / MVP | [Authentication](features/authentication.md) |
| FR-002 | Create, list, view, and edit trips | Must / MVP | [Trips](features/trips.md) |
| FR-003 | Invitations, membership, and access | Must / MVP | [Membership](features/membership.md) |
| FR-004 | Budget, Expense Tracking & Settlement | Must / MVP v2.0 | [Budgets & Expenses](features/budgets.md) |
| FR-005 | Activity proposals & Planned status | Must / MVP v2.0 | [Activities](features/activities.md) |
| FR-006 | Card voting & Avatar participation | Must / MVP v2.0 | [Voting](features/voting.md) |
| FR-007 | Shared itinerary | Must / MVP | [Itinerary](features/itinerary.md) |
| FR-008 | Two-Layer Checklists (Group & Personal) | Must / MVP v2.0 | [Checklists](features/checklists.md) |
| FR-009 | LangChain activity planner | Must / expanded MVP | [Activity generator](features/activity-generator.md) |
| FUT-001 | Calendar integration | Deferred | [Calendar](features/calendar.md) |
| FUT-003 | Reminders | Optional extension | [Reminders](features/reminders.md) |

---

## 5. Critical Journeys

### J-01 — Create and join a trip
An organizer signs in, creates a trip with destination, dates, and timezone, and generates a shareable invitation link. Friends open the link, sign in, and are enrolled as active trip members.

### J-02 — Suggest, vote, and schedule activities
Members propose activities with optional estimated costs and locations. The group browses activities via a tactile card feed, voting with ❤️ ("Yes, I'm in") or ✗ ("Not for me"). Live avatar clusters show participation. The organizer moves high-consensus activities from `Suggested` to `Planned`, adding them to the itinerary.

### J-03 — Track expenses, split costs, and settle up
Members log group expenses (e.g. boat tour, shared dinner) and personal solo costs. For group expenses, the payer selects which members split the cost (defaults to all). The budget view shows total group spending, each member's individual share, and a computed debt settlement summary ("Jordan owes Alex $120.00").

### J-04 — Coordinate preparation (Group & Personal)
The group uses the `Group List` to track shared items (e.g. sunscreen, speaker, reservation bookings), where any member can add, toggle, or delete items. Members also maintain their own `My List` for private personal packing items.

---

## 6. Functional Requirements

### FR-001 — Accounts and Sessions
- Sign-in and session management via Auth.js (NextAuth) with Google OAuth.
- Sessions authenticated via secure HTTP-only cookies.

### FR-002 — Trips
- Create, read, update trip details (name, destination, start date, end date, timezone, budget target).
- Trip dates constrain itinerary entries.

### FR-003 — Membership and Invitations
- Shareable invitation tokens with 7-day expiration.
- Organizer can revoke invitations or remove members.
- Removed members lose access immediately; votes are transactionally purged.

### FR-004 — Budget, Expense Tracking & Settlement
- **Budget Target**: Optional total or per-person USD budget target managed by organizer.
- **Expense Logging**: Any member can add an expense with title, amount (integer cents), category (`FOOD`, `TRANSPORT`, `LODGING`, `ACTIVITY`, `OTHER`), payer, solo flag, and split participants.
- **Solo Expenses**: Tracked strictly for the payer (e.g., personal shopping or personal debt outside the group); not split and hidden from other members.
- **Group Splits**: Divided evenly among selected participants (`shareMinor`).
- **Visibility**: Members only see expenses where they are the payer or a split participant (or group-wide expenses).
- **Settlement**: Dynamically computed debt-minimization algorithm calculating who owes whom, recomputed on the fly when expenses change.

### FR-005 — Activity Proposals & Organization
- Members suggest activities with name, description, location, estimated cost, and curated placeholder art.
- Proposals can be edited or deleted by the author/organizer before any votes exist.
- Two-tab organization: `Suggested` (open voting) and `Planned` (scheduled in itinerary).

### FR-006 — Card Voting and Participation
- Tactile cards with ❤️ / ✗ action buttons and live avatar piles.
- Live tally: `{yes} yes · {no} no · {outstanding} waiting`.
- Organizer can promote winning activities directly into the itinerary.

### FR-007 — Shared Itinerary
- Chronological daily schedule in trip timezone.
- Optimistic locking using version increments to prevent concurrent overwrite conflicts.

### FR-008 — Two-Layer Checklists
- **Group List**: Collaborative packing list. Any member can add, toggle (stores `checkedByUserId`), or delete items.
- **My List**: Private personal preparation checklist isolated to each user.

### FR-009 — AI Activity Planner
- LangChain + Claude + Tavily powered contextual recommendations based on destination, dates, and budget.
- Up to 5 source-verified suggestion cards that can be added directly to proposals.

---

## 7. UX, Layout, and Design Direction

- **Visual Style**: Clean, minimal, warm editorial (Hinge-inspired) adhering to [DESIGN.md](DESIGN.md).
- **Color Palette**: Background `#FAF9F6`, Surface `#FFFFFF`, Text `#252525`, Primary Terracotta `#B54E46`, Border `#EAE7E2`.
- **Responsive Architecture**: Web-first responsive design supporting mobile web (bottom nav, sticky top app bar) and desktop web (sidebar navigation, responsive grids).

---

## 8. Open Decisions Resolved

| ID | Decision | Resolution |
| --- | --- | --- |
| Q-01 | Auth Strategy | NextAuth / Auth.js with Google OAuth and PostgreSQL session adapter. |
| Q-02 | Invitation Policy | Organizer-generated 7-day tokens; safe revocation and membership deduplication. |
| Q-03 | Voting UI & Results | Live vote counts visible on card UI; ❤️ / ✗ controls; avatar cluster; manual organizer promotion to itinerary. |
| Q-04 | Expense Tracking & Settlement | In-scope: Splitwise-style tracking, solo vs group split, integer cents, computed minimal debt settlement. |
| Q-05 | Checklist Model | Two-layer: keep private personal checklist + add shared collaborative group packing list. |
| Q-06 | Expense Visibility | Members only see expenses they are part of (payer or split participant) or whole-group expenses. |
