# Group Voting and Participation

Status: Approved specification · Phase: MVP upgrade · Owner: Aidan Jiang

## User Story

As a traveler, I want to vote on suggested activities using a swipe-style tactile card interface with live participation indicators so our group can easily reach consensus without endless chat debate.

## Scope and Proposed Behavior

### 1. Card-Based Voting Interface
- Each activity is displayed as a focused card matching the design board:
  - Curated placeholder imagery based on activity category/context.
  - Activity title, description, location, and estimated cost per person.
  - **Voting Controls**:
    - ❤️ button ("Yes, I'm in")
    - ✗ button ("Not for me")
  - Instant optimistic feedback upon voting.
- **Participation Display**:
  - Live vote count with an avatar cluster of members who participated (e.g., stacked avatars + "4 votes").
  - Breakdown counts: `{yes} yes · {no} no · {outstanding} waiting to vote`.
  - Missing votes never default to "no".

### 2. Suggested vs. Planned Views
- Activities screen is organized into two primary tabs:
  1. **Suggested (N)**: Proposed activities currently open for group voting.
  2. **Planned (N)**: Activities that have been accepted and scheduled into the trip itinerary.
- **Promotion to Planned**:
  - The trip organizer maintains manual control to promote an activity from Suggested to Planned.
  - Promoting an activity creates a schedule entry in the Itinerary and updates activity status to `APPROVED`.

## Acceptance Criteria

1. Submitting a vote records a single unique response (`value: true` or `value: false`) per member/activity.
2. Changing a vote updates the response without incrementing voter count.
3. Live vote counts (yes, no, outstanding) update in real-time on the activity card.
4. Non-members cannot submit votes.
5. Only the trip organizer can promote an activity to "Planned" (adding it to the itinerary).
6. Removed members have their votes deleted transactionally; totals update accordingly.

## Engineering & Schema Notes

```prisma
model Vote {
  id         String   @id @default(cuid())
  activityId String
  userId     String
  value      Boolean
  createdAt  DateTime @default(now())

  activity   Activity @relation(fields: [activityId], references: [id], onDelete: Cascade)
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([activityId, userId])
}
```

## API Endpoints

- `GET /api/trips/:id/activities` — Returns activities with calculated `yes`, `no`, `outstanding` counts and `myVote`.
- `PUT /api/trips/:id/activities/:activityId/votes/me` — Upserts current user's vote (`{ value: boolean }`).
- `DELETE /api/trips/:id/activities/:activityId/votes/me` — Removes current user's vote.
