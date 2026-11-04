# Packd — Minimum Viable Product (MVP v2.0)

## 0. Document Control

Status: Approved MVP Specification · Version: 2.0 · Owner: Aidan Jiang · Updated: 2026-11-01

Companion documents: [PRD](PRD.md), [architecture](ARCHITECTURE.md), [frontend contract](FRONTEND_DESIGN.md), [visual identity](DESIGN.md).

## 1. Minimum Useful Outcome

A group of travelers can sign in, create/join a trip, suggest activities, vote on tactile cards with live avatar piles, track expenses with solo flags and multi-member splits, review an automated settlement summary ("who owes who"), coordinate shared group packing responsibilities, and maintain private preparation checklists.

The app is delivered as a **modern responsive web application** designed for both mobile and desktop with a warm editorial aesthetic inspired by Hinge.

## 2. Audience and Core Value

Packd targets friend groups, students, and organizations where trip planning burdens typically fall unfairly onto a single organizer. The core value of Packd is **splitting the planning work**:
- Distribute activity discovery and consensus (propose & card-based voting)
- Distribute financial tracking and transparency (Splitwise-style expense logging, solo costs, and calculated debt settlement)
- Distribute packing and logistics (collaborative group packing list alongside private personal checklists)

---

## 3. Scope Cut Line

| Feature | Must deliver for MVP v2.0 | Explicitly deferred | Requirement |
| --- | --- | --- | --- |
| Accounts | NextAuth / Auth.js with Google OAuth and PostgreSQL session adapter | Custom passwords, SMS auth, multiple social providers | FR-001 |
| Trips | Create/list/view/edit trips with destination, dates, timezone, and budget target | Trip archiving, permanent deletion workflows, transfer of ownership | FR-002 |
| Membership | Shareable 7-day invitation tokens, member roster, safe removal, access revocation | Email invite dispatch, self-leave requests | FR-003 |
| Budget & Expenses | Expense logging, payer selection, solo flag, multi-member even splits, running totals, and computed debt settlement ("who owes who") | Bank integrations (Plaid), in-app live payment processing (Stripe payouts), currency conversion | FR-004 |
| Activities | Activity suggestions with placeholder art, description, location, estimated cost, and author permissions | User photo upload infrastructure, external booking links | FR-005 |
| Voting | Tactile card UI (❤️ / ✗), avatar piles for voters, Suggested vs Planned tabs, manual organizer promotion to itinerary | Automatic quorum enforcement, hard voting deadlines, automated winner algorithm | FR-006 |
| Itinerary | Chronological schedule grouped by day in trip timezone, optimistic conflict detection | Two-way Google Calendar sync, real-time drag-and-drop co-editing | FR-007 |
| Checklists | **Two-layer checklists**: Collaborative shared group packing list (any member can add, toggle, or delete) + private personal packing list | Automated item recommendation templates, barcode scanning | FR-008 |
| AI Planner | Contextual activity generation via LangChain + Claude + Tavily with budget constraints and explicit proposal acceptance | Autonomous multi-step booking agents, vector search | FR-009 |

---

## 4. Core Acceptance Walkthrough

1. **Trip Creation & Join**: Organizer signs in via Google, creates a trip, and generates an invitation link. Other members join using the shareable link.
2. **Activity Suggestion & Card Voting**: Members suggest activities. Members browse cards and vote with ❤️ ("in") or ✗ ("not for me"). Live avatar piles show vote counts.
3. **Itinerary Scheduling**: The organizer reviews high-vote suggestions and promotes them to the Planned tab / Itinerary.
4. **Expense Logging & Splitting**: A member logs an expense (e.g. $360 group dinner, paid by Alex, split among all 6 members = $60 each). Another member logs a personal solo expense (e.g. $40 personal souvenir).
5. **Settlement**: The budget screen shows total group spending, personal shares, and computed minimal debt settlements ("Jordan owes Alex $120.00").
6. **Two-Layer Checklist Coordination**: Members collaborate on the shared `Group List` (e.g., booking confirmation, portable speaker) and track their own private items on `My List`.
7. **Access Control & Safety**: Only members involved in an expense can see it (or whole-group expenses); solo expenses are strictly private to the payer. Personal checklists are strictly isolated per user.

---

## 5. Implementation Stack & Technical Architecture

- **Frontend**: Next.js App Router (React 19), Tailwind CSS, Sora / Inter typography, responsive layouts (mobile bottom nav + desktop sidebar).
- **Backend**: Next.js REST API route handlers (`/api/[...path]/route.ts`) routed through server domain boundary (`lib/server/domain.ts`).
- **Database**: PostgreSQL with Prisma ORM and versioned SQL migrations.
- **AI Integration**: LangChain TypeScript, Anthropic Claude, Tavily Search API.
