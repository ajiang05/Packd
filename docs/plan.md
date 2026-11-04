# Packd — Product and Engineering Plan

## 1. Executive Summary

Packd helps groups turn travel ideas into agreed plans by **splitting the work of trip planning across all members**. Members contribute activity suggestions, vote using tactile cards, organize consensus plans into the itinerary, track and split expenses (Splitwise-style), monitor debt settlement, coordinate shared group packing responsibilities, and maintain private preparation checklists.

## 2. Target Audience and Experience

- Students, Gen Z travelers, friend groups, and organizations planning trips together.
- Eliminates the unfair dynamic where one organizer carries the entire load of planning, budgeting, and chasing people down.
- Mobile-first, responsive web application inspired by the clean, editorial simplicity of Hinge, with accessible forms, keyboard navigation, and clear visual hierarchy.

## 3. Feature Specifications

| Feature                            | Specification                                        | Phase              |
| ---------------------------------- | ---------------------------------------------------- | ------------------ |
| Accounts and sign-in               | [Authentication](features/authentication.md)         | MVP                |
| Trip creation and management       | [Trips](features/trips.md)                           | MVP                |
| Invitations and member permissions | [Membership](features/membership.md)                 | MVP                |
| Trip budget, expenses & settlement | [Budgets & Expenses](features/budgets.md)            | MVP v2.0           |
| Activity proposals & Planned view  | [Activities](features/activities.md)                 | MVP v2.0           |
| Card voting and participation      | [Voting](features/voting.md)                         | MVP v2.0           |
| Shared schedule                    | [Itinerary](features/itinerary.md)                   | MVP                |
| Two-layer checklists (Group & My)  | [Checklists](features/checklists.md)                 | MVP v2.0           |
| AI activity planner                | [Activity generator](features/activity-generator.md) | MVP                |
| Google Calendar integration        | [Calendar](features/calendar.md)                     | After MVP          |
| Voting reminders                   | [Reminders](features/reminders.md)                   | Optional extension |

## 4. Scope and Non-Goals

### MVP v2.0 Committed Scope
- Sign-in via Google OAuth, trip creation and settings, shareable 7-day invitations and member removal.
- Tactile activity voting cards (❤️ / ✗) with live avatar participation clusters, Suggested vs Planned views, and organizer promotion.
- Splitwise-style expense tracking: payer assignment, solo expense flags (personal spend/debts), multi-member even splits, group totals, personal shares, and computed minimal debt settlement ("who owes who").
- Two-layer preparation checklists: collaborative shared group packing list (any member can add, toggle, or delete) and private personal prep checklist.
- Contextual AI activity planner using LangChain, Claude, and Tavily.
- Responsive modern web application adhering to the warm editorial design system (desktop sidebar + mobile navigation).

### Non-Goals for MVP
- Live banking integrations (Plaid) and automated payment gateway payouts (Stripe).
- Booking flights, hotels, or rental cars directly within the app.
- Native mobile binary distribution (iOS/Android App Store packages).
- Two-way direct Google Calendar syncing.

## 5. Technology and Architecture

| Layer | Choice | Purpose |
| --- | --- | --- |
| Frontend | Next.js App Router, React 19, TypeScript, Tailwind CSS | Responsive UI, warm editorial design, mobile and desktop layouts |
| Backend | Next.js route handlers (`/api/[...path]`) with domain service | Centralized business logic, transaction locking, authorization |
| AI Planner | LangChain TypeScript, Claude, Tavily | Sourced, budget-aware activity recommendations |
| Database | PostgreSQL with Prisma ORM | Relational constraints, transactions, atomic row locking |
| Authentication | Auth.js / NextAuth with Google OAuth | Secure cookie-based session management |
| Testing | Vitest, Playwright, PostgreSQL integration tests | Business rules, concurrency, full-flow journeys |
| Delivery | Docker, Docker Compose, GitHub Actions | Reproducible development, automated testing, container builds |
