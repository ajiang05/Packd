# Packd — Product Requirements Document

| | |
|---|---|
| **Status** | Draft |
| **Owner** | Aidan Jiang |
| **Last Updated** | 2026-07-14 |

## 1. Executive Summary

**Product Name:** Packd

**Problem Statement:** Group trips get planned (or fail to get planned) in a group chat, where discussion sprawls, decisions stall, and one person usually ends up doing all the work. There's no shared, structured way for a group to make decisions together.

**Core Value Proposition:** Packd moves trip planning out of the group chat and into a dedicated space where every member contributes — proposing and voting on activities, sharing costs, and tracking shared to-dos — so trips actually get planned and everyone feels bought in.

## 2. Target Audience & Personas

**Primary Audience:** Gen-Z and younger travelers (college students, young professionals) planning group trips with friends.

**Primary Use Case:** A group wants to travel together and needs a lightweight, low-friction way to align on where they're going, what they're doing, and who's paying for what — without one person carrying the entire planning burden.

**Example Persona:**
> Josh is in a fraternity and wants to plan a trip to Puerto Rico for the group. He doesn't want to plan everything himself, and wants every member to contribute more or less equally — proposing activities, voting on plans, and tracking their own pre-trip checklist.

## 3. User Stories & Acceptance Criteria

**User Story 1**
As a Gen-Z trip organizer, I want to create a shared trip and invite my group, so that everyone can contribute instead of me planning alone.
- **AC 1.1:** A user can create a trip with a name, start date, and end date.
- **AC 1.2:** A user can invite other members to the trip and remove members they added.
- **AC 1.3:** Every invited member who joins can view and edit shared trip content (activities, budget, checklist) — planning is not read-only for non-organizers.

**User Story 2**
As a trip member, I want to propose and vote on activities, so that the group decides together instead of one person dictating the itinerary.
- **AC 2.1:** Any trip member can add a proposed activity to the trip's activity list.
- **AC 2.2:** Any trip member can cast one vote per activity.
- **AC 2.3:** The system displays vote counts/results per activity so the group can see the outcome.

**User Story 3**
As a trip member, I want to track a shared or personal budget, so that costs are visible before the trip.
- **AC 3.1:** A user can set a trip budget as either a total group amount or a per-person amount.
- **AC 3.2:** Budget information is visible to all trip members.
- **AC 3.3:** Each member can log their individual contributions/payments toward the budget, and the trip shows total contributed vs. total budget.

**User Story 4**
As a trip member, I want a personal pre-trip checklist, so that I don't forget essentials like my passport.
- **AC 4.1:** Each member has their own checklist scoped to a trip (e.g., "Bring passport").
- **AC 4.2:** A member can check off items independently of other members' checklists.

**User Story 5**
As a trip organizer, I want to build a schedule and export it to Google Calendar, so that trip plans show up where I already track my time.
- **AC 5.1:** A user can create a day-by-day schedule for the trip.
- **AC 5.2:** A user can push that schedule to their connected Google Calendar.

**User Story 6**
As a trip member, I want activity suggestions based on our destination, so that I don't have to research everything myself.
- **AC 6.1:** Given a trip's destination, the system generates a list of suggested activities the group can add to voting.

## 4. Functional Requirements

1. Users must be able to create an account (candidate: Google/Gmail OAuth — see Open Questions).
2. Users must be able to create a trip.
3. Users must be able to add other members to a trip.
4. Users must be able to remove members they added from a trip.
5. Users must be able to set a trip start date and end date.
6. Users must be able to set a budget, either per-person or as a total (configurable per trip), and log individual member contributions against it.
7. Users must be able to view and manage an activities section per trip.
8. Users must be able to cast a binary yes/no vote on proposed activities; votes are required (not optional) for the activity to be considered decided. An activity is approved if it receives a strict majority of "yes" votes among members who voted; ties default to "not approved" pending further discussion.
9. Each user must be able to maintain their own pre-trip checklist (e.g., "Bring passport").
10. Users must be able to build a trip schedule and export/sync it to Google Calendar.
11. The system must generate destination-based activity suggestions.

### Frontend

12. The UI/UX must be sleek and polished, in the visual spirit of Hinge (card-based, modern, gesture-friendly).
13. The application must be mobile-friendly/responsive, since trip planning and on-the-go use are core scenarios.

## 5. Non-Functional Requirements

1. **Performance:** The app must remain responsive under normal group sizes (target: trips with up to ~20 members) with no perceptible lag on core actions (voting, adding activities, checklist updates).
2. **Availability:** The app should be usable "anywhere," implying reasonable mobile network tolerance (works on 4G, degrades gracefully on poor connections).
3. **Security:**
   - User authentication must use Google OAuth (implemented via Auth.js/NextAuth, since the backend is Next.js API routes) rather than custom-rolled auth.
   - Trip data must only be accessible to invited members of that trip (authorization checks on every trip-scoped endpoint).
   - Secrets (DB credentials, API keys) must not be committed to source control and must be managed via environment configuration.
4. **Data Integrity:** Votes, budget entries, and checklist items must be attributed to the correct user and trip; no silent data loss on concurrent edits from multiple members.

## 6. Scope & Non-Goals

**In-Scope (MVP):**
- Account creation/login
- Trip creation, member invite/remove
- Trip dates
- Budget (total or per-person, entry only — no payment processing)
- Activity proposals + voting
- Per-user pre-trip checklist
- Schedule builder + Google Calendar export
- Destination-based activity suggestions
- Responsive/mobile-friendly UI

**Out of Scope (proposed — confirm before build):**
- In-app payments or expense settlement (e.g., Venmo-style "who owes who")
- Native iOS/Android apps (web-first, mobile-responsive only)
- Real-time chat/messaging within the app
- Multi-language/localization support
- Automated booking (flights/hotels/activities) — suggestions only, no purchasing

## 7. Technical Architecture

**Tech Stack:**
- **Frontend:** React via Next.js, scaffolded/prototyped with v0. Mobile-responsive by default.
- **UI/UX Design:** Google Stitch, used via the Stitch MCP server to generate and iterate on UI screens directly within the coding workflow before/alongside implementation (see "Working with MCP" below).
- **Backend:** Next.js API routes (same codebase as the frontend), containerized with **Docker** for consistent local development and deployment.
- **Database:** AWS-hosted PostgreSQL (e.g., RDS or Aurora Serverless v2), consistent with prior Postgres experience.
- **ORM:** Prisma.
- **Authentication:** Google OAuth, implemented directly via Auth.js (NextAuth) with the Google provider — no Cognito.
- **Infrastructure:** AWS for hosting/database. **Recommended container host: AWS App Runner** — it deploys straight from a Docker image (or ECR) and handles scaling/load balancing for you, with far less setup than ECS/Fargate (manual cluster/service config) or EC2 (manual server management). Good fit given no prior AWS container experience and a hackathon timeline; ECS/Fargate is a reasonable upgrade path later if more control is needed.
- **Calendar Integration:** Google Calendar API.

**Suggested Architecture:**
- Local development runs via `docker-compose` (Next.js app container + Postgres container) so environment matches production.
- Google Stitch (MCP) is used at design time to produce UI mockups/screens for each core flow (trip creation, activity voting, checklist, schedule), which then inform the React component build.
- Activity suggestions are generated by combining an LLM (for creative/contextual suggestions) with a travel data API such as Google Places (for real, bookable-adjacent venues/activities), keyed off the trip's destination field.

**Working with MCP (Model Context Protocol):**
MCP is a standard that lets an AI coding assistant (like Claude Code) call out to external tools/services as part of a conversation, instead of you manually switching apps. An "MCP server" exposes a specific tool's capabilities — Google Stitch's MCP server exposes UI-generation actions (e.g., "generate a screen for X flow," "iterate on this design"). Once it's connected, you can ask the assistant to generate or revise a Stitch UI design mid-session, and it calls Stitch directly rather than you copy-pasting between tools. Setup is a one-time step: install/connect the Stitch MCP server (via its provided config, typically an API key + server URL added to your coding assistant's MCP settings), then it shows up as an available tool for the rest of your sessions. Exact install steps depend on Stitch's current setup docs at the time you connect it.

## 8. Decisions Log

| # | Question | Decision |
|---|---|---|
| 1 | Backend framework | Next.js API routes |
| 2 | ORM | Prisma |
| 3 | Container hosting | AWS App Runner (recommended default — see §7) |
| 4 | Auth provider | Google OAuth via Auth.js (NextAuth), no Cognito |
| 5 | Budget model | Total or per-person, with individual contributions tracked |
| 6 | Voting mechanics | Binary yes/no; strict majority of "yes" approves, ties default to "not approved" |
| 7 | Activity suggestion source | Both an LLM and a travel data API (e.g., Google Places) |
| 8 | Stitch MCP workflow | Explained in §7 — one-time connect, then usable as a tool mid-session |

## 9. Open Questions

- **Tie-break for voting:** Defaulted to "not approved" on a tie in §4/§8 — confirm this is the desired behavior, or specify an alternative (e.g., organizer casts tiebreaker).
- **App Runner confirmation:** Proceeding with AWS App Runner as the container host per the recommendation in §7 unless you'd prefer otherwise.
