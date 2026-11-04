# Packd — Design System & UI Specification

| | |
|---|---|
| **Status** | Approved Specification |
| **Owner** | Aidan Jiang |
| **Version** | 2.0 (Design Board Alignment) |
| **Companion doc** | [PRD.md](./PRD.md) |

## 1. Design Direction & Core Experience

Packd provides **a better way to plan trips together** — minimal, warm, and social. Inspired by Hinge's clean, editorial style, with a strong focus on collaboration, shared decisions, and distributed trip planning work.

### Core Experience Pillars
1. **Plan Together**: Create a trip and invite your group to build the itinerary collaboratively.
2. **Suggest & Vote**: Add activities and let the group vote on what to do with tactile card controls.
3. **Share Fairly**: Track expenses, split costs equally or custom among members, and settle up with zero friction.
4. **Divided Prep Work**: Coordinate both shared group packing items and personal private essentials.

---

## 2. Visual Identity & Tokens

### 2.1 Color Palette

A warm, editorial palette that feels calm, premium, and human:

| Token | Hex | Role |
|---|---|---|
| `bg-warm` / Background | `#FAF9F6` | App-wide background (soft warm off-white) |
| `surface` | `#FFFFFF` | Cards, modals, elevated surfaces |
| `text-primary` | `#252525` | Headlines, primary text, high contrast |
| `text-muted` | `#6B6B6B` | Secondary body, timestamps, captions |
| `primary` | `#B54E46` | Warm terracotta — primary actions, active indicators, ❤️ vote |
| `primary-tint` | `#FFE7EC` | Subtle tint for active items and highlights |
| `border` | `#EAE7E2` | Hairline dividers, card outlines |
| `success` | `#2BB673` | Completed checklist states, positive balances |
| `error` | `#FF3B30` | Destructive actions, dismiss/no voting (✗) |

### 2.2 Typography

Editorial and modern typographic hierarchy:

- **Headings & Display**: Sora / GT Walsheim (SemiBold / Bold)
- **Body & Labels**: Inter (Regular / Medium)

| Style | Size / Weight | Usage |
|---|---|---|
| Display | 32px / 700 | Large numbers, trip hero title, budget amount |
| H1 | 24px / 700 | Screen headings |
| H2 | 18px / 600 | Section titles ("Suggested (8)", "Itinerary") |
| Body | 16px / 400 | Default readable body text |
| Body Medium | 16px / 500 | Button labels, list row titles |
| Caption | 13px / 400 | Metadata, vote counts, dates, contributor tags |
| Label Caps | 11px / 600 | Uppercase tags, category badges, micro-eyebrows |

### 2.3 Spacing System (8pt Grid)

| Token | Value | Usage |
|---|---|---|
| `space-xs` | 4px | Micro-padding, tag gaps |
| `space-sm` | 8px | Icon spacing, tight element grouping |
| `space-md` | 12px | Compact item gaps |
| `space-base` | 16px | Standard card padding, form row spacing |
| `space-lg` | 24px | Section gaps, card separation |
| `space-xl` | 32px | Major layout block division |

### 2.4 Shape & Elevation

- **Card Radius**: `20px` (smooth rounded corners matching modern mobile apps).
- **Control Radius**: `12px` for form inputs; `9999px` (full pill) for buttons, tabs, and category badges.
- **Shadow**: Single soft elevation `0 4px 16px rgba(0, 0, 0, 0.06)` on active cards and surface panels.
- **Borders**: Crisp 1px `#EAE7E2` borders on all non-elevated surfaces.

---

## 3. Key Components & Screens

### 3.1 Trip Card (Home / Dashboard)
- Photo-first card with destination imagery (or curated placeholder art).
- Trip title (e.g. "Amalfi Trip", "Barcelona Weekend").
- Subtitle with formatted date range and member count (e.g., "Jun 10 – Jun 17 · 6 people").
- Stacked member avatars previewing attendees.

### 3.2 Trip Overview & Progress Card
- Progress card: "Trip Progress — 3 of 4 set up".
- Progress bar visually indicating milestone completion:
  1. ✅ Invite group
  2. ✅ Add trip dates
  3. ✅ Start suggesting activities
  4. ⚪ Build itinerary

### 3.3 Activity Voting Card (Feed & List)
- **Top Image**: Curated high-resolution photo or placeholder art.
- **Details**: Activity name, category/duration (e.g., "Guided tour + tasting · ~2 hrs"), location, cost.
- **Participation**: Avatar cluster with vote count (e.g. 4 avatars + "4 votes").
- **Voting Controls**:
  - Circle ✗ button (dismiss/no vote)
  - Circle ❤️ button (terracotta primary, yes/interested vote)
- **Tabs**:
  - `Suggested (N)`: Active voting proposals.
  - `Planned (N)`: Finalized activities added to the itinerary.
- **Organizer Promotion**: Organizer has an explicit "+ Add to itinerary" control to schedule winning activities.

### 3.4 Budget, Expense & Settlement Screen
- **Hero Headline**:
  - "Group Total: $1,920"
  - "Your Share: $320 ($1,920 ÷ 6 people)"
- **Expense Log**:
  - Line items with category icons (🍽 Dinner in Positano $360 · $60 each, ⛵ Boat Tour $900 · $150 each).
- **Settlement Summary ("Who Owes Who")**:
  - Computed debt minimization cards (e.g., "Jordan owes Alex $120", "Sam owes Alex $60").
- **Add Expense Flow**:
  - Input amount, title, category, payer, solo toggle, and split member checkboxes.

### 3.5 Checklist (Two-Layer Prep)
- Clean subtab switcher:
  - **Group List**: Collaborative shared packing and tasks. Any member can add, toggle, or delete.
  - **My List**: Private personal preparation items isolated to the authenticated traveler.

---

## 4. Responsive Layout & Navigation

- **Web Application Architecture**: Responsive desktop and mobile web (no separate mobile app runtime required).
- **Mobile Viewport (<768px)**:
  - Sticky header with Packd wordmark and user avatar.
  - Sticky bottom navigation bar with icons and labels: `Trips`, `Activity`, `Profile`.
  - Floating action buttons for primary actions.
- **Desktop Viewport (≥768px)**:
  - Left sidebar navigation for trip selection and top-level pages.
  - Main content canvas with centered max-width (1000px–1100px) and multi-column grids.
