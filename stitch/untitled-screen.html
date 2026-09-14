# Packd — Design System & UI Guidelines

| | |
|---|---|
| **Status** | Draft |
| **Owner** | Aidan Jiang |
| **Last Updated** | 2026-07-14 |
| **Companion doc** | [PRD.md](./PRD.md) |

## 1. Design Principles

Packd should feel like Hinge's minimalism applied to trip planning: **one clear thing per screen, generous whitespace, a single confident accent color, and nothing decorative that doesn't earn its place.**

1. **One primary action per screen.** Never make the user choose between more than one obvious next step.
2. **Content over chrome.** Trip photos, activity names, and dates are the UI — borders, dividers, and containers stay quiet.
3. **Restraint in color.** Neutral base (white/off-white + ink text) with a single accent color used sparingly for actions, selection state, and emphasis — never as decoration.
4. **Card-based, swipeable, tactile.** Activities, trips, and proposals live in cards, echoing Hinge's feed/prompt format — familiar to the target audience.
5. **Mobile-first.** Every layout is designed at a 375–430px width first, then scaled up.

## 2. Visual Identity

### 2.1 Color Palette

A single bold accent on a warm neutral base — kept intentionally simple so it's easy to build correctly under a hackathon timeline.

| Token | Hex | Usage |
|---|---|---|
| `accent` | `#FF5470` | Primary buttons, active/selected states, links, vote "yes" |
| `accent-dark` | `#E13D59` | Pressed/hover state for accent elements |
| `accent-tint` | `#FFE7EC` | Selected-card backgrounds, subtle highlight fills |
| `ink` | `#1A1A1A` | Primary text, headlines |
| `ink-secondary` | `#6B6B6B` | Secondary/supporting text, timestamps, metadata |
| `bg` | `#FDFBFA` | App background (warm off-white, not stark white) |
| `surface` | `#FFFFFF` | Cards, sheets, modals |
| `border` | `#EFECEA` | Hairline dividers, card outlines |
| `success` | `#2BB673` | Confirmations, "approved" activity state |
| `error` | `#FF3B30` | Errors, destructive actions, vote "no" (use sparingly, not full-red blocks) |

**Rule of thumb:** if a screen needs more than one accent color to explain itself, simplify the screen instead of adding a color.

### 2.2 Typography

System sans-serif stack for speed and native feel — no custom font loading required.

```
font-family: -apple-system, "SF Pro Text", "Inter", system-ui, sans-serif;
```

| Style | Size / Weight | Usage |
|---|---|---|
| Display | 32px / 700 | Trip name on trip detail screen, big moments |
| H1 | 24px / 700 | Screen titles |
| H2 | 18px / 600 | Section headers ("Activities", "Checklist") |
| Body | 16px / 400 | Default text |
| Body Medium | 16px / 500 | Emphasized body text, button labels |
| Caption | 13px / 400 | Metadata — dates, vote counts, member names |

Line height: 1.4 for body, 1.2 for headings. Avoid all-caps except for small caption-level labels (e.g. "3 VOTES").

### 2.3 Spacing & Layout

8px base unit. Consistency here is what makes minimal UI read as "sleek" rather than "empty."

| Token | Value |
|---|---|
| `space-xs` | 4px |
| `space-sm` | 8px |
| `space-md` | 16px |
| `space-lg` | 24px |
| `space-xl` | 32px |
| `space-2xl` | 48px |

- Screen edge padding: 20px (mobile).
- Minimum spacing between unrelated sections: `space-xl`.
- Card internal padding: `space-md`.

### 2.4 Shape & Elevation

- **Corner radius:** 20px on cards and primary buttons, 12px on inputs/chips, full pill (999px) on tags/badges. Large radii are core to the Hinge-like feel — avoid sharp corners anywhere.
- **Shadows:** one soft shadow only, used sparingly (cards resting on the background, not on other cards): `0 4px 16px rgba(0,0,0,0.06)`. No heavy drop shadows, no multiple shadow layers.
- **Borders:** prefer a 1px `border` hairline over a shadow when separating flat content (e.g. list rows).

### 2.5 Iconography

- Line icons, 1.5–2px stroke, rounded caps (e.g. Lucide/Feather style) — never filled/solid icon sets, which read heavier and less "sleek."
- Icons are functional, not decorative — every icon should be next to a label or have an accessible label; avoid icon-only nav items without a tooltip/label on first use.

## 3. Core Components

- **Primary Button:** solid `accent` fill, white text, 20px radius, full-width on mobile forms, 48px height minimum (touch target).
- **Secondary Button:** `surface` fill with 1px `border`, `ink` text.
- **Card:** `surface` background, 20px radius, soft shadow, `space-md` padding. Used for trip tiles, activity proposals, checklist groups.
- **Vote Control:** two large tappable zones (thumbs/yes-no) rather than small buttons — mirrors Hinge's large-target-area feel and keeps voting frictionless.
- **Bottom Navigation:** 3–4 items max (e.g. Trips, Activities, Checklist, Profile), icon + label, `accent` for active state only.
- **Empty States:** every list (activities, checklist, members) needs a calm, single-sentence empty state with one clear CTA — never a blank screen.

## 4. Motion & Interaction

- Keep motion subtle and physical: 150–250ms ease-out transitions for taps, a light spring for card swipe/dismiss (activity voting).
- Voting on an activity should feel immediate — optimistic UI update on tap, no spinner for the vote itself.
- Avoid modal overload: prefer bottom sheets (mobile-native feel) over centered dialogs.

## 5. Priority Screens

### 5.1 Onboarding & Account Creation
- Single-column, centered flow. One primary action visible at a time (e.g., "Continue with Google" as the sole CTA — no competing sign-up form).
- Minimal copy: a short value-prop line, not marketing paragraphs.
- After auth, go straight into "create or join a trip" — no unnecessary profile-setup steps before first value.

### 5.2 Trip Dashboard / Home
- List of trip cards (photo/placeholder, trip name, dates, member avatars stacked). One card = one trip.
- Primary action: a single floating/prominent "New Trip" button — not buried in a menu.
- Sort by upcoming trip first; keep past trips visually de-emphasized (lower contrast, no accent color).

### 5.3 Activity Voting (Feed)
- The core Hinge-like screen: one activity card at a time, large image/title, short description, two big yes/no zones.
- Show live vote tally as a subtle caption under the card, not a competing visual element.
- After voting, auto-advance to the next unvoted activity — keep momentum, minimize taps.
- Approved activities move to a separate "Itinerary" view (checkmark/success color), not shown mixed in with pending votes.

### 5.4 Budget & Checklist
- Budget: one number up top (total or per-person, per trip setting), a simple progress bar of contributed vs. target, list of member contributions below.
- Checklist: personal (per-user) list, simple tap-to-check rows, grouped under trip name. No shared/blocking checklist items — keep it low-pressure and individual, per the PRD.

## 6. Using This With Google Stitch (MCP)

When generating screens via the Stitch MCP server, anchor every prompt to this doc so outputs stay consistent. Example prompt pattern:

> "Design the [screen name] for Packd, a minimal Hinge-style group trip planner. Style: warm off-white background (#FDFBFA), single coral accent (#FF5470), system sans-serif, 20px rounded cards, soft shadows only, mobile-first at 375px width. [Screen-specific content from §5.x]."

Regenerate/iterate per screen rather than asking for the whole app at once — smaller, focused prompts stay truer to the "one clear thing per screen" principle.

## 7. Open Questions

- **Logo/wordmark:** Do you have a Packd logo or wordmark treatment yet, or should the design lean on typography only ("Packd" in H1 style) for now?
- **Photography:** Will trip cards use real destination photos (user-uploaded or fetched from an API), or placeholder illustrations/gradients until that's built?
- **Empty/first-run state:** For a brand-new user with zero trips, is there a specific first-run illustration/tone you want, or is a plain "create your first trip" CTA sufficient for MVP?
