# Packd — Frontend Design and Implementation Contract

Status: Approved Contract · Owner: Aidan Jiang · Version: 2.0 (Design Board Alignment)

## 1. Direction and Technical Strategy

Packd is designed to solve the burden of trip coordination by distributing the planning work among all group members. The frontend is built as a **responsive, modern web application** (desktop and mobile web) using Next.js App Router and Tailwind CSS, reflecting the editorial visual direction in [DESIGN.md](DESIGN.md).

## 2. Design Tokens and Typography

| Token | CSS Variable / Tailwind | Hex | Role |
| --- | --- | --- | --- |
| Background | `--color-bg-warm` | `#FAF9F6` | Soft off-white page background |
| Surface | `--color-surface` | `#FFFFFF` | Card containers, modals, sheets |
| Primary Accent | `--color-primary` | `#B54E46` | Terracotta primary buttons, active states, ❤️ vote |
| Primary Tint | `--color-primary-tint` | `#FFE7EC` | Soft badge backgrounds, selected highlights |
| Text Primary | `--color-text` | `#252525` | High-contrast readable typography |
| Text Muted | `--color-text-muted` | `#6B6B6B` | Captions, dates, secondary labels |
| Border | `--color-border` | `#EAE7E2` | Hairline dividers and card borders |
| Success | `--color-success` | `#2BB673` | Completed checklists, settled balances |
| Error | `--color-error` | `#FF3B30` | Destructive actions, ✗ dismiss votes |

Typography uses **Sora / GT Walsheim** for headings and **Inter** for UI and body text.
Spacing follows the standard 8pt grid (`4, 8, 12, 16, 24, 32px`).

## 3. Responsive Navigation Architecture

### Desktop Layout (≥ 768px)
- **Persistent Sidebar Navigation**: Left rail with Packd branding, trip switcher, and global navigation.
- **Trip Workspace Header**: Trip title, destination, dates, member avatar pile, and trip progress bar.
- **Section Tabs**: Sub-navigation for `Activities`, `Itinerary`, `Budget`, `Checklist`, `Members`, `Settings`.

### Mobile Layout (< 768px)
- **Top App Bar**: Sticky bar with menu/back toggle, Packd wordmark, and user avatar.
- **Trip Sub-Nav**: Horizontal scrolling chip navigation for trip sections.
- **Bottom Navigation**: Sticky 3-tab bar (`Trips`, `Activity`, `Profile`).

---

## 4. Screen Inventory & Specifications

| ID | Route | Primary Content & Key Interactions |
| --- | --- | --- |
| UI-01 | `/` | Product landing page, value proposition, "Continue with Google" |
| UI-02 | `/trips` | Visual trip grid with photo cards, dates, member avatars, "+ New Trip" |
| UI-03 | `/trips/new` | Create trip form (name, destination, dates, timezone) |
| UI-04 | `/trips/[tripId]/activities` | Suggested vs Planned tabs; tactile ❤️ / ✗ activity voting cards with avatar piles; organizer "+ Add to Itinerary" promotion; AI suggestion panel |
| UI-05 | `/trips/[tripId]/budget` | Group total + your share hero; itemized expense log (solo vs split); computed settlement summary ("Who owes who"); Add Expense modal/form |
| UI-06 | `/trips/[tripId]/checklist` | Two-layer checklist tabs: **Group List** (collaborative shared packing) and **My List** (private personal prep) |
| UI-07 | `/trips/[tripId]/itinerary` | Daily schedule entries grouped chronologically by date/time in trip timezone |
| UI-08 | `/trips/[tripId]/members` | Member roster, shareable invite token generator, organizer member management |
| UI-09 | `/invite#token` | Invitation acceptance screen and automatic redirect |
| UI-10 | `/trips/[tripId]/settings` | Trip configuration (name, destination, dates, timezone, budget target) |

---

## 5. Key Feature Contracts & Behavior

### 5.1 Activity Voting
- **Card UI**: Displays hero placeholder art, title, location, duration, and estimated cost.
- **Interaction**:
  - Tapping ❤️ casts a "yes" vote (`PUT /api/trips/:id/activities/:id/votes/me` with `value: true`).
  - Tapping ✗ casts a "no" vote (`PUT /api/trips/:id/activities/:id/votes/me` with `value: false`).
  - Optimistic UI updates vote counts and avatar cluster immediately.
- **Tabs**:
  - `Suggested (N)` shows unfinalized proposals.
  - `Planned (N)` shows activities scheduled into the itinerary.
  - Organizer has a "Promote to Itinerary" button on high-vote cards.

### 5.2 Expenses & Settlement (Budget Tab)
- **Hero Metrics**: Calculates `Group Total` (sum of non-solo expenses) and `Your Share` (user's allocated split portions + own solo expenses).
- **Add Expense Flow**:
  - Form collects title, amount in dollars, category, payer, solo toggle (`isSolo`), and split member checkboxes.
  - If `isSolo` is true, expense is saved for the payer only; no splits are created.
  - If `isSolo` is false, cost is split evenly across selected members.
- **Settlement**: Fetches `/api/trips/:id/expenses/settlement` to display minimal debt reconciliation ("X owes Y $Z").

### 5.3 Two-Layer Checklists
- **Group List Tab**: Shared items visible to all trip members. Any member can add, toggle, or delete items. Toggling updates `checkedByUserId` to attribute completion.
- **My List Tab**: Private personal preparation checklist. Scoped strictly to the requesting user (`userId`).

### 5.4 Trip Progress Card
- Evaluates trip completeness milestones:
  1. `Invite group` — Trip has > 1 member.
  2. `Add trip dates` — Trip has valid start and end dates.
  3. `Start suggesting activities` — Trip has ≥ 1 suggested activity.
  4. `Build itinerary` — Trip has ≥ 1 itinerary entry.
- Renders progress bar and checklist indicators in the trip dashboard overview.
